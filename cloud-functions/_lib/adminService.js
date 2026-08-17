import { computeEntitlement } from './entitlements.js'
import { confirmedForUser, confirmedOrderKey, paidEntitlementForUser } from './confirmedOrders.js'
import { HttpError } from './http.js'
import { getPlan } from './plans.js'
import { createSessionToken, hashPassword } from './security.js'

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_QR_BYTES = 2 * 1024 * 1024
const TEMPORARY_PASSWORD_MS = 24 * 60 * 60 * 1000
const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{16,80}$/

function safeUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    contact: user.contact,
    role: user.role,
    status: user.status,
    passwordResetRequired: user.passwordResetRequired,
    createdAt: user.createdAt,
    trialEndsAt: user.trialEndsAt,
  }
}

async function listObjects(repository, prefix) {
  const keys = await repository.list(prefix)
  return Promise.all(keys.map((key) => repository.getJson(key)))
}

async function findUser(repository, userId) {
  const keys = await repository.list('v1/users/by-name/')
  for (const key of keys) {
    const user = await repository.getJson(key)
    if (user?.id === userId) return { key, user }
  }
  throw new HttpError(404, 'USER_NOT_FOUND', '用户不存在')
}

async function invalidateSessions(repository, userId) {
  const keys = await repository.list('v1/sessions/')
  const sessions = await Promise.all(keys.map(async (key) => ({ key, value: await repository.getJson(key) })))
  await Promise.all(sessions.filter((item) => item.value?.userId === userId).map((item) => repository.delete(item.key)))
}

async function rebuildEntitlement(repository, userId) {
  return paidEntitlementForUser(repository, userId)
}

