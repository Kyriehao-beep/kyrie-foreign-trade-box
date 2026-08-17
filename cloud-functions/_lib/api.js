import { randomUUID } from 'node:crypto'
import { createAdminService } from './adminService.js'
import { seedAdmins } from './adminSeed.js'
import { createAuthService, normalizeUsername } from './authService.js'
import { createBillingService, publicPlans } from './billingService.js'
import { emptyResponse, errorResponse, HttpError, jsonResponse, readJson, requireSameOrigin } from './http.js'
import { checkRateLimit, consumeRateLimit } from './rateLimitService.js'
import { expiredSessionCookie, sessionCookie } from './security.js'

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS

export function createApi({ repository, env = {}, now = () => new Date().toISOString(), uuid = randomUUID }) {
  const auth = createAuthService({ repository, now, uuid })
  const billing = createBillingService({ repository, now, uuid })
  const admin = createAdminService({ repository, now, uuid })

  async function requireUser(request) {
    const user = await auth.currentUser(request)
    if (!user) throw new HttpError(401, 'AUTH_REQUIRED', '请先登录')
    if (user.status !== 'active') throw new HttpError(403, 'ACCOUNT_SUSPENDED', '账号已停用，请联系客服')
    if (user.passwordResetRequired) throw new HttpError(403, 'PASSWORD_CHANGE_REQUIRED', '请先更换临时密码')
    return user
  }

  async function requireAdmin(request) {
    const user = await requireUser(request)
    if (user.role !== 'admin') throw new HttpError(403, 'ADMIN_REQUIRED', '无权访问管理员后台')
    return user
  }

  async function enforceRateLimit(scope, limit, windowMs) {
    const result = await consumeRateLimit({ repository, scope, limit, windowMs, now: now() })
    if (!result.allowed) throw new HttpError(429, 'RATE_LIMITED', '操作过于频繁，请稍后再试')
  }

  return async function handle(request, context = {}) {
    try {
      await seedAdmins({ repository, env, now, uuid })
      const url = new URL(request.url)
      const clientIp = context.clientIp || 'unknown'

      if (request.method === 'GET' && url.pathname === '/api/plans') {
        return jsonResponse(publicPlans())
      }

      if (request.method === 'GET' && url.pathname === '/api/support') {
        return jsonResponse(await billing.getPublicSupport())
      }

      if (request.method === 'GET' && url.pathname === '/api/auth/me') {
        return jsonResponse(await auth.me(request))
      }

      if (request.method === 'GET' && url.pathname === '/api/orders/me') {
        return jsonResponse(await billing.listOwnOrders(await requireUser(request)))
      }

      const qrMatch = url.pathname.match(/^\/api\/payment\/qr\/(wechat|alipay)$/)
      if (request.method === 'GET' && qrMatch) {
        await requireUser(request)
        const qr = await billing.getQr(qrMatch[1])
        return new Response(qr.bytes, { status: 200, headers: { 'cache-control': 'no-store', 'content-type': qr.contentType } })
      }

      if (request.method === 'GET' && url.pathname === '/api/admin/users') {
        await requireAdmin(request)
        return jsonResponse(await admin.listUsers())
      }

      if (request.method === 'GET' && url.pathname === '/api/admin/orders') {
        await requireAdmin(request)
        return jsonResponse(await admin.listOrders())
      }

      if (request.method === 'GET' && url.pathname === '/api/admin/audit') {
        await requireAdmin(request)
        return jsonResponse(await admin.listAudit())
      }

      if (request.method === 'GET' && url.pathname === '/api/admin/payment-settings') {
        await requireAdmin(request)
        return jsonResponse(await billing.getPaymentSettings())
      }

      if (request.method !== 'GET' && request.method !== 'HEAD') requireSameOrigin(request)

      if (request.method === 'POST' && url.pathname === '/api/auth/register') {
        const limit = await consumeRateLimit({
          repository,
          scope: `register:${clientIp}`,
          limit: 3,
          windowMs: HOUR_MS,
          now: now(),
        })
        if (!limit.allowed) return jsonResponse({ error: 'RATE_LIMITED', message: '注册尝试过于频繁，请稍后再试' }, 429)
        const result = await auth.register(await readJson(request))
        const { token, ...body } = result
        return jsonResponse(body, 201, { 'set-cookie': sessionCookie(token) })
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/login') {
        const body = await readJson(request)
        const loginScope = `login:${clientIp}:${normalizeUsername(body.username)}`
        const currentLimit = await checkRateLimit({ repository, scope: loginScope, limit: 5, now: now() })
        if (!currentLimit.allowed) return jsonResponse({ error: 'RATE_LIMITED', message: '登录尝试过于频繁，请稍后再试' }, 429)
        let result
        try {
          result = await auth.login(body)
        } catch (error) {
          if (error instanceof HttpError && error.code === 'INVALID_CREDENTIALS') {
            const failedLimit = await consumeRateLimit({ repository, scope: loginScope, limit: 5, windowMs: MINUTE_MS, now: now() })
            if (!failedLimit.allowed) return jsonResponse({ error: 'RATE_LIMITED', message: '登录尝试过于频繁，请稍后再试' }, 429)
          }
          throw error
        }
        const { token, ...responseBody } = result
        return jsonResponse(responseBody, 200, { 'set-cookie': sessionCookie(token) })
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
        await auth.logout(request)
        return emptyResponse(204, { 'set-cookie': expiredSessionCookie() })
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/password') {
        const passwordUser = await auth.currentUser(request)
        if (!passwordUser) throw new HttpError(401, 'AUTH_REQUIRED', '请先登录')
        if (passwordUser.status !== 'active') throw new HttpError(403, 'ACCOUNT_SUSPENDED', '账号已停用，请联系客服')
        await enforceRateLimit(`password-change:${clientIp}:${passwordUser.id}`, 10, HOUR_MS)
        const result = await auth.changePassword(request, await readJson(request))
        const { token, ...body } = result
        return jsonResponse(body, 200, { 'set-cookie': sessionCookie(token) })
      }

      if (request.method === 'POST' && url.pathname === '/api/orders') {
        const user = await requireUser(request)
        await enforceRateLimit(`order-create:${clientIp}:${user.id}`, 10, HOUR_MS)
        return jsonResponse(await billing.createOrder(user, await readJson(request)), 201)
      }

      const claimMatch = url.pathname.match(/^\/api\/orders\/([^/]+)\/claim$/)
      if (request.method === 'POST' && claimMatch) {
        const user = await requireUser(request)
        await enforceRateLimit(`order-claim:${clientIp}:${user.id}`, 10, HOUR_MS)
        return jsonResponse(await billing.claimOrder(user, claimMatch[1], await readJson(request)))
      }

      if (request.method === 'POST' && url.pathname === '/api/admin/payment-settings') {
        const administrator = await requireAdmin(request)
        await enforceRateLimit(`admin-write:${clientIp}:${administrator.id}`, 60, HOUR_MS)
        return jsonResponse(await admin.uploadPaymentSettings(administrator, await request.formData()))
      }

      const confirmMatch = url.pathname.match(/^\/api\/admin\/orders\/([^/]+)\/confirm$/)
      if (request.method === 'POST' && confirmMatch) {
        const administrator = await requireAdmin(request)
        await enforceRateLimit(`admin-write:${clientIp}:${administrator.id}`, 60, HOUR_MS)
        const body = await readJson(request)
        return jsonResponse(await admin.confirmOrder(administrator, confirmMatch[1], body.note))
      }

      const rejectMatch = url.pathname.match(/^\/api\/admin\/orders\/([^/]+)\/reject$/)
      if (request.method === 'POST' && rejectMatch) {
        const administrator = await requireAdmin(request)
        await enforceRateLimit(`admin-write:${clientIp}:${administrator.id}`, 60, HOUR_MS)
        const body = await readJson(request)
        return jsonResponse(await admin.rejectOrder(administrator, rejectMatch[1], body.note, body.adminNote))
      }

      const statusMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/status$/)
      if (request.method === 'POST' && statusMatch) {
        const administrator = await requireAdmin(request)
        await enforceRateLimit(`admin-write:${clientIp}:${administrator.id}`, 60, HOUR_MS)
        const body = await readJson(request)
        return jsonResponse(await admin.changeUserStatus(administrator, statusMatch[1], body.status, body.note))
      }

      const resetMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/reset-password$/)
      if (request.method === 'POST' && resetMatch) {
        const administrator = await requireAdmin(request)
        await enforceRateLimit(`admin-write:${clientIp}:${administrator.id}`, 60, HOUR_MS)
        return jsonResponse(await admin.resetPassword(administrator, resetMatch[1]))
      }

      const entitlementMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/entitlement$/)
      if (request.method === 'POST' && entitlementMatch) {
        const administrator = await requireAdmin(request)
        await enforceRateLimit(`admin-write:${clientIp}:${administrator.id}`, 60, HOUR_MS)
        const body = await readJson(request)
        return jsonResponse(await admin.grantEntitlement(administrator, entitlementMatch[1], body.plan, body.days, body.idempotencyKey))
      }

      return jsonResponse({ error: 'NOT_FOUND', message: '接口不存在' }, 404)
    } catch (error) {
      return errorResponse(error)
    }
  }
}
