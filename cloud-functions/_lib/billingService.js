import { HttpError } from './http.js'
import { getPlan, PLANS } from './plans.js'

const PAYMENT_METHODS = new Set(['wechat', 'alipay'])

function publicOrder(order) {
  return {
    orderId: order.orderId,
    userId: order.userId,
    username: order.username,
    plan: order.plan,
    amountCny: order.amountCny,
    status: order.status,
    createdAt: order.createdAt,
    paymentMethod: order.paymentMethod,
    payerHint: order.payerHint,
    paidAtClaimed: order.paidAtClaimed,
    claimedAt: order.claimedAt ?? null,
    reviewedAt: order.reviewedAt ?? null,
    userMessage: order.status === 'rejected' ? order.userMessage ?? '付款信息未核对成功，请联系客服' : undefined,
  }
}

export function publicPlans() {
  return PLANS.map(({ id, name, amountCny, durationDays, suffix, note }) => ({
    id, name, amountCny, durationDays, suffix, note,
  }))
}

function validClaim({ paymentMethod, payerHint, paidAtClaimed }) {
  return PAYMENT_METHODS.has(paymentMethod)
    && typeof payerHint === 'string'
    && payerHint.trim().length >= 2
    && payerHint.trim().length <= 64
    && Number.isFinite(Date.parse(paidAtClaimed))
}

export function createBillingService({ repository, now, uuid }) {
  async function persistOrder(order) {
    const orderKey = `v1/orders/${order.orderId}.json`
    await repository.setJson(orderKey, order)
    await repository.setJson(`v1/orders-by-user/${order.userId}/${order.orderId}.json`, { orderKey })
    return order
  }

  async function ownOrderRecords(userId) {
    const indexKeys = await repository.list(`v1/orders-by-user/${userId}/`)
    const orderKeys = (await Promise.all(indexKeys.map((key) => repository.getJson(key))))
      .map((index) => index?.orderKey)
      .filter(Boolean)
    let orders = (await Promise.all(orderKeys.map((key) => repository.getJson(key)))).filter(Boolean)
    const migrationKey = `v1/migrations/orders-by-user/${userId}.json`
    if (!await repository.getJson(migrationKey)) {
      const legacyKeys = await repository.list('v1/orders/')
      const legacyOrders = await Promise.all(legacyKeys.map((key) => repository.getJson(key)))
      const own = legacyOrders.filter((order) => order?.userId === userId)
      await Promise.all(own.map((order) => repository.setJson(`v1/orders-by-user/${userId}/${order.orderId}.json`, { orderKey: `v1/orders/${order.orderId}.json` })))
      await repository.setJson(migrationKey, { migratedAt: now() })
      orders = [...orders, ...own]
    }
    const unique = [...new Map(orders.map((order) => [order.orderId, order])).values()]
    const openByPlan = new Map()
    for (const order of unique
      .filter((item) => ['awaiting_payment', 'pending_review'].includes(item.status))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))) {
      openByPlan.set(order.plan, order)
    }
    await Promise.all([...openByPlan.values()].map((order) => repository.setJson(`v1/open-orders/${userId}/${order.plan}.json`, { order })))
    return unique
  }

  async function paymentSettings() {
    return await repository.getJson('v1/settings/payment.json') ?? {
      wechatConfigured: false,
      alipayConfigured: false,
      supportContact: '',
    }
  }

  return {
    async getPaymentSettings() {
      return paymentSettings()
    },

    async getPublicSupport() {
      const settings = await paymentSettings()
      return { supportContact: settings.supportContact || '' }
    },

    async createOrder(user, { plan: planId }) {
      const plan = getPlan(planId)
      if (!plan) throw new HttpError(400, 'INVALID_PLAN', '请选择有效的会员方案')
      const settings = await paymentSettings()
      if (!settings.wechatConfigured || !settings.alipayConfigured) {
        throw new HttpError(503, 'PAYMENT_NOT_CONFIGURED', '收款方式配置中，请稍后再试')
      }

      const openOrderKey = `v1/open-orders/${user.id}/${plan.id}.json`
      const openOrder = await repository.getJson(openOrderKey)
      if (openOrder?.order) {
        const storedOrder = await repository.getJson(`v1/orders/${openOrder.order.orderId}.json`)
        const recoverable = storedOrder ?? openOrder.order
        if (['awaiting_payment', 'pending_review'].includes(recoverable.status)) {
          await persistOrder(recoverable)
          return publicOrder(recoverable)
        }
        await repository.delete(openOrderKey)
      }

      const existing = (await ownOrderRecords(user.id))
        .filter((order) => order?.plan === plan.id && ['awaiting_payment', 'pending_review'].includes(order.status))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
      if (existing) {
        try {
          await repository.setJson(openOrderKey, { order: existing }, { onlyIfNew: true })
        } catch (error) {
          if (error?.code !== 'ALREADY_EXISTS') throw error
        }
        return publicOrder(existing)
      }

      const date = now().slice(0, 10).replaceAll('-', '')
      const suffix = uuid().replaceAll('-', '').slice(0, 16).toUpperCase()
      const order = {
        orderId: `KTB-${date}-${suffix}`,
        userId: user.id,
        username: user.username,
        plan: plan.id,
        amountCny: plan.amountCny,
        status: 'awaiting_payment',
        createdAt: now(),
        paymentMethod: null,
        payerHint: null,
        paidAtClaimed: null,
      }
      try {
        await repository.setJson(openOrderKey, { order }, { onlyIfNew: true })
      } catch (error) {
        if (error?.code !== 'ALREADY_EXISTS') throw error
        const winner = await repository.getJson(openOrderKey)
        if (!winner?.order) throw error
        await persistOrder(winner.order)
        return publicOrder(winner.order)
      }
      await persistOrder(order)
      return publicOrder(order)
    },

    async claimOrder(user, orderId, claim) {
      if (!validClaim(claim)) throw new HttpError(400, 'INVALID_PAYMENT_CLAIM', '请填写完整的付款核对信息')
      const key = `v1/orders/${orderId}.json`
      const order = await repository.getJson(key)
      if (!order || order.userId !== user.id) throw new HttpError(404, 'ORDER_NOT_FOUND', '订单不存在')
      if (order.status !== 'awaiting_payment') throw new HttpError(409, 'ORDER_ALREADY_CLAIMED', '该订单已经提交核实')

      const updated = {
        ...order,
        status: 'pending_review',
        paymentMethod: claim.paymentMethod,
        payerHint: claim.payerHint.trim(),
        paidAtClaimed: new Date(claim.paidAtClaimed).toISOString(),
        claimedAt: now(),
      }
      await repository.setJson(key, updated)
      return publicOrder(updated)
    },

    async listOwnOrders(user) {
      const orders = await ownOrderRecords(user.id)
      return orders.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(publicOrder)
    },

    async getQr(method) {
      if (!PAYMENT_METHODS.has(method)) throw new HttpError(404, 'QR_NOT_FOUND', '收款码不存在')
      const [bytes, meta] = await Promise.all([
        repository.getBinary(`v1/payment-qr/${method}`),
        repository.getJson(`v1/payment-qr/${method}.json`),
      ])
      if (!bytes || !meta) throw new HttpError(404, 'QR_NOT_FOUND', '收款码尚未配置')
      return { bytes, contentType: meta.contentType }
    },
  }
}
