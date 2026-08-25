// 外贸盒子后端（Cloudflare Worker + KV）
// 职责：客户账号(注册/登录/会员校验) + 站长独立管理后台(服务端鉴权/会员发放)
// 零依赖、零成本（Workers free + KV free）。密钥全部走环境变量，不进前端。

const DAY_MS = 86_400_000
const TRIAL_DAYS = 3

// ---------- 配置（启动时校验，缺失即失败） ----------
function cfg(env) {
  const apiBase = (env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean)
  return {
    kv: env.KTB_DATA,
    jwtSecret: env.JWT_SECRET,
    adminUsers: (env.ADMIN_USER || 'admin').split(',').map((s) => s.trim()),
    // 站长密码：支持多个，逗号分隔；建议用 wrangler secret put 注入
    adminPasses: (env.ADMIN_PASS || '').split(',').map((s) => s.trim()).filter(Boolean),
    origins: apiBase,
    trialDays: TRIAL_DAYS,
  }
}

// ---------- 工具 ----------
function b64urlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return atob(str)
}
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  })
}
function makeCors(origin, c) {
  const allow = c.origins.includes(origin) ? origin : c.origins[0] || ''
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}
function httpError(status, code, message) {
  const e = new Error(message)
  e.status = status
  e.code = code
  return e
}
async function readJson(req) {
  try {
    return await req.json()
  } catch {
    throw httpError(400, 'bad_json', '请求体不是合法 JSON')
  }
}
function validate(body, fields) {
  for (const f of fields) {
    const v = body?.[f]
    if (typeof v !== 'string' || v.trim() === '') {
      throw httpError(422, 'validation', `字段 ${f} 不能为空`)
    }
  }
}

// ---------- 密码哈希 (Web Crypto PBKDF2，无依赖) ----------
async function hashPassword(password, salt) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100_000, hash: 'SHA-256' },
    key,
    256,
  )
  return b64urlEncode(String.fromCharCode(...new Uint8Array(bits)))
}
function newSalt() {
  const a = new Uint8Array(12)
  crypto.getRandomValues(a)
  return b64urlEncode(String.fromCharCode(...a))
}
async function verifyPassword(password, salt, expectedHash) {
  const h = await hashPassword(password, salt)
  return h === expectedHash
}

// ---------- Token (HMAC-SHA256, 无状态) ----------
async function signToken(payload, secret) {
  const data = b64urlEncode(JSON.stringify(payload))
  const sig = await hmac(data, secret)
  return `${data}.${sig}`
}
async function hmac(data, secret) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return b64urlEncode(String.fromCharCode(...new Uint8Array(sig)))
}
async function verifyToken(token, secret) {
  if (!token || !token.includes('.')) throw httpError(401, 'invalid_token', '登录已失效，请重新登录')
  const [data, sig] = token.split('.')
  const expected = await hmac(data, secret)
  if (sig !== expected) throw httpError(401, 'invalid_token', '登录已失效，请重新登录')
  let payload
  try {
    payload = JSON.parse(b64urlDecode(data))
  } catch {
    throw httpError(401, 'invalid_token', '登录已失效，请重新登录')
  }
  if (!payload.exp || payload.exp < Date.now()) throw httpError(401, 'expired', '登录已过期，请重新登录')
  return payload
}
function bearer(req) {
  const h = req.headers.get('Authorization') || ''
  return h.startsWith('Bearer ') ? h.slice(7) : ''
}

// ---------- KV 用户 ----------
async function getUser(kv, username) {
  const raw = await kv.get('user:' + username.toLowerCase())
  return raw ? JSON.parse(raw) : null
}
async function putUser(kv, user) {
  await kv.put('user:' + user.username.toLowerCase(), JSON.stringify(user))
}
function computeEntitlement(user, now = Date.now()) {
  if (!user) return { phase: 'anonymous', hasAccess: false, plan: null, expiresAt: null, trialEndsAt: null }
  const until = user.memberUntil
  if (until == null) {
    return { phase: 'active_lifetime', hasAccess: true, plan: 'lifetime', expiresAt: null, trialEndsAt: null }
  }
  if (until > now) {
    const phase = user.plan === 'trial' ? 'trialing' : user.plan === 'monthly' ? 'active_monthly' : user.plan === 'yearly' ? 'active_yearly' : 'active_lifetime'
    return { phase, hasAccess: true, plan: user.plan, expiresAt: new Date(until).toISOString(), trialEndsAt: user.plan === 'trial' ? new Date(until).toISOString() : null }
  }
  return { phase: 'expired', hasAccess: false, plan: null, expiresAt: null, trialEndsAt: null }
}
function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    contact: user.contact,
    role: user.role,
    status: user.status,
    passwordResetRequired: user.passwordResetRequired,
    createdAt: user.createdAt,
  }
}
function snapshotOf(user) {
  return { user: publicUser(user), entitlement: computeEntitlement(user) }
}

