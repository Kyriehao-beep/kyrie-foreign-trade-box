import fs from 'node:fs'
import path from 'node:path'

// GitHub Pages 是静态托管，SPA（客户端路由）在刷新/直接访问
// 深层路由（如 /kyrie-foreign-trade-box/documents）时会 404。
// 复制 index.html -> 404.html 让未知路由都回退到 SPA 外壳，
// 由 react-router 的 basename 接管渲染。
const clientDir = path.resolve('dist/client')
const indexHtml = path.join(clientDir, 'index.html')
const notFoundHtml = path.join(clientDir, '404.html')

if (!fs.existsSync(indexHtml)) {
  console.error('copy-404: dist/client/index.html 不存在，请先执行 vite build')
  process.exit(1)
}
fs.copyFileSync(indexHtml, notFoundHtml)
console.log('copy-404: 已生成 dist/client/404.html (SPA 回退外壳)')
