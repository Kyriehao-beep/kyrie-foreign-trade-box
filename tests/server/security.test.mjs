import assert from 'node:assert/strict'
import test from 'node:test'
import { createBlobRepository } from '../../cloud-functions/_lib/blobRepository.js'
import { PreconditionFailedError } from '@edgeone/pages-blob'
import {
  createSessionToken,
  expiredSessionCookie,
  hashPassword,
  hashToken,
  parseSessionCookie,
  sessionCookie,
  verifyPassword,
} from '../../cloud-functions/_lib/security.js'
import { createMemoryRepository } from './memoryRepository.mjs'

test('verifies the right password and rejects another password', async () => {
  const encoded = await hashPassword('correct-horse-2026')

  assert.equal(await verifyPassword('correct-horse-2026', encoded), true)
  assert.equal(await verifyPassword('wrong-password', encoded), false)
  assert.notEqual(encoded, 'correct-horse-2026')
  assert.match(encoded, /^scrypt\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/)
})

test('rejects malformed password hashes without throwing', async () => {
  assert.equal(await verifyPassword('correct-horse-2026', 'invalid'), false)
  assert.equal(await verifyPassword('correct-horse-2026', 'scrypt$bad$bad'), false)
})

test('creates unique session tokens and stable token hashes', () => {
  const first = createSessionToken()
  const second = createSessionToken()

  assert.notEqual(first, second)
  assert.equal(hashToken(first), hashToken(first))
  assert.notEqual(hashToken(first), first)
})

test('creates a protected seven-day cookie and parses it', () => {
  const value = sessionCookie('token-value')

  assert.match(value, /^kyrie_session=token-value;/)
  assert.match(value, /HttpOnly/)
  assert.match(value, /Secure/)
  assert.match(value, /SameSite=Lax/)
  assert.match(value, /Max-Age=604800/)

  const request = new Request('https://example.com/api/auth/me', {
    headers: { cookie: 'other=one; kyrie_session=token-value; final=two' },
  })
  assert.equal(parseSessionCookie(request), 'token-value')
  assert.match(expiredSessionCookie(), /Max-Age=0/)
})

test('memory repository rejects a conflicting conditional write', async () => {
  const repository = createMemoryRepository()
  await repository.setJson('users/a', { id: 'first' }, { onlyIfNew: true })

  await assert.rejects(
    repository.setJson('users/a', { id: 'second' }, { onlyIfNew: true }),
    (error) => error.code === 'ALREADY_EXISTS',
  )
  assert.deepEqual(await repository.getJson('users/a'), { id: 'first' })
})

test('blob repository performs strong reads and forwards only-if-new writes', async () => {
  const calls = []
  const store = {
    async get(key, options) {
      calls.push(['get', key, options])
      return { id: 'user-1' }
    },
    async setJSON(key, value, options) {
      calls.push(['setJSON', key, value, options])
    },
    async set(key, value, options) {
      calls.push(['set', key, value, options])
    },
    async delete(key) {
      calls.push(['delete', key])
    },
    async list(options) {
      calls.push(['list', options])
      return { blobs: [{ key: 'users/a' }] }
    },
  }
  const repository = createBlobRepository(store)

  assert.deepEqual(await repository.getJson('users/a'), { id: 'user-1' })
  await repository.setJson('users/a', { id: 'user-2' }, { onlyIfNew: true })
  await repository.setBinary('payment-qr/wechat', new Uint8Array([1, 2]), { onlyIfNew: true })
  assert.deepEqual(await repository.list('users/'), ['users/a'])

  assert.deepEqual(calls, [
    ['get', 'users/a', { type: 'json', consistency: 'strong' }],
    ['setJSON', 'users/a', { id: 'user-2' }, { onlyIfNew: true }],
    ['set', 'payment-qr/wechat', new Uint8Array([1, 2]), { onlyIfNew: true }],
    ['list', { prefix: 'users/', consistency: 'strong' }],
  ])
})

test('blob repository normalizes EdgeOne conditional-write conflicts', async () => {
  const repository = createBlobRepository({
    async setJSON() { throw new PreconditionFailedError() },
  })

  await assert.rejects(
    repository.setJson('users/a', { id: 'duplicate' }, { onlyIfNew: true }),
    (error) => error.code === 'ALREADY_EXISTS',
  )
})
