import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const ROOT = path.resolve('dist/client')
const BASE = '/kyrie-foreign-trade-box'
const PORT = 4173
const BASE_URL = `http://localhost:${PORT}${BASE}`
const results = []
function check(name, cond, extra = '') { results.push({ name, pass: !!cond, extra }); console.log(`${cond ? 'PASS' : 'FAIL'} - ${name}${extra ? ' :: ' + extra : ''}`) }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' }
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0])
  if (urlPath.startsWith(BASE)) urlPath = urlPath.slice(BASE.length) || '/'
  let filePath = path.join(ROOT, urlPath)
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const asDir = path.join(ROOT, urlPath, 'index.html')
    if (fs.existsSync(asDir)) filePath = asDir
    else filePath = path.join(ROOT, 'index.html') // SPA fallback (mirrors GitHub Pages 404.html)
  }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' })
    res.end(data)
  })
})
await new Promise((r) => server.listen(PORT, r))

const browserPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await puppeteer.launch({ executablePath: browserPath, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] })
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await page.setRequestInterception(true)
page.on('request', (req) => {
  if (req.url().includes('frankfurter')) req.abort()
  else req.continue()
})

function clickByText(text) {
  return page.evaluate((t) => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(t))
    if (btn) { btn.click(); return true }
    return false
  }, text)
}

// 进入跟单助手，清空本地数据，保证测试可重复
await page.goto(BASE_URL + '/follow-up', { waitUntil: 'networkidle2' })
await page.waitForSelector('main', { timeout: 15000 })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle2' })
await page.waitForSelector('main', { timeout: 15000 })
await new Promise((r) => setTimeout(r, 400))

// ---- A. 页面渲染 + 空状态 ----
const home = await page.evaluate(() => document.body.innerText)
check('跟单助手页面标题渲染', home.includes('跟单助手') && home.includes('把谈成的客户'))
check('空状态显示新增入口', home.includes('新增跟单'))
check('空状态统计为 0', home.includes('客户总数') && /\b0\b/.test(home))

// ---- B. 新增一条跟单 ----
await clickByText('新增跟单')
await new Promise((r) => setTimeout(r, 300))
await page.type('input[aria-label="客户公司名称"]', '测试客户A')
await page.type('input[aria-label="国家地区"]', '中国')
await clickByText('创建跟单')
await new Promise((r) => setTimeout(r, 400))
const afterAdd = await page.evaluate(() => document.body.innerText)
check('新增后卡片出现客户名', afterAdd.includes('测试客户A'))
check('新增后默认阶段为洽谈', afterAdd.includes('洽谈'))

// ---- C. 统计变为 1 ----
const stats1 = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('main p')]
  const total = cards.find((p) => p.textContent.includes('客户总数'))
  return total ? total.parentElement?.querySelector('p:nth-child(2)')?.textContent : ''
})
check('统计客户总数为 1', stats1.trim() === '1', `value=${stats1}`)

// ---- D. 联动出向：单据 → 跟单助手 ----
await page.goto(BASE_URL + '/documents', { waitUntil: 'networkidle2' })
await page.waitForSelector('input[aria-label^="买方公司名称"]', { timeout: 15000 })
await page.type('input[aria-label^="买方公司名称"]', '联动客户B')
await new Promise((r) => setTimeout(r, 300))
await clickByText('加入跟单助手')
await new Promise((r) => setTimeout(r, 400))
await page.goto(BASE_URL + '/follow-up', { waitUntil: 'networkidle2' })
await page.waitForSelector('main', { timeout: 15000 })
await new Promise((r) => setTimeout(r, 400))
const afterLink = await page.evaluate(() => document.body.innerText)
check('出向联动：跟单助手出现联动客户B', afterLink.includes('联动客户B'))
check('出向联动：阶段为已报价（来自单据）', afterLink.includes('已报价'))

// ---- E. 联动入向：跟单助手 → 单据（回填买方） ----
// 找到联动客户B卡片的「新建单据」
const clickedNew = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('li')]
  const card = cards.find((li) => li.textContent.includes('联动客户B'))
  if (!card) return false
  const btn = [...card.querySelectorAll('button')].find((b) => b.textContent.includes('新建单据'))
  if (btn) { btn.click(); return true }
  return false
})
check('找到并点击联动客户B的「新建单据」', clickedNew)
await page.waitForSelector('input[aria-label^="买方公司名称"]', { timeout: 15000 })
await new Promise((r) => setTimeout(r, 500))
const prefilled = await page.evaluate(() => {
  const input = document.querySelector('input[aria-label^="买方公司名称"]')
  return { value: input ? input.value : '', noParam: !window.location.search.includes('followup') }
})
check('入向联动：单据买方被回填', prefilled.value.includes('联动客户B'), `value=${prefilled.value}`)
check('入向联动：URL 参数已清除', prefilled.noParam)

// ---- F. AI 面板在未配置代理时禁用 + 手动兜底可用 ----
const aiState = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  const oneClick = btns.find((b) => b.textContent.includes('AI 一键识别并填单'))
  const note = document.body.innerText.includes('AI 识别由站长统一开启')
  const manual = btns.find((b) => b.textContent.includes('手动'))
  return { disabled: oneClick ? oneClick.disabled : null, note, hasManual: !!manual }
})
check('未配置代理时一键识别按钮禁用', aiState.disabled === true)
check('未配置代理时显示站长开启提示', aiState.note)
check('未配置代理时仍提供手动方式', aiState.hasManual)

await browser.close()
server.close()
const failed = results.filter((r) => !r.pass)
console.log(`\nRESULTS: ${results.length - failed.length}/${results.length} passed`)
console.log(failed.length === 0 ? 'E2E_PASS' : 'E2E_FAIL')
process.exit(failed.length === 0 ? 0 : 1)