export function createAdminService({ repository, now, uuid }) {
  async function settleDecision(orderId, candidate) {
    const key = `v1/order-decisions/${orderId}.json`
    const existing = await repository.getJson(key)
    if (existing) return existing
    try {
      await repository.setJson(key, candidate, { onlyIfNew: true })
      return candidate
    } catch (error) {
      if (error?.code !== 'ALREADY_EXISTS') throw error
      return repository.getJson(key)
    }
  }

  function decisionAdministrator(decision, fallback) {
    return {
      id: decision.decidedBy ?? fallback.id,
      username: decision.decidedByUsername ?? fallback.username,
    }
  }

  async function audit(admin, action, targetId, before, after, operationKey) {
    const createdAt = now()
    const key = operationKey ? `v1/audit/by-operation/${operationKey}.json` : `v1/audit/${createdAt}-${uuid()}.json`
    try {
      await repository.setJson(key, {
      id: uuid(),
      adminId: admin.id,
      adminUsername: admin.username,
      action,
      targetId,
      before,
      after,
      createdAt,
      }, operationKey ? { onlyIfNew: true } : {})
    } catch (error) {
      if (operationKey && error?.code === 'ALREADY_EXISTS') return
      throw error
    }
  }

  return {
    async listUsers() {
      const users = await listObjects(repository, 'v1/users/by-name/')
      return Promise.all(users.map(async (user) => ({
        ...safeUser(user),
        entitlement: computeEntitlement({
          user,
          paid: await paidEntitlementForUser(repository, user.id),
          now: now(),
        }),
      })))
    },

    async listOrders() {
      const orders = await listObjects(repository, 'v1/orders/')
      return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },

    async confirmOrder(admin, orderId, note) {
      const orderKey = `v1/orders/${orderId}.json`
      const order = await repository.getJson(orderKey)
      if (!order) throw new HttpError(404, 'ORDER_NOT_FOUND', '订单不存在')
      const eventKey = confirmedOrderKey(order.userId, orderId)
      let event = await repository.getJson(eventKey)
      if (!event && !['pending_review', 'confirmed'].includes(order.status)) throw new HttpError(409, 'ORDER_NOT_READY', '该订单尚未提交付款核实')
      const decision = await settleDecision(orderId, {
        orderId,
        userId: order.userId,
        type: 'confirmed',
        decidedAt: event?.confirmedAt ?? now(),
        decidedBy: event?.confirmedBy ?? admin.id,
        decidedByUsername: event?.confirmedByUsername ?? admin.username,
        adminNote: order.adminNote || note?.trim().slice(0, 200) || '',
      })
      if (decision?.type !== 'confirmed') throw new HttpError(409, 'ORDER_ALREADY_REJECTED', '该订单已被其他管理员拒绝')

      event ??= {
        orderId,
        userId: order.userId,
        plan: order.plan,
        amountCny: order.amountCny,
        confirmedAt: decision.decidedAt,
        confirmedBy: decision.decidedBy,
        confirmedByUsername: decision.decidedByUsername,
      }
      if (!await repository.getJson(eventKey)) {
        try {
          await repository.setJson(eventKey, event, { onlyIfNew: true })
        } catch (error) {
          if (error?.code !== 'ALREADY_EXISTS') throw error
          event = await repository.getJson(eventKey)
        }
      }

      const updated = { ...order, status: 'confirmed', reviewedAt: decision.decidedAt, reviewedBy: decision.decidedBy, adminNote: decision.adminNote || '' }
      await repository.setJson(orderKey, updated)
      const entitlement = await rebuildEntitlement(repository, order.userId)
      await audit(decisionAdministrator(decision, admin), 'order.confirmed', orderId, { status: order.status }, { status: updated.status, plan: order.plan }, `order-confirmed-${orderId}`)
      return { order: updated, entitlement }
    },

    async rejectOrder(admin, orderId, note, adminNote) {
      if (typeof note !== 'string' || note.trim().length < 2) {
        throw new HttpError(400, 'REJECTION_NOTE_REQUIRED', '拒绝申请时必须填写核对说明')
      }
      const key = `v1/orders/${orderId}.json`
      const order = await repository.getJson(key)
      if (!order) throw new HttpError(404, 'ORDER_NOT_FOUND', '订单不存在')
      if (!['pending_review', 'rejected'].includes(order.status)) throw new HttpError(409, 'ORDER_NOT_READY', '该订单当前不能拒绝')
      const previousConfirmation = (await confirmedForUser(repository, order.userId)).find((event) => event.orderId === orderId)
      const decision = await settleDecision(orderId, {
        orderId,
        userId: order.userId,
        type: previousConfirmation ? 'confirmed' : 'rejected',
        decidedAt: previousConfirmation?.confirmedAt ?? order.reviewedAt ?? now(),
        decidedBy: previousConfirmation?.confirmedBy ?? order.reviewedBy ?? admin.id,
        decidedByUsername: previousConfirmation?.confirmedByUsername ?? admin.username,
        adminNote: order.adminNote || (typeof adminNote === 'string' ? adminNote.trim().slice(0, 200) : ''),
        userMessage: order.userMessage || note.trim().slice(0, 200),
      })
      if (decision?.type !== 'rejected') throw new HttpError(409, 'ORDER_ALREADY_CONFIRMED', '该订单已由其他管理员确认到账')
      const updated = { ...order, status: 'rejected', reviewedAt: decision.decidedAt, reviewedBy: decision.decidedBy, adminNote: decision.adminNote || '', userMessage: decision.userMessage }
      await repository.setJson(key, updated)
      await audit(decisionAdministrator(decision, admin), 'order.rejected', orderId, { status: order.status }, { status: updated.status }, `order-rejected-${orderId}`)
      return updated
    },

    async changeUserStatus(admin, userId, status, note) {
      if (!['active', 'suspended'].includes(status)) throw new HttpError(400, 'INVALID_STATUS', '请选择有效的账号状态')
      const { key, user } = await findUser(repository, userId)
      if (user.role === 'admin') throw new HttpError(400, 'ADMIN_STATUS_PROTECTED', '不能通过此入口停用管理员')
      const updated = { ...user, status }
      await repository.setJson(key, updated)
      if (status === 'suspended') await invalidateSessions(repository, userId)
      await audit(admin, 'user.status_changed', userId, { status: user.status }, { status, note: note?.trim() || '' })
      return safeUser(updated)
    },

    async resetPassword(admin, userId) {
      const { key, user } = await findUser(repository, userId)
      const temporaryPassword = `Ktb-${createSessionToken()}!`
      const updated = {
        ...user,
        passwordHash: await hashPassword(temporaryPassword),
        passwordResetRequired: true,
        temporaryPasswordExpiresAt: new Date(Date.parse(now()) + TEMPORARY_PASSWORD_MS).toISOString(),
      }
      await repository.setJson(key, updated)
      await invalidateSessions(repository, userId)
      await audit(admin, 'user.password_reset', userId, { passwordResetRequired: user.passwordResetRequired }, { passwordResetRequired: true })
      return { temporaryPassword }
    },

    async grantEntitlement(admin, userId, planId, customDays, idempotencyKey) {
      if (typeof idempotencyKey !== 'string' || !IDEMPOTENCY_KEY.test(idempotencyKey)) {
        throw new HttpError(400, 'INVALID_IDEMPOTENCY_KEY', '请刷新页面后重试')
      }
      const days = Number(customDays)
      const isCustom = Number.isInteger(days) && days >= 1 && days <= 3650
      const plan = isCustom ? getPlan('monthly') : getPlan(planId)
      if (!plan) throw new HttpError(400, 'INVALID_PLAN', '请选择有效的会员方案或填写 1 至 3650 天')
      await findUser(repository, userId)
      const orderId = `ADMIN-${idempotencyKey}`
      const event = { orderId, userId, plan: plan.id, ...(isCustom ? { durationDays: days } : {}), amountCny: 0, confirmedAt: now(), confirmedBy: admin.id, source: 'admin' }
      const eventKey = confirmedOrderKey(userId, orderId)
      let storedEvent = await repository.getJson(eventKey)
      try {
        if (!storedEvent) await repository.setJson(eventKey, event, { onlyIfNew: true })
      } catch (error) {
        if (error?.code !== 'ALREADY_EXISTS') throw error
        storedEvent = await repository.getJson(eventKey)
      }
      storedEvent ??= event
      if (storedEvent.plan !== event.plan || (storedEvent.durationDays ?? null) !== (event.durationDays ?? null)) {
        throw new HttpError(409, 'IDEMPOTENCY_CONFLICT', '该操作已用于其他会员方案，请刷新后重试')
      }
      const entitlement = await rebuildEntitlement(repository, userId)
      await audit(admin, 'user.entitlement_granted', userId, null, { plan: storedEvent.plan, customDays: storedEvent.durationDays ?? null, orderId }, `entitlement-${userId}-${idempotencyKey}`)
      return entitlement
    },

    async uploadPaymentSettings(admin, formData) {
      const method = formData.get('method')
      const image = formData.get('image')
      const contact = String(formData.get('contact') ?? '').trim()
      if (!['wechat', 'alipay'].includes(method) || !image || typeof image.arrayBuffer !== 'function') {
        throw new HttpError(400, 'INVALID_QR_IMAGE', '请选择有效的微信或支付宝收款码图片')
      }
      if (!IMAGE_TYPES.has(image.type) || image.size <= 0 || image.size > MAX_QR_BYTES) {
        throw new HttpError(400, 'INVALID_QR_IMAGE', '收款码仅支持 2MB 以内的 PNG、JPG 或 WebP 图片')
      }
      if (contact.length > 64) throw new HttpError(400, 'INVALID_SUPPORT_CONTACT', '客服联系方式不能超过 64 个字符')

      await repository.setBinary(`v1/payment-qr/${method}`, new Uint8Array(await image.arrayBuffer()))
      await repository.setJson(`v1/payment-qr/${method}.json`, { contentType: image.type, updatedAt: now(), updatedBy: admin.id })
      const current = await repository.getJson('v1/settings/payment.json') ?? {}
      const updated = {
        wechatConfigured: current.wechatConfigured === true || method === 'wechat',
        alipayConfigured: current.alipayConfigured === true || method === 'alipay',
        supportContact: contact || current.supportContact || '',
        updatedAt: now(),
      }
      await repository.setJson('v1/settings/payment.json', updated)
      await audit(admin, 'payment.settings_updated', method, null, { method, contentType: image.type })
      return updated
    },

    async listAudit() {
      const events = await listObjects(repository, 'v1/audit/')
      return events.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
  }
}