// ---------- 处理器 ----------
async function register(body, c) {
  validate(body, ['username', 'password'])
  const username = body.username.trim()
  const password = body.password
  if (username.length < 4 || username.length > 32) throw httpError(422, 'validation', '用户名需 4-32 个字符')
  if (password.length < 8) throw httpError(422, 'validation', '密码至少 8 位')
  if (await getUser(c.kv, username)) throw httpError(409, 'exists', '该用户名已被注册')
  const salt = newSalt()
  const user = {
    id: 'u_' + b64urlEncode(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(8)))),
    username,
    displayName: (body.displayName || username).trim().slice(0, 64),
    contact: (body.contact || '').trim().slice(0, 64),
    role: 'user',
    status: 'active',
    passwordResetRequired: false,
    createdAt: new Date().toISOString(),
    passwordSalt: salt,
    passwordHash: await hashPassword(password, salt),
    plan: 'trial',
    memberUntil: Date.now() + c.trialDays * DAY_MS,
    orders: [],
  }
  await putUser(c.kv, user)
  const token = await signToken({ sub: username, role: 'user', exp: Date.now() + 7 * DAY_MS }, c.jwtSecret)
  return { token, snapshot: snapshotOf(user) }
}

async function login(body, c) {
  validate(body, ['username', 'password'])
  const user = await getUser(c.kv, body.username.trim())
  if (!user) throw httpError(401, 'not_found', '账号不存在，请先注册')
  if (user.status === 'suspended') throw httpError(403, 'suspended', '账号已停用，请联系客服')
  if (!(await verifyPassword(body.password, user.passwordSalt, user.passwordHash))) {
    throw httpError(401, 'bad_password', '用户名或密码错误')
  }
  const token = await signToken({ sub: user.username, role: 'user', exp: Date.now() + 7 * DAY_MS }, c.jwtSecret)
  return { token, snapshot: snapshotOf(user) }
}

async function me(req, c) {
  const payload = await verifyToken(bearer(req), c.jwtSecret)
  const user = await getUser(c.kv, payload.sub)
  if (!user) throw httpError(401, 'not_found', '账号不存在')
  return snapshotOf(user)
}

async function logout() {
  return { ok: true }
}

async function changePassword(body, req, c) {
  validate(body, ['currentPassword', 'newPassword'])
  if (body.newPassword.length < 8) throw httpError(422, 'validation', '新密码至少 8 位')
  const payload = await verifyToken(bearer(req), c.jwtSecret)
  const user = await getUser(c.kv, payload.sub)
  if (!user) throw httpError(401, 'not_found', '账号不存在')
  if (!(await verifyPassword(body.currentPassword, user.passwordSalt, user.passwordHash))) {
    throw httpError(422, 'bad_password', '当前密码错误')
  }
  const salt = newSalt()
  user.passwordSalt = salt
  user.passwordHash = await hashPassword(body.newPassword, salt)
  await putUser(c.kv, user)
  const token = await signToken({ sub: user.username, role: 'user', exp: Date.now() + 7 * DAY_MS }, c.jwtSecret)
  return { token, snapshot: snapshotOf(user) }
}

// 订单（后端存储，便于站长后台核对付款）
async function createOrder(body, req, c) {
  validate(body, ['plan'])
  const payload = await verifyToken(bearer(req), c.jwtSecret)
  const user = await getUser(c.kv, payload.sub)
  if (!user) throw httpError(401, 'not_found', '账号不存在')
  const plans = { monthly: { amount: 29, days: 30 }, yearly: { amount: 199, days: 365 }, lifetime: { amount: 599, days: null } }
  const plan = plans[body.plan]
  if (!plan) throw httpError(422, 'validation', '方案不存在')
  const order = {
    orderId: 'KTB-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + b64urlEncode(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(6)))).slice(0, 8).toUpperCase(),
    userId: user.id,
    username: user.username,
    plan: body.plan,
    amountCny: plan.amount,
    paymentMethod: null,
    payerHint: null,
    paidAtClaimed: null,
    status: 'awaiting_payment',
    createdAt: new Date().toISOString(),
    claimedAt: null,
    reviewedAt: null,
  }
  user.orders = [...(user.orders || []), order]
  await putUser(c.kv, user)
  return order
}
async function claimOrder(id, body, req, c) {
  validate(body, ['paymentMethod', 'payerHint', 'paidAtClaimed'])
  const payload = await verifyToken(bearer(req), c.jwtSecret)
  const user = await getUser(c.kv, payload.sub)
  if (!user) throw httpError(401, 'not_found', '账号不存在')
  const order = (user.orders || []).find((o) => o.orderId === id)
  if (!order) throw httpError(404, 'not_found', '订单不存在')
  order.status = 'pending_review'
  order.paymentMethod = body.paymentMethod
  order.payerHint = body.payerHint
  order.paidAtClaimed = body.paidAtClaimed
  order.claimedAt = new Date().toISOString()
  await putUser(c.kv, user)
  return order
}
async function listOrders(req, c) {
  const payload = await verifyToken(bearer(req), c.jwtSecret)
  const user = await getUser(c.kv, payload.sub)
  if (!user) throw httpError(401, 'not_found', '账号不存在')
  return user.orders || []
}

