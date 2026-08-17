import assert from 'node:assert/strict'
import test from 'node:test'
import { createApi } from '../../cloud-functions/_lib/api.js'
import { userKey } from '../../cloud-functions/_lib/authService.js'
import { createMemoryRepository } from './memoryRepository.mjs'

const ORIGIN = 'https://kyrie.edgeone.app'
const ADMIN_ENV = {
  ADMIN_1_USERNAME: 'admin_one',
  ADMIN_1_PASSWORD: 'admin-pass-one',
  ADMIN_1_DISPLAY_NAME: '管理员一',
  ADMIN_2_USERNAME: 'admin_two',
  ADMIN_2_PASSWORD: 'admin-pass-two',
  ADMIN_2_DISPLAY_NAME: '管理员二',
}

function request(path, method = 'GET', body, cookie) {
  const headers = {}
  if (method !== 'GET') headers.origin = ORIGIN
  if (cookie) headers.cookie = cookie
  if (body !== undefined) headers['content-type'] = 'application/json'
  return new Request(`${ORIGIN}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function formRequest(path, form, cookie) {
  return new Request(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: { origin: ORIGIN, cookie },
    body: form,
  })
}

function cookieFrom(response) {
  return response.headers.get('set-cookie')?.split(';')[0] ?? ''
}

function createHarness() {
  const repository = createMemoryRepository()
  let sequence = 0
  let currentTime = '2026-08-17T00:00:00.000Z'
  const api = createApi({
    repository,
    env: ADMIN_ENV,
    now: () => currentTime,
    uuid: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
  })
  return {
    repository,
    api: (value, clientIp = '203.0.113.30') => api(value, { clientIp }),
    setNow(value) { currentTime = value },
  }
}

async function loginAdminAs(harness, username, password, newPassword) {
  const response = await harness.api(request('/api/auth/login', 'POST', {
    username, password,
  }))
  assert.equal(response.status, 200)
  const changed = await harness.api(request('/api/auth/password', 'POST', {
    currentPassword: password, newPassword,
  }, cookieFrom(response)))
  assert.equal(changed.status, 200)
  return cookieFrom(changed)
}

async function loginAdmin(harness) {
  return loginAdminAs(harness, 'admin_one', 'admin-pass-one', 'admin-new-pass-2026')
}

async function registerUser(harness, username = 'buyer_user') {
  const response = await harness.api(request('/api/auth/register', 'POST', {
    username, password: 'buyer-pass-2026', contact: 'buyer_wechat',
  }), `203.0.113.${40 + username.length}`)
  assert.equal(response.status, 201)
  const body = await response.clone().json()
  return { cookie: cookieFrom(response), user: body.user }
}

async function uploadQr(harness, adminCookie, method, type = 'image/png', bytes = [137, 80, 78, 71]) {
  const form = new FormData()
  form.set('method', method)
  form.set('contact', '客服微信：KyrieTradeBox')
  form.set('image', new File([new Uint8Array(bytes)], `${method}.png`, { type }))
  return harness.api(formRequest('/api/admin/payment-settings', form, adminCookie))
}

async function configurePayment(harness, adminCookie) {
  assert.equal((await uploadQr(harness, adminCookie, 'wechat')).status, 200)
  assert.equal((await uploadQr(harness, adminCookie, 'alipay')).status, 200)
}

async function createAndClaimMonthlyOrder(harness, userCookie) {
  const created = await harness.api(request('/api/orders', 'POST', { plan: 'monthly', amountCny: 1 }, userCookie))
  assert.equal(created.status, 201)
  const order = await created.json()
  const claimed = await harness.api(request(`/api/orders/${order.orderId}/claim`, 'POST', {
    paymentMethod: 'wechat', payerHint: '胜尾号 1234', paidAtClaimed: '2026-08-17T00:05:00.000Z',
  }, userCookie))
  assert.equal(claimed.status, 200)
  return claimed.json()
}

test('publishes the approved plans from the server', async () => {
  const harness = createHarness()
  const response = await harness.api(request('/api/plans'))

  assert.equal(response.status, 200)
  const plans = await response.json()
  assert.deepEqual(plans.map(({ id, amountCny }) => ({ id, amountCny })), [
    { id: 'monthly', amountCny: 59 },
    { id: 'yearly', amountCny: 499 },
    { id: 'lifetime', amountCny: 1299 },
  ])
})

test('publishes only the customer-support contact to signed-out users', async () => {
  const harness = createHarness()
  await harness.repository.setJson('v1/settings/payment.json', {
    wechatConfigured: true,
    alipayConfigured: true,
    supportContact: '客服微信：KyrieTradeBox',
    internalMemo: '不得公开',
  })

  const response = await harness.api(request('/api/support'))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { supportContact: '客服微信：KyrieTradeBox' })
})

test('blocks seeded administrators from protected APIs until they change the temporary password', async () => {
  const harness = createHarness()
  const login = await harness.api(request('/api/auth/login', 'POST', {
    username: 'admin_one', password: 'admin-pass-one',
  }))
  const response = await harness.api(request('/api/admin/users', 'GET', undefined, cookieFrom(login)))

  assert.equal(response.status, 403)
  assert.deepEqual(await response.json(), {
    error: 'PASSWORD_CHANGE_REQUIRED', message: '请先更换临时密码',
  })
})

test('does not create payment orders until both QR codes are configured', async () => {
  const harness = createHarness()
  const { cookie } = await registerUser(harness)

  const response = await harness.api(request('/api/orders', 'POST', { plan: 'monthly' }, cookie))

  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), {
    error: 'PAYMENT_NOT_CONFIGURED', message: '收款方式配置中，请稍后再试',
  })
})

test('allows only admins to upload valid QR images', async () => {
  const harness = createHarness()
  const adminCookie = await loginAdmin(harness)
  const { cookie: userCookie } = await registerUser(harness)

  assert.equal((await uploadQr(harness, userCookie, 'wechat')).status, 403)
  assert.equal((await uploadQr(harness, adminCookie, 'wechat', 'text/plain')).status, 400)
  assert.equal((await uploadQr(harness, adminCookie, 'wechat')).status, 200)

  const qr = await harness.api(request('/api/payment/qr/wechat', 'GET', undefined, adminCookie))
  assert.equal(qr.status, 200)
  assert.equal(qr.headers.get('content-type'), 'image/png')
  assert.deepEqual([...new Uint8Array(await qr.arrayBuffer())], [137, 80, 78, 71])
})

test('creates the order amount from the server plan and lets its owner claim payment', async () => {
  const harness = createHarness()
  const adminCookie = await loginAdmin(harness)
  await configurePayment(harness, adminCookie)
  const { cookie } = await registerUser(harness)

  const order = await createAndClaimMonthlyOrder(harness, cookie)

  assert.equal(order.amountCny, 59)
  assert.equal(order.plan, 'monthly')
  assert.equal(order.status, 'pending_review')
  assert.match(order.orderId, /^KTB-20260817-[A-Z0-9]{16}$/)

  const ownOrders = await (await harness.api(request('/api/orders/me', 'GET', undefined, cookie))).json()
  assert.equal(ownOrders.length, 1)
  assert.equal(ownOrders[0].orderId, order.orderId)
})

test('reuses the current unpaid order for the same user and plan', async () => {
  const harness = createHarness()
  const adminCookie = await loginAdmin(harness)
  await configurePayment(harness, adminCookie)
  const { cookie } = await registerUser(harness)

  const first = await (await harness.api(request('/api/orders', 'POST', { plan: 'yearly' }, cookie))).json()
  const second = await (await harness.api(request('/api/orders', 'POST', { plan: 'yearly' }, cookie))).json()

  assert.equal(second.orderId, first.orderId)
  assert.equal((await harness.repository.list('v1/orders/')).length, 1)
})

test('creates one recoverable order when identical requests arrive concurrently', async () => {
  const harness = createHarness()
  const adminCookie = await loginAdmin(harness)
  await configurePayment(harness, adminCookie)
  const { cookie } = await registerUser(harness)

  const [firstResponse, secondResponse] = await Promise.all([
    harness.api(request('/api/orders', 'POST', { plan: 'yearly' }, cookie), '198.51.100.71'),
    harness.api(request('/api/orders', 'POST', { plan: 'yearly' }, cookie), '198.51.100.71'),
  ])
  const [first, second] = await Promise.all([firstResponse.json(), secondResponse.json()])

  assert.equal(firstResponse.status, 201)
  assert.equal(secondResponse.status, 201)
  assert.equal(second.orderId, first.orderId)
  assert.equal((await harness.repository.list('v1/orders/')).length, 1)
  assert.equal((await harness.repository.list('v1/orders-by-user/')).length, 1)
})

test('completes a partial legacy order-index migration before marking it done', async () => {
  const harness = createHarness()
  const { cookie, user } = await registerUser(harness, 'legacy_orders_user')
  await harness.repository.delete(`v1/migrations/orders-by-user/${user.id}.json`)
  const first = { orderId: 'LEGACY-ONE', userId: user.id, username: user.username, plan: 'monthly', amountCny: 59, status: 'confirmed', createdAt: '2026-07-01T00:00:00.000Z' }
  const second = { orderId: 'LEGACY-TWO', userId: user.id, username: user.username, plan: 'yearly', amountCny: 499, status: 'rejected', createdAt: '2026-07-02T00:00:00.000Z' }
  await harness.repository.setJson('v1/orders/LEGACY-ONE.json', first)
  await harness.repository.setJson('v1/orders/LEGACY-TWO.json', second)
  await harness.repository.setJson(`v1/orders-by-user/${user.id}/LEGACY-ONE.json`, { orderKey: 'v1/orders/LEGACY-ONE.json' })

  const response = await harness.api(request('/api/orders/me', 'GET', undefined, cookie))

  assert.equal(response.status, 200)
  assert.deepEqual((await response.json()).map((order) => order.orderId).sort(), ['LEGACY-ONE', 'LEGACY-TWO'])
  assert.ok(await harness.repository.getJson(`v1/orders-by-user/${user.id}/LEGACY-TWO.json`))
  assert.ok(await harness.repository.getJson(`v1/migrations/orders-by-user/${user.id}.json`))
})

test('rate limits order creation per user and IP', async () => {
  const harness = createHarness()
  const adminCookie = await loginAdmin(harness)
  await configurePayment(harness, adminCookie)
  const { cookie } = await registerUser(harness)
  for (let index = 0; index < 10; index += 1) {
    assert.equal((await harness.api(request('/api/orders', 'POST', { plan: 'monthly' }, cookie), '198.51.100.70')).status, 201)
  }
  const limited = await harness.api(request('/api/orders', 'POST', { plan: 'monthly' }, cookie), '198.51.100.70')
  assert.equal(limited.status, 429)
})

test('confirms one order idempotently and gives the user exactly 30 days', async () => {
  const harness = createHarness()
  const adminCookie = await loginAdmin(harness)
  await configurePayment(harness, adminCookie)
  const { cookie: userCookie } = await registerUser(harness)
  const order = await createAndClaimMonthlyOrder(harness, userCookie)

  const first = await harness.api(request(`/api/admin/orders/${order.orderId}/confirm`, 'POST', {
    note: '微信账单已核实',
  }, adminCookie))
  const second = await harness.api(request(`/api/admin/orders/${order.orderId}/confirm`, 'POST', {
    note: '重复点击',
  }, adminCookie))

  assert.equal(first.status, 200)
  assert.equal(second.status, 200)
  const snapshot = await (await harness.api(request('/api/auth/me', 'GET', undefined, userCookie))).json()
  assert.equal(snapshot.entitlement.phase, 'active_monthly')
  assert.equal(snapshot.entitlement.expiresAt, '2026-09-16T00:00:00.000Z')
  assert.equal((await harness.repository.list('v1/confirmed-orders-by-user/')).length, 1)
})

test('recovers a confirmation after the entitlement event is written but the order update fails', async () => {
  const harness = createHarness()
  const adminCookie = await loginAdmin(harness)
  const secondAdminCookie = await loginAdminAs(harness, 'admin_two', 'admin-pass-two', 'admin-two-new-pass-2026')
  await configurePayment(harness, adminCookie)
  const { cookie: userCookie } = await registerUser(harness)
  const order = await createAndClaimMonthlyOrder(harness, userCookie)
  const originalSetJson = harness.repository.setJson
  let failedOnce = false
  harness.repository.setJson = async (key, value, options) => {
    if (!failedOnce && key === `v1/orders/${order.orderId}.json` && value?.status === 'confirmed') {
      failedOnce = true
      throw new Error('Injected order update failure')
    }
    return originalSetJson(key, value, options)
  }

  const first = await harness.api(request(`/api/admin/orders/${order.orderId}/confirm`, 'POST', { note: '已核对' }, adminCookie))
  const retry = await harness.api(request(`/api/admin/orders/${order.orderId}/confirm`, 'POST', { note: '已核对' }, secondAdminCookie))

  assert.equal(first.status, 500)
  assert.equal(retry.status, 200)
  assert.equal((await harness.repository.getJson(`v1/orders/${order.orderId}.json`)).status, 'confirmed')
  assert.equal((await harness.repository.list(`v1/confirmed-orders-by-user/`)).length, 1)
  assert.equal((await harness.repository.list('v1/audit/by-operation/order-confirmed-')).length, 1)
  const auditKey = (await harness.repository.list('v1/audit/by-operation/order-confirmed-'))[0]
  assert.equal((await harness.repository.getJson(auditKey)).adminUsername, 'admin_one')
})

test('lets exactly one concurrent confirm-or-reject decision win', async () => {
  const harness = createHarness()
  const adminCookie = await loginAdmin(harness)
  await configurePayment(harness, adminCookie)
  const { cookie: userCookie } = await registerUser(harness, 'decision_race_user')
  const order = await createAndClaimMonthlyOrder(harness, userCookie)

  const [confirmed, rejected] = await Promise.all([
    harness.api(request(`/api/admin/orders/${order.orderId}/confirm`, 'POST', { note: '已核对', adminNote: '确认备注' }, adminCookie)),
    harness.api(request(`/api/admin/orders/${order.orderId}/reject`, 'POST', { note: '未查到流水', adminNote: '拒绝备注' }, adminCookie)),
  ])
  assert.deepEqual([confirmed.status, rejected.status].sort(), [200, 409])
  const stored = await harness.repository.getJson(`v1/orders/${order.orderId}.json`)
  const snapshot = await (await harness.api(request('/api/auth/me', 'GET', undefined, userCookie))).json()
  if (confirmed.status === 200) {
    assert.equal(stored.status, 'confirmed')
    assert.equal(snapshot.entitlement.phase, 'active_monthly')
  } else {
    assert.equal(stored.status, 'rejected')
    assert.equal(snapshot.entitlement.phase, 'trialing')
  }
})

test('never lets a rejection override a migrated legacy confirmation event', async () => {
  const harness = createHarness()
  const adminCookie = await loginAdmin(harness)
  const { cookie, user } = await registerUser(harness, 'legacy_confirm_user')
  const orderId = 'LEGACY-CONFIRMED-ORDER'
  await harness.repository.delete(`v1/migrations/confirmed-orders-by-user/${user.id}.json`)
  await harness.repository.setJson(`v1/orders/${orderId}.json`, {
    orderId, userId: user.id, username: user.username, plan: 'monthly', amountCny: 59, status: 'pending_review', createdAt: '2026-08-16T00:00:00.000Z',
  })
  await harness.repository.setJson(`v1/confirmed-orders/${orderId}.json`, {
    orderId, userId: user.id, plan: 'monthly', amountCny: 59, confirmedAt: '2026-08-17T00:00:00.000Z', confirmedBy: 'legacy-admin', confirmedByUsername: '历史管理员',
  })

  const rejected = await harness.api(request(`/api/admin/orders/${orderId}/reject`, 'POST', { note: '未查到流水' }, adminCookie))

  assert.equal(rejected.status, 409)
  assert.equal((await harness.repository.getJson(`v1/order-decisions/${orderId}.json`)).type, 'confirmed')
  assert.equal((await (await harness.api(request('/api/auth/me', 'GET', undefined, cookie))).json()).entitlement.phase, 'active_monthly')
})

test('rejects an order with an admin note and preserves no paid access', async () => {
  const harness = createHarness()
  const adminCookie = await loginAdmin(harness)
  await configurePayment(harness, adminCookie)
  const { cookie: userCookie } = await registerUser(harness)
  const order = await createAndClaimMonthlyOrder(harness, userCookie)

  const missingNote = await harness.api(request(`/api/admin/orders/${order.orderId}/reject`, 'POST', { note: '' }, adminCookie))
  assert.equal(missingNote.status, 400)
  const rejected = await harness.api(request(`/api/admin/orders/${order.orderId}/reject`, 'POST', {
    note: '未查询到对应流水', adminNote: '管理员已核对微信账单',
  }, adminCookie))

  assert.equal(rejected.status, 200)
  assert.equal((await rejected.json()).status, 'rejected')
  const snapshot = await (await harness.api(request('/api/auth/me', 'GET', undefined, userCookie))).json()
  assert.equal(snapshot.entitlement.phase, 'trialing')
  const ownOrder = (await (await harness.api(request('/api/orders/me', 'GET', undefined, userCookie))).json())[0]
  assert.equal(ownOrder.userMessage, '未查询到对应流水')
  assert.equal('adminNote' in ownOrder, false)
  assert.equal('reviewedBy' in ownOrder, false)
  const adminOrders = await (await harness.api(request('/api/admin/orders', 'GET', undefined, adminCookie))).json()
  assert.equal(adminOrders[0].adminNote, '管理员已核对微信账单')
})

test('blocks normal users from admin data and lets an admin suspend and reset a user', async () => {
  const harness = createHarness()
  const adminCookie = await loginAdmin(harness)
  const { cookie: userCookie, user } = await registerUser(harness)

  assert.equal((await harness.api(request('/api/admin/users', 'GET', undefined, userCookie))).status, 403)

  const users = await harness.api(request('/api/admin/users', 'GET', undefined, adminCookie))
  assert.equal(users.status, 200)
  assert.ok((await users.json()).some((item) => item.id === user.id))

  const reset = await harness.api(request(`/api/admin/users/${user.id}/reset-password`, 'POST', {}, adminCookie))
  const temporaryPassword = (await reset.json()).temporaryPassword
  assert.match(temporaryPassword, /^Ktb-[A-Za-z0-9_-]{40,}!$/)

  const suspended = await harness.api(request(`/api/admin/users/${user.id}/status`, 'POST', {
    status: 'suspended', note: '测试停用',
  }, adminCookie))
  assert.equal(suspended.status, 200)
  assert.equal((await harness.api(request('/api/auth/me', 'GET', undefined, userCookie))).status, 401)

  const audit = await harness.api(request('/api/admin/audit', 'GET', undefined, adminCookie))
  const actions = (await audit.json()).map((item) => item.action)
  assert.ok(actions.includes('user.password_reset'))
  assert.ok(actions.includes('user.status_changed'))
})

test('rejects suspended users in every protected API even when a session still exists', async () => {
  const harness = createHarness()
  const { cookie, user } = await registerUser(harness)
  const key = userKey(user.username)
  const stored = await harness.repository.getJson(key)
  await harness.repository.setJson(key, { ...stored, status: 'suspended' })

  const profile = await harness.api(request('/api/auth/me', 'GET', undefined, cookie))
  const protectedResponse = await harness.api(request('/api/orders/me', 'GET', undefined, cookie))

  assert.equal(profile.status, 200)
  assert.equal((await profile.json()).entitlement.phase, 'suspended')
  assert.equal(protectedResponse.status, 403)
  assert.deepEqual(await protectedResponse.json(), {
    error: 'ACCOUNT_SUSPENDED', message: '账号已停用，请联系客服',
  })
})

test('expires a reset password and requires a different permanent password', async () => {
  const harness = createHarness()
  const adminCookie = await loginAdmin(harness)
  const { user } = await registerUser(harness)
  const reset = await harness.api(request(`/api/admin/users/${user.id}/reset-password`, 'POST', {}, adminCookie))
  const temporaryPassword = (await reset.json()).temporaryPassword

  const temporaryLogin = await harness.api(request('/api/auth/login', 'POST', {
    username: user.username, password: temporaryPassword,
  }))
  assert.equal(temporaryLogin.status, 200)
  const unchanged = await harness.api(request('/api/auth/password', 'POST', {
    currentPassword: temporaryPassword, newPassword: temporaryPassword,
  }, cookieFrom(temporaryLogin)))
  assert.equal(unchanged.status, 400)

  harness.setNow('2026-08-18T00:00:01.000Z')
  const expired = await harness.api(request('/api/auth/login', 'POST', {
    username: user.username, password: temporaryPassword,
  }))
  assert.equal(expired.status, 403)
  assert.equal((await expired.json()).error, 'TEMP_PASSWORD_EXPIRED')
})

test('lets an administrator grant yearly, lifetime, or custom-day access', async () => {
  const harness = createHarness()
  const adminCookie = await loginAdmin(harness)
  const yearlyUser = await registerUser(harness, 'yearly_user')
  const lifetimeUser = await registerUser(harness, 'lifetime_user')
  const customUser = await registerUser(harness, 'custom_user')

  assert.equal((await harness.api(request(`/api/admin/users/${yearlyUser.user.id}/entitlement`, 'POST', { plan: 'yearly', idempotencyKey: 'yearly-operation-0001' }, adminCookie))).status, 200)
  assert.equal((await harness.api(request(`/api/admin/users/${lifetimeUser.user.id}/entitlement`, 'POST', { plan: 'lifetime', idempotencyKey: 'lifetime-operation-01' }, adminCookie))).status, 200)
  assert.equal((await harness.api(request(`/api/admin/users/${customUser.user.id}/entitlement`, 'POST', { days: 45, idempotencyKey: 'custom-days-operation-1' }, adminCookie))).status, 200)

  assert.equal((await (await harness.api(request('/api/auth/me', 'GET', undefined, yearlyUser.cookie))).json()).entitlement.phase, 'active_yearly')
  assert.equal((await (await harness.api(request('/api/auth/me', 'GET', undefined, lifetimeUser.cookie))).json()).entitlement.phase, 'active_lifetime')
  assert.equal((await (await harness.api(request('/api/auth/me', 'GET', undefined, customUser.cookie))).json()).entitlement.expiresAt, '2026-10-01T00:00:00.000Z')
})

test('does not extend access twice when an administrator retries the same grant operation', async () => {
  const harness = createHarness()
  const adminCookie = await loginAdmin(harness)
  const { cookie, user } = await registerUser(harness, 'retry_grant_user')
  const body = { plan: 'monthly', idempotencyKey: 'same-grant-operation-01' }

  assert.equal((await harness.api(request(`/api/admin/users/${user.id}/entitlement`, 'POST', body, adminCookie))).status, 200)
  assert.equal((await harness.api(request(`/api/admin/users/${user.id}/entitlement`, 'POST', body, adminCookie))).status, 200)

  const snapshot = await (await harness.api(request('/api/auth/me', 'GET', undefined, cookie))).json()
  assert.equal(snapshot.entitlement.expiresAt, '2026-09-16T00:00:00.000Z')
  assert.equal((await harness.repository.list(`v1/confirmed-orders-by-user/${user.id}/`)).length, 1)

  const conflicting = await harness.api(request(`/api/admin/users/${user.id}/entitlement`, 'POST', {
    plan: 'yearly', idempotencyKey: 'same-grant-operation-01',
  }, adminCookie))
  assert.equal(conflicting.status, 409)
})
