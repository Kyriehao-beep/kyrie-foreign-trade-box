import { cp, copyFile, mkdir } from 'node:fs/promises'

const output = new URL('../dist/edgeone/', import.meta.url)

await mkdir(output, { recursive: true })
await cp(new URL('../cloud-functions/', import.meta.url), new URL('cloud-functions/', output), { recursive: true })

await Promise.all([
  copyFile(new URL('../package.json', import.meta.url), new URL('package.json', output)),
  copyFile(new URL('../pnpm-lock.yaml', import.meta.url), new URL('pnpm-lock.yaml', output)),
  copyFile(new URL('../edgeone.json', import.meta.url), new URL('edgeone.json', output)),
])
