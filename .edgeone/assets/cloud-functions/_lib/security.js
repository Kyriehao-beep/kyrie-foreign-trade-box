import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const SESSION_COOKIE = 'kyrie_session'
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const derived = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`
}

export async function verifyPassword(password, encoded) {
  if (typeof encoded !== 'string') return false
  const [algorithm, saltValue, hashValue, extra] = encoded.split('$')
  if (algorithm !== 'scrypt' || !saltValue || !hashValue || extra !== undefined) return false

  try {
    const expected = Buffer.from(hashValue, 'base64url')
    if (expected.length !== 64) return false
    const actual = Buffer.from(await scrypt(password, Buffer.from(saltValue, 'base64url'), expected.length))
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

export function createSessionToken() {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function parseSessionCookie(request) {
  const cookieHeader = request.headers.get('cookie') ?? ''
  for (const item of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = item.trim().split('=')
    if (rawName === SESSION_COOKIE) return decodeURIComponent(rawValue.join('='))
  }
  return null
}

export function sessionCookie(token) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`
}

export function expiredSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
}
