import { cp, copyFile, mkdir, access } from 'node:fs/promises'

const output = new URL('../dist/edgeone/', import.meta.url)

await mkdir(output, { recursive: true })
await cp(new URL('../cloud-functions/', import.meta.url), new URL('cloud-functions/', output), { recursive: true })

// 复制 Edge Functions（AI 代理等），目录不存在时跳过
try {
  await access(new URL('../edge-functions/', import.meta.url))
  await cp(new URL('../edge-functions/', import.meta.url), new URL('edge-functions/', output), { recursive: true })
} catch {
  /* 无 edge-functions 时忽略 */
}

await Promise.all([
  copyFile(new URL('../package.json', import.meta.url), new URL('package.json', output)),
  copyFile(new URL('../pnpm-lock.yaml', import.meta.url), new URL('pnpm-lock.yaml', output)),
  copyFile(new URL('../edgeone.json', import.meta.url), new URL('edgeone.json', output)),
])
