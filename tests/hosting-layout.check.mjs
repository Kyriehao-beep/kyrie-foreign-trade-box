import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import test from 'node:test'

test('production build outputs the client SPA bundle', async () => {
  await access(new URL('../dist/client/index.html', import.meta.url))
  assert.ok(true)
})
