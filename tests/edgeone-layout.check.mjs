import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

test('EdgeOne build contains the SPA and cloud function entry', async () => {
  const root = new URL('../dist/edgeone/', import.meta.url)
  await Promise.all([
    access(new URL('index.html', root)),
    access(new URL('cloud-functions/api/[[default]].js', root)),
    access(new URL('package.json', root)),
    access(new URL('edgeone.json', root)),
  ])
  const config = JSON.parse(await readFile(new URL('edgeone.json', root), 'utf8'))
  assert.equal(config.nodeVersion, '20.18.0')
  assert.deepEqual(config.rewrites, [{ source: '/*', destination: '/index.html' }])
})