// ---------- 站长后台（服务端鉴权，密码不进前端） ----------
async function adminLogin(body, c) {
  validate(body, ['username', 'password'])
  const idx = c.adminUsers.indexOf(body.username.trim())
  if (idx === -1 || c.adminPasses[idx] !== body.password) {
    throw httpError(401, 'bad_admin', '站长账号或密码错误')
  }
  const token = await signToken({ sub: body.username.trim(), role: 'admin', exp: Date.now() + DAY_MS }, c.jwtSecret)
  return { token, admin: { username: body.username.trim() } }
}
async function authAdmin(req, c) {
  const payload = await verifyToken(bearer(req), c.jwtSecret)
  if (payload.role !== 'admin') throw httpError(403, 'forbidden', '需要站长权限')
  return payload
}
async function listMembers(c) {
  const { keys } = await c.kv.list({ prefix: 'user:' })
  const users = []
  for (const k of keys) {
    const raw = await c.kv.get(k.name)
    if (!raw) continue
    const u = JSON.parse(raw)
    const ent = computeEntitlement(u)
    users.push({
      username: u.username,
      plan: u.plan,
      status: u.status,
      createdAt: u.createdAt,
      memberUntil: u.memberUntil,
      hasAccess: ent.hasAccess,
      phase: ent.phase,
      orders: (u.orders || []).length,
    })
  }
  users.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  return { members: users, count: users.length }
}
async function grantMember(body, c) {
  validate(body, ['username', 'plan'])
  const days = Number(body.days)
  if (![ 'trial', 'monthly', 'yearly', 'lifetime' ].includes(body.plan)) throw httpError(422, 'validation', '方案不合法')
  const user = await getUser(c.kv, body.username.trim())
  if (!user) throw httpError(404, 'not_found', '客户账号不存在')
  user.plan = body.plan
  user.memberUntil = body.plan === 'lifetime' ? null : Date.now() + (Number.isFinite(days) && days > 0 ? days : 30) * DAY_MS
  await putUser(c.kv, user)
  return snapshotOf(user)
}
async function revokeMember(body, c) {
  validate(body, ['username'])
  const user = await getUser(c.kv, body.username.trim())
  if (!user) throw httpError(404, 'not_found', '客户账号不存在')
  user.plan = null
  user.memberUntil = Date.now() - DAY_MS
  await putUser(c.kv, user)
  return { ok: true }
}

// ---------- 路由 ----------
export default {
  async fetch(request, env) {
    const c = cfg(env)
    if (!c.kv || !c.jwtSecret) {
      return json({ error: 'config', message: '服务端未正确配置（缺少 KTB_DATA 或 JWT_SECRET）' }, 500)
    }
    const url = new URL(request.url)
    const path = url.pathname
    const origin = request.headers.get('Origin') || ''
    const cors = makeCors(origin, c)

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    try {
      if (path === '/health' && request.method === 'GET') return json({ status: 'ok' }, 200, cors)
      if (path === '/api/plans' && request.method === 'GET') {
        return json({ plans: [ { id: 'monthly', name: '月度会员', amountCny: 29, durationDays: 30 }, { id: 'yearly', name: '年度会员', amountCny: 199, durationDays: 365 }, { id: 'lifetime', name: '永久买断', amountCny: 599, durationDays: null } ] }, 200, cors)
      }

      // 客户认证
      if (path === '/api/auth/register' && request.method === 'POST') return json(await register(await readJson(request), c), 200, cors)
      if (path === '/api/auth/login' && request.method === 'POST') return json(await login(await readJson(request), c), 200, cors)
      if (path === '/api/auth/logout' && request.method === 'POST') return json(await logout(), 200, cors)
      if (path === '/api/auth/change-password' && request.method === 'POST') return json(await changePassword(await readJson(request), request, c), 200, cors)
      if (path === '/api/me' && request.method === 'GET') return json(await me(request, c), 200, cors)
      if (path === '/api/orders' && request.method === 'GET') return json(await listOrders(request, c), 200, cors)
      if (path === '/api/orders' && request.method === 'POST') return json(await createOrder(await readJson(request), request, c), 200, cors)
      const claim = path.match(/^\/api\/orders\/([^/]+)\/claim$/)
      if (claim && request.method === 'POST') return json(await claimOrder(claim[1], await readJson(request), request, c), 200, cors)

      // 站长后台
      if (path === '/api/admin/login' && request.method === 'POST') return json(await adminLogin(await readJson(request), c), 200, cors)
      if (path.startsWith('/api/admin/')) {
        await authAdmin(request, c)
        if (path === '/api/admin/members' && request.method === 'GET') return json(await listMembers(c), 200, cors)
        if (path === '/api/admin/grant' && request.method === 'POST') return json(await grantMember(await readJson(request), c), 200, cors)
        if (path === '/api/admin/revoke' && request.method === 'POST') return json(await revokeMember(await readJson(request), c), 200, cors)
        return json({ error: 'not_found', message: '接口不存在' }, 404, cors)
      }

      return json({ error: 'not_found', message: '接口不存在' }, 404, cors)
    } catch (e) {
      const status = e.status || 500
      if (status >= 500) console.error('backend error', e)
      return json({ error: e.code || 'error', message: e.message || '服务器错误' }, status, cors)
    }
  },
}
