import { computeEntitlement } from './entitlements.js'
import { paidEntitlementForUser } from './confirmedOrders.js'
import { HttpError } from './http.js'
import {
  createSessionToken,
  hashPassword,
  hashToken,
  parseSessionCookie,
  verifyPassword,
} from './security.js'

const TRIAL_MS = 72 * 60 * 60 * 1000
const SESSION_MS = 7 * 24 * 60 * 60 * 1000
const USERNAME_PATTERN = /^[\p{L}\p{N}_-]{4,32}$/u
let dummyHashPromise

export function normalizeUsername(value) {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase('en-US') : ''
}

export function userKey(usernameNormalized) {
  return `v1/users/by-name/${hashToken(usernameNormalized)}.json`
}

export async function markFreshUserPartitions(repository, userId, createdAt) {
  await Promise.all([
    repository.setJson(`v1/migrations/confirmed-orders-by-user/${userId}.json`, { migratedAt: createdAt, source: 'new-user' }, { onlyIfNew: true }),
    repository.setJson(`v1/migrations/orders-by-user/${userId}.json`, { migratedAt: createdAt, source: 'new-user' }, { onlyIfNew: true }),
    repository.setJson(`v1/migrations/order-decisions-by-user/${userId}.json`, { migratedAt: createdAt, source: 'new-user' }, { onlyIfNew: true }),
  ])
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

function validPassword(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128
}

async function createSession(repository, user, now) {
  const token = createSessionToken()
  const tokenHash = hashToken(token)
  await repository.setJson(`v1/sessions/${tokenHash}.json`, {
    tokenHash,
    userId: user.id,
    usernameNormalized: user.usernameNormalized,
    createdAt: now,
    expiresAt: new Date(Date.parse(now) + SESSION_MS).toISOString(),
  })
  return token
}

async function invalidateUserSessions(repository, userId) {
  const keys = await repository.list('v1/sessions/')
  const sessions = await Promise.all(keys.map(async (key) => ({ key, value: await repository.getJson(key) })))
  await Promise.all(sessions.filter((item) => item.value?.userId === userId).map((item) => repository.delete(item.key)))
}

export function createAuthService({ repository, now, uuid }) {
  async function snapshot(user) {
    const paid = await paidEntitlementForUser(repository, user.id)
    return {
      user: publicUser(user),
      entitlement: computeEntitlement({ user, paid, now: now() }),
    }
  }

  async function currentUser(request) {
    const token = parseSessionCookie(request)
    if (!token) return null
    const key = `v1/sessions/${hashToken(token)}.json`
    const session = await repository.getJson(key)
    if (!session) return null
    if (Date.parse(session.expiresAt) <= Date.parse(now())) {
      await repository.delete(key)
      return null
    }
    return repository.getJson(userKey(session.usernameNormalized))
  }

  return {
    async register({ username, password, contact }) {
      const displayUsername = typeof username === 'string' ? username.trim() : ''
      const usernameNormalized = normalizeUsername(username)
      const cleanContact = typeof contact === 'string' ? contact.trim() : ''
      if (!USERNAME_PATTERN.test(displayUsername) || !validPassword(password) || cleanContact.length < 2 || cleanContact.length > 64) {
        throw new HttpError(400, 'INVALID_REGISTRATION', '请填写有效的用户名、密码和联系方式')
      }

      const createdAt = now()
      const user = {
        id: uuid(),
        username: displayUsername,
        usernameNormalized,
        displayName: displayUsername,
        contact: cleanContact,
        passwordHash: await hashPassword(password),
        role: 'user',
        status: 'active',
        passwordResetRequired: false,
        createdAt,
        trialEndsAt: new Date(Date.parse(createdAt) + TRIAL_MS).toISOString(),
      }

      try {
        await repository.setJson(userKey(usernameNormalized), user, { onlyIfNew: true })
      } catch (error) {
        if (error?.code === 'ALREADY_EXISTS') {
          throw new HttpError(409, 'USERNAME_TAKEN', '该用户名已被使用')
        }
        throw error
      }
      try {
        await markFreshUserPartitions(repository, user.id, createdAt)
      } catch {
        // Partition markers are an optimization; entitlement reads remain correct without them.
      }

      return { ...(await snapshot(user)), token: await createSession(repository, user, createdAt) }
    },

    async login({ username, password }) {
      const usernameNormalized = normalizeUsername(username)
      const user = await repository.getJson(userKey(usernameNormalized))
      const passwordHash = user?.passwordHash ?? await (dummyHashPromise ??= hashPassword('not-a-real-user-password'))
      const valid = validPassword(password) && await verifyPassword(password, passwordHash)
      if (!user || !valid) {
        throw new HttpError(401, 'INVALID_CREDENTIALS', '用户名或密码不正确')
      }
      if (user.status === 'suspended') {
        throw new HttpError(403, 'ACCOUNT_SUSPENDED', '账号已停用，请联系客服')
      }
      if (user.passwordResetRequired && user.temporaryPasswordExpiresAt && Date.parse(user.temporaryPasswordExpiresAt) <= Date.parse(now())) {
        throw new HttpError(403, 'TEMP_PASSWORD_EXPIRED', '临时密码已过期，请联系管理员重置')
      }
      const token = await createSession(repository, user, now())
      return { ...(await snapshot(user)), token }
    },

    async me(request) {
      const user = await currentUser(request)
      if (!user) throw new HttpError(401, 'AUTH_REQUIRED', '请先登录')
      return snapshot(user)
    },

    async logout(request) {
      const token = parseSessionCookie(request)
      if (token) await repository.delete(`v1/sessions/${hashToken(token)}.json`)
    },

    async changePassword(request, { currentPassword, newPassword }) {
      const user = await currentUser(request)
      if (!user) throw new HttpError(401, 'AUTH_REQUIRED', '请先登录')
      if (!validPassword(newPassword)) {
        throw new HttpError(400, 'INVALID_PASSWORD', '新密码至少需要 8 个字符')
      }
      if (!await verifyPassword(currentPassword, user.passwordHash)) {
        throw new HttpError(400, 'INVALID_CURRENT_PASSWORD', '当前密码不正确')
      }
      if (await verifyPassword(newPassword, user.passwordHash)) {
        throw new HttpError(400, 'PASSWORD_UNCHANGED', '新密码不能与当前密码相同')
      }

      const updated = { ...user, passwordHash: await hashPassword(newPassword), passwordResetRequired: false, temporaryPasswordExpiresAt: null }
      await repository.setJson(userKey(user.usernameNormalized), updated)
      await invalidateUserSessions(repository, user.id)
      const token = await createSession(repository, updated, now())
      return { ...(await snapshot(updated)), token }
    },

    currentUser,
  }
}
