// 后端逻辑 E2E（Node 直驱 worker/backend.js，mock KV，无需线上 Worker）。
// 覆盖：预检/CORS、注册、试用、重复注册、登录、me 校验、站长登录/列表/发放/吊销、改密。
import { default as backend } from '../worker/backend.js'

// ---- Node 全局兜底（Node 18+ 一般已具备） ----
if (typeof globalThis.crypto === 'undefined') {
  throw new Error('需要 Web Crypto 全局，请使用 Node 18+')
}

function makeKV() {
  const map = new Map()
  return {
    get: async (k) => (map.has(k) ? map.get(k) : null),
    put: async (k, v) => map.set(k, String(v)),
    list: async ({ prefix }) => ({ keys: [...map.keys()].filter((k) => k.startsWith(prefix)).map((k) => ({ name: k })) }),
  }
}

const env = {
  KTB_DATA: makeKV(),
  JWT_SECRET: 'test-jwt-secret-xyz',
  ADMIN_USER: 'admin',
  ADMIN_PASS: 'admin-secret-123',
  CORS_ORIGIN: 'https://kyriehao-beep.github.io',
  TRIAL_DAYS: '3',
}

const BASE = 'https://test.local'

async function call(method, path, { body, token, origin, admin } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = 'Bearer ' + token
  if (admin) headers['Authorization'] = 'Bearer ' + admin
  if (origin) headers['Origin'] = origin
  const req = new Request(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return backend.fetch(req, env)
}

let pass = 0
let fail = 0
const fails = []
function check(name, cond, extra = '') {
  if (cond) {
    pass++
    console.log('  ✓ ' + name)
  } else {
    fail++
    fails.push(name + (extra ? ' :: ' + extra : ''))
    console.log('  ✗ ' + name + (extra ? ' :: ' + extra : ''))
  }
}

async function run() {
  console.log('\n[1] 预检 / CORS')
  {
    const res = await call('OPTIONS', '/api/me', { origin: 'https://kyriehao-beep.github.io' })
    check('OPTIONS 返回 204', res.status === 204, 'status=' + res.status)
    check('CORS 头回显来源', res.headers.get('Access-Control-Allow-Origin') === 'https://kyriehao-beep.github.io')
  }

  console.log('\n[2] 健康检查 / 方案')
  {
    const res = await call('GET', '/health')
    const data = await res.json()
    check('GET /health 200', res.status === 200 && data.status === 'ok')
    const plans = await call('GET', '/api/plans', { origin: 'https://kyriehao-beep.github.io' })
    const pd = await plans.json()
    check('GET /api/plans 返回 3 个方案', Array.isArray(pd.plans) && pd.plans.length === 3)
    check('plans 含 lifetime', pd.plans.some((p) => p.id === 'lifetime'))
  }

  console.log('\n[3] 注册 + 试用')
  let aliceToken = ''
  {
    const res = await call('POST', '/api/auth/register', { body: { username: 'alice', password: 'password123', contact: 'wx_alice' } })
    check('注册返回 200', res.status === 200)
    const data = await res.json()
    aliceToken = data.token
    check('注册返回 token', typeof aliceToken === 'string' && aliceToken.length > 0)
    check('新注册为 trialing 且有访问权', data.snapshot.entitlement.phase === 'trialing' && data.snapshot.entitlement.hasAccess === true)
    check('快照含用户名', data.snapshot.user.username === 'alice')
  }

  console.log('\n[4] 重复注册 / 登录校验')
  {
    const dup = await call('POST', '/api/auth/register', { body: { username: 'alice', password: 'password123', contact: 'x' } })
    check('重复注册 409', dup.status === 409)
    const bad = await call('POST', '/api/auth/login', { body: { username: 'alice', password: 'wrongpw' } })
    check('错误密码登录 401', bad.status === 401)
    const ok = await call('POST', '/api/auth/login', { body: { username: 'alice', password: 'password123' } })
    check('正确密码登录 200', ok.status === 200)
    const okData = await ok.json()
    check('登录返回 token', okData.token && okData.token.length > 0)
  }

  console.log('\n[5] me 校验（token 鉴权）')
  {
    const noTok = await call('GET', '/api/me')
    check('无 token 访问 /me 401', noTok.status === 401)
    const me = await call('GET', '/api/me', { token: aliceToken })
    const md = await me.json()
    check('带 token 访问 /me 200 且为 alice', me.status === 200 && md.user.username === 'alice' && md.entitlement.phase === 'trialing')
  }

  console.log('\n[6] 站长后台：登录 / 列表')
  let adminToken = ''
  {
    const bad = await call('POST', '/api/admin/login', { body: { username: 'admin', password: 'nope' } })
    check('错误站长密码 401', bad.status === 401)
    const ok = await call('POST', '/api/admin/login', { body: { username: 'admin', password: 'admin-secret-123' } })
    check('正确站长密码登录 200', ok.status === 200)
    const okd = await ok.json()
    adminToken = okd.token
    const list = await call('GET', '/api/admin/members', { admin: adminToken })
    check('站长列表 200', list.status === 200)
    const ld = await list.json()
    check('列表含 alice', ld.members.some((m) => m.username === 'alice'))
    const noAuth = await call('GET', '/api/admin/members')
    check('无站长 token 访问后台 401', noAuth.status === 401)
  }

  console.log('\n[7] 站长发放 lifetime → 客户立即生效')
  {
    const g = await call('POST', '/api/admin/grant', { admin: adminToken, body: { username: 'alice', plan: 'lifetime' } })
    check('发放 200', g.status === 200)
    const me = await call('GET', '/api/me', { token: aliceToken })
    const md = await me.json()
    check('alice 变 active_lifetime', md.entitlement.phase === 'active_lifetime' && md.entitlement.hasAccess === true)
  }

  console.log('\n[8] 站长吊销 → 客户失效')
  {
    const r = await call('POST', '/api/admin/revoke', { admin: adminToken, body: { username: 'alice' } })
    check('吊销 200', r.status === 200)
    const me = await call('GET', '/api/me', { token: aliceToken })
    const md = await me.json()
    check('alice 变 expired 且无访问权', md.entitlement.phase === 'expired' && md.entitlement.hasAccess === false)
  }

  console.log('\n[9] 改密流程')
  let bobToken = ''
  {
    const reg = await call('POST', '/api/auth/register', { body: { username: 'bobby', password: 'oldpass123', contact: 'wx_bob' } })
    bobToken = (await reg.json()).token
    const chg = await call('POST', '/api/auth/change-password', { token: bobToken, body: { currentPassword: 'oldpass123', newPassword: 'newpass456' } })
    check('改密 200', chg.status === 200)
    const oldLogin = await call('POST', '/api/auth/login', { body: { username: 'bobby', password: 'oldpass123' } })
    check('旧密码登录失败 401', oldLogin.status === 401)
    const newLogin = await call('POST', '/api/auth/login', { body: { username: 'bobby', password: 'newpass456' } })
    check('新密码登录成功 200', newLogin.status === 200)
  }

  console.log(`\n=== 后端 E2E：${pass} 通过 / ${fail} 失败 ===`)
  if (fail > 0) {
    console.log('失败项：\n - ' + fails.join('\n - '))
    process.exit(1)
  }
}

run().catch((e) => {
  console.error('测试运行异常：', e)
  process.exit(1)
})
