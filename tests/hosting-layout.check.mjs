import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import test from 'node:test'

test('production build uses the Sites client and server layout', async () => {
  await access(new URL('../dist/client/index.html', import.meta.url))
  await access(new URL('../dist/server/index.js', import.meta.url))
  assert.ok(true)
})
