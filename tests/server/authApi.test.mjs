import assert from 'node:assert/strict'
import test from 'node:test'
import { createApi } from '../../cloud-functions/_lib/api.js'
import { createMemoryRepository } from './memoryRepository.mjs'

const ORIGIN = 'https://kyrie.edgeone.app'

function jsonRequest(path, method, body, cookie, origin = ORIGIN) {
  const headers = { 'content-type': 'application/json', origin }
  if (cookie) headers.cookie = cookie
  return new Request(`${ORIGIN}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function getRequest(path, cookie) {
  return new Request(`${ORIGIN}${path}`, { headers: cookie ? { cookie } : undefined })
}

function cookieFrom(response) {
  return response.headers.get('set-cookie')?.split(';')[0] ?? ''
}

function createHarness(options = {}) {
  const repository = options.repository ?? createMemoryRepository()
  let sequence = 0
  let currentTime = options.now ?? '2026-08-17T00:00:00.000Z'
  const api = createApi({
    repository,
    env: options.env ?? {},
    now: () => currentTime,
    uuid: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
  })

  return {
    repository,
    api: (request, clientIp = '203.0.113.8') => api(request, { clientIp }),
    setNow(value) {
      currentTime = value
    },
  }
}

async function register(harness, overrides = {}, clientIp) {
  return harness.api(jsonRequest('/api/auth/register', 'POST', {
    username: 'KyrieUser',
    password: 'secure-pass-2026',
    contact: 'kyrie_wechat',
    ...overrides,
  }), clientIp)
}

test('registers a user with one server-side 72 hour trial', async () => {
  const harness = createHarness()
  const response = await register(harness)

  assert.equal(response.status, 201)
  const body = await response.json()
  assert.equal(body.user.username, 'KyrieUser')
  assert.equal(body.entitlement.phase, 'trialing')
  assert.equal(body.entitlement.trialEndsAt, '2026-08-20T00:00:00.000Z')
  assert.match(response.headers.get('set-cookie'), /kyrie_session=/)

  const storedUsers = await harness.repository.list('v1/users/by-name/')
  assert.equal(storedUsers.length, 1)
  const stored = await harness.repository.getJson(storedUsers[0])
  assert.notEqual(stored.passwordHash, 'secure-pass-2026')
})

test('rejects a duplicate username without changing case semantics', async () => {
  const harness = createHarness()
  assert.equal((await register(harness)).status, 201)

  const duplicate = await register(harness, { username: '  kyrieuser  ' })

  assert.equal(duplicate.status, 409)
  assert.deepEqual(await duplicate.json(), { error: 'USERNAME_TAKEN', message: '该用户名已被使用' })
  assert.equal((await harness.repository.list('v1/migrations/confirmed-orders-by-user/')).length, 1)
  assert.equal((await harness.repository.list('v1/migrations/orders-by-user/')).length, 1)
  assert.equal((await harness.repository.list('v1/migrations/order-decisions-by-user/')).length, 1)
})

test('validates public registration fields in Chinese', async () => {
  const harness = createHarness()
  const response = await register(harness, { username: 'a', password: 'short', contact: '' })

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    error: 'INVALID_REGISTRATION',
    message: '请填写有效的用户名、密码和联系方式',
  })
})

test('requires same-origin writes', async () => {
  const harness = createHarness()
  const response = await harness.api(jsonRequest('/api/auth/register', 'POST', {
    username: 'KyrieUser', password: 'secure-pass-2026', contact: 'wechat',
  }, undefined, 'https://attacker.example'))

  assert.equal(response.status, 403)
  assert.deepEqual(await response.json(), { error: 'INVALID_ORIGIN', message: '请求来源无效，请刷新页面后重试' })
})

test('returns the same public error for missing users and wrong passwords', async () => {
  const harness = createHarness()
  await register(harness)

  const missing = await harness.api(jsonRequest('/api/auth/login', 'POST', {
    username: 'missing-user', password: 'bad-pass-2026',
  }))
  const wrong = await harness.api(jsonRequest('/api/auth/login', 'POST', {
    username: 'KyrieUser', password: 'bad-pass-2026',
  }))

  assert.equal(missing.status, 401)
  assert.equal(wrong.status, 401)
  assert.deepEqual(await missing.json(), await wrong.json())
})

test('returns the current account from a valid cookie and expires it server-side', async () => {
  const harness = createHarness()
  const registration = await register(harness)
  const cookie = cookieFrom(registration)

  const active = await harness.api(getRequest('/api/auth/me', cookie))
  assert.equal(active.status, 200)
  assert.equal((await active.json()).entitlement.phase, 'trialing')

  harness.setNow('2026-08-24T00:00:01.000Z')
  const expiredSession = await harness.api(getRequest('/api/auth/me', cookie))
  assert.equal(expiredSession.status, 401)
})

test('marks fresh accounts as migrated without scanning legacy global data', async () => {
  const harness = createHarness()
  const originalList = harness.repository.list
  const listedPrefixes = []
  harness.repository.list = async (prefix) => {
    listedPrefixes.push(prefix)
    return originalList(prefix)
  }

  const response = await register(harness)

  assert.equal(response.status, 201)
  assert.equal(listedPrefixes.includes('v1/confirmed-orders/'), false)
  assert.equal(listedPrefixes.includes('v1/orders/'), false)
})

test('migrates legacy entitlement events once and then reads only the current user prefix', async () => {
  const harness = createHarness()
  const registration = await register(harness)
  const cookie = cookieFrom(registration)
  const registered = await registration.clone().json()
  await harness.repository.setJson('v1/confirmed-orders/legacy-order.json', {
    orderId: 'legacy-order', userId: registered.user.id, plan: 'monthly', confirmedAt: '2026-08-18T00:00:00.000Z',
  })
  await harness.repository.delete(`v1/migrations/confirmed-orders-by-user/${registered.user.id}.json`)
  await harness.repository.delete(`v1/migrations/order-decisions-by-user/${registered.user.id}.json`)
  const originalList = harness.repository.list
  const listedPrefixes = []
  harness.repository.list = async (prefix) => {
    listedPrefixes.push(prefix)
    return originalList(prefix)
  }

  harness.setNow('2026-08-21T00:00:00.000Z')
  const migrated = await harness.api(getRequest('/api/auth/me', cookie))
  assert.equal(migrated.status, 200)
  assert.equal((await migrated.json()).entitlement.phase, 'active_monthly')
  assert.ok(await harness.repository.getJson(`v1/confirmed-orders-by-user/${registered.user.id}/legacy-order.json`))
  assert.ok(await harness.repository.getJson('v1/order-decisions/legacy-order.json'))
  assert.ok(listedPrefixes.includes('v1/confirmed-orders/'))

  listedPrefixes.length = 0
  const originalSetJson = harness.repository.setJson
  let decisionWrites = 0
  harness.repository.setJson = async (key, value, options) => {
    if (key.startsWith('v1/order-decisions/')) decisionWrites += 1
    return originalSetJson(key, value, options)
  }
  assert.equal((await harness.api(getRequest('/api/auth/me', cookie))).status, 200)
  assert.ok(listedPrefixes.some((prefix) => prefix.startsWith('v1/confirmed-orders-by-user/')))
  assert.equal(listedPrefixes.includes('v1/confirmed-orders/'), false)
  assert.equal(decisionWrites, 0)
})

test('logs out by deleting the session and expiring the cookie', async () => {
  const harness = createHarness()
  const cookie = cookieFrom(await register(harness))

  const logout = await harness.api(jsonRequest('/api/auth/logout', 'POST', undefined, cookie))
  assert.equal(logout.status, 204)
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/)
  assert.equal((await harness.api(getRequest('/api/auth/me', cookie))).status, 401)
})

test('changing a password invalidates other sessions and returns a new session', async () => {
  const harness = createHarness()
  const firstCookie = cookieFrom(await register(harness))
  const secondLogin = await harness.api(jsonRequest('/api/auth/login', 'POST', {
    username: 'KyrieUser', password: 'secure-pass-2026',
  }))
  const secondCookie = cookieFrom(secondLogin)

  const change = await harness.api(jsonRequest('/api/auth/password', 'POST', {
    currentPassword: 'secure-pass-2026', newPassword: 'new-secure-pass-2026',
  }, firstCookie))
  const replacementCookie = cookieFrom(change)

  assert.equal(change.status, 200)
  assert.notEqual(replacementCookie, firstCookie)
  assert.equal((await harness.api(getRequest('/api/auth/me', firstCookie))).status, 401)
  assert.equal((await harness.api(getRequest('/api/auth/me', secondCookie))).status, 401)
  assert.equal((await harness.api(getRequest('/api/auth/me', replacementCookie))).status, 200)
})

test('does not accept the current password as the replacement password', async () => {
  const harness = createHarness()
  const cookie = cookieFrom(await register(harness))

  const response = await harness.api(jsonRequest('/api/auth/password', 'POST', {
    currentPassword: 'secure-pass-2026', newPassword: 'secure-pass-2026',
  }, cookie))

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    error: 'PASSWORD_UNCHANGED', message: '新密码不能与当前密码相同',
  })
})

test('rate limits repeated password-change attempts per user and IP', async () => {
  const harness = createHarness()
  const cookie = cookieFrom(await register(harness))
  for (let index = 0; index < 10; index += 1) {
    const response = await harness.api(jsonRequest('/api/auth/password', 'POST', {
      currentPassword: 'wrong-password', newPassword: 'new-secure-pass-2026',
    }, cookie), '198.51.100.61')
    assert.equal(response.status, 400)
  }

  const limited = await harness.api(jsonRequest('/api/auth/password', 'POST', {
    currentPassword: 'wrong-password', newPassword: 'new-secure-pass-2026',
  }, cookie), '198.51.100.61')
  assert.equal(limited.status, 429)
})

test('limits registration attempts per IP and login failures per account and IP', async () => {
  const registrationHarness = createHarness()
  for (let index = 1; index <= 3; index += 1) {
    const response = await register(registrationHarness, { username: `user_${index}` }, '198.51.100.20')
    assert.equal(response.status, 201)
  }
  const registrationLimited = await register(registrationHarness, { username: 'user_4' }, '198.51.100.20')
  assert.equal(registrationLimited.status, 429)

  const loginHarness = createHarness()
  for (let index = 0; index < 5; index += 1) {
    const response = await loginHarness.api(jsonRequest('/api/auth/login', 'POST', {
      username: 'missing', password: 'bad-pass-2026',
    }), '198.51.100.21')
    assert.equal(response.status, 401)
  }
  const loginLimited = await loginHarness.api(jsonRequest('/api/auth/login', 'POST', {
    username: 'missing', password: 'bad-pass-2026',
  }), '198.51.100.21')
  assert.equal(loginLimited.status, 429)
})

test('does not count successful logins as failed attempts', async () => {
  const harness = createHarness()
  await register(harness)
  for (let index = 0; index < 6; index += 1) {
    const response = await harness.api(jsonRequest('/api/auth/login', 'POST', {
      username: 'KyrieUser', password: 'secure-pass-2026',
    }), '198.51.100.44')
    assert.equal(response.status, 200)
  }
})

test('rejects non-object JSON bodies with a public validation error', async () => {
  const harness = createHarness()
  const response = await harness.api(jsonRequest('/api/auth/register', 'POST', null))

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: 'INVALID_JSON', message: '请求内容格式错误' })
})

test('initializes up to three admins from environment settings', async () => {
  const harness = createHarness({
    env: {
      ADMIN_1_USERNAME: 'admin_one', ADMIN_1_PASSWORD: 'admin-pass-one', ADMIN_1_DISPLAY_NAME: '管理员一',
      ADMIN_2_USERNAME: 'admin_two', ADMIN_2_PASSWORD: 'admin-pass-two', ADMIN_2_DISPLAY_NAME: '管理员二',
      ADMIN_3_USERNAME: 'admin_three', ADMIN_3_PASSWORD: 'admin-pass-three', ADMIN_3_DISPLAY_NAME: '管理员三',
    },
  })

  await harness.api(getRequest('/api/auth/me'))
  const response = await harness.api(jsonRequest('/api/auth/login', 'POST', {
    username: 'admin_two', password: 'admin-pass-two',
  }))
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(body.user.role, 'admin')
  assert.equal(body.user.displayName, '管理员二')
  assert.equal(body.user.passwordResetRequired, true)
  assert.equal((await harness.repository.list('v1/users/by-name/')).length, 3)
})

test('expires an unused administrator bootstrap password', async () => {
  const harness = createHarness({
    env: { ADMIN_1_USERNAME: 'admin_one', ADMIN_1_PASSWORD: 'admin-pass-one' },
  })
  await harness.api(getRequest('/api/auth/me'))
  harness.setNow('2026-08-25T00:00:01.000Z')

  const response = await harness.api(jsonRequest('/api/auth/login', 'POST', {
    username: 'admin_one', password: 'admin-pass-one',
  }))

  assert.equal(response.status, 403)
  assert.deepEqual(await response.json(), {
    error: 'TEMP_PASSWORD_EXPIRED', message: '临时密码已过期，请联系管理员重置',
  })
})
