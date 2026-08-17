import assert from 'node:assert/strict'
import test from 'node:test'
import { applyConfirmedOrder, computeEntitlement } from '../../cloud-functions/_lib/entitlements.js'
import { PLANS } from '../../cloud-functions/_lib/plans.js'

test('returns the approved prices and durations', () => {
  assert.deepEqual(
    PLANS.map(({ id, amountCny, durationDays }) => ({ id, amountCny, durationDays })),
    [
      { id: 'monthly', amountCny: 59, durationDays: 30 },
      { id: 'yearly', amountCny: 499, durationDays: 365 },
      { id: 'lifetime', amountCny: 1299, durationDays: null },
    ],
  )
})

test('extends an unexpired annual entitlement from its current expiry', () => {
  const current = { plan: 'yearly', expiresAt: '2026-12-31T00:00:00.000Z', isLifetime: false }
  const next = applyConfirmedOrder({
    current,
    order: { plan: 'yearly', orderId: 'KTB-1' },
    confirmedAt: '2026-08-17T00:00:00.000Z',
  })

  assert.equal(next.expiresAt, '2027-12-31T00:00:00.000Z')
})

test('starts an expired monthly entitlement from confirmation time', () => {
  const next = applyConfirmedOrder({
    current: { plan: 'monthly', expiresAt: '2026-08-01T00:00:00.000Z', isLifetime: false },
    order: { plan: 'monthly', orderId: 'KTB-2' },
    confirmedAt: '2026-08-17T00:00:00.000Z',
  })

  assert.equal(next.expiresAt, '2026-09-16T00:00:00.000Z')
})

test('keeps lifetime access after later subscription orders', () => {
  const next = applyConfirmedOrder({
    current: { plan: 'lifetime', expiresAt: null, isLifetime: true },
    order: { plan: 'monthly', orderId: 'KTB-3' },
    confirmedAt: '2026-08-17T00:00:00.000Z',
  })

  assert.deepEqual(next, { plan: 'lifetime', expiresAt: null, isLifetime: true })
})

test('computes a 72 hour trial from the server user record', () => {
  const result = computeEntitlement({
    user: {
      id: 'user-1',
      role: 'user',
      status: 'active',
      trialEndsAt: '2026-08-20T00:00:00.000Z',
    },
    confirmedOrders: [],
    now: '2026-08-17T00:00:00.000Z',
  })

  assert.equal(result.phase, 'trialing')
  assert.equal(result.hasAccess, true)
  assert.equal(result.trialEndsAt, '2026-08-20T00:00:00.000Z')
})

test('suspended status overrides paid membership', () => {
  const result = computeEntitlement({
    user: {
      id: 'user-1',
      role: 'user',
      status: 'suspended',
      trialEndsAt: '2026-08-20T00:00:00.000Z',
    },
    confirmedOrders: [{ plan: 'lifetime', orderId: 'KTB-4', confirmedAt: '2026-08-17T00:00:00.000Z' }],
    now: '2026-08-17T00:00:00.000Z',
  })

  assert.equal(result.phase, 'suspended')
  assert.equal(result.hasAccess, false)
})
