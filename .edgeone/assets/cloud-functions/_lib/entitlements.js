import { getPlan } from './plans.js'

const DAY_MS = 24 * 60 * 60 * 1000

export function applyConfirmedOrder({ current, order, confirmedAt }) {
  if (current?.isLifetime) {
    return { plan: 'lifetime', expiresAt: null, isLifetime: true }
  }

  const plan = getPlan(order.plan)
  if (!plan) throw new Error('INVALID_PLAN')

  const durationDays = Number.isInteger(order.durationDays) && order.durationDays > 0
    ? order.durationDays
    : plan.durationDays

  if (durationDays === null) {
    return { plan: plan.id, expiresAt: null, isLifetime: true }
  }

  const confirmedMs = Date.parse(confirmedAt)
  const currentExpiryMs = current?.expiresAt ? Date.parse(current.expiresAt) : Number.NaN
  const startsAt = Number.isFinite(currentExpiryMs) && currentExpiryMs > confirmedMs ? currentExpiryMs : confirmedMs

  return {
    plan: plan.id,
    expiresAt: new Date(startsAt + durationDays * DAY_MS).toISOString(),
    isLifetime: false,
  }
}

export function computeEntitlement({ user, confirmedOrders = [], paid: suppliedPaid, now }) {
  if (user.role === 'admin') {
    return { phase: 'admin', hasAccess: true, plan: 'admin', expiresAt: null, trialEndsAt: user.trialEndsAt ?? null }
  }

  if (user.status === 'suspended') {
    return { phase: 'suspended', hasAccess: false, plan: null, expiresAt: null, trialEndsAt: user.trialEndsAt ?? null }
  }

  const paid = suppliedPaid === undefined
    ? [...confirmedOrders]
      .sort((left, right) => Date.parse(left.confirmedAt) - Date.parse(right.confirmedAt))
      .reduce((current, order) => applyConfirmedOrder({ current, order, confirmedAt: order.confirmedAt }), null)
    : suppliedPaid

  if (paid?.isLifetime) {
    return { phase: 'active_lifetime', hasAccess: true, ...paid, trialEndsAt: user.trialEndsAt ?? null }
  }

  if (paid?.expiresAt && Date.parse(paid.expiresAt) > Date.parse(now)) {
    return { phase: `active_${paid.plan}`, hasAccess: true, ...paid, trialEndsAt: user.trialEndsAt ?? null }
  }

  if (user.trialEndsAt && Date.parse(user.trialEndsAt) > Date.parse(now)) {
    return {
      phase: 'trialing',
      hasAccess: true,
      plan: null,
      expiresAt: null,
      trialEndsAt: user.trialEndsAt,
    }
  }

  return {
    phase: 'expired',
    hasAccess: false,
    plan: null,
    expiresAt: null,
    trialEndsAt: user.trialEndsAt ?? null,
  }
}
