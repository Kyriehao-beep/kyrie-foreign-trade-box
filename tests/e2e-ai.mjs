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

// 用 evaluateOnNewDocument 注入 fetch 桩：该脚本在每次新文档（含 reload）前执行，
// 因此能跨 reload 存活，确保一键识别走桩返回而非真实网络。
const STUB_PAYLOAD = {
  buyer: { companyName: '北辰户外用品有限公司', country: '中国' },
  items: [{ name: '硅胶徽章', quantity: 500, unit: '个', unitPrice: 2.8, currency: '美元' }],
  trade: { incoterm: 'FOB 深圳', paymentTerm: '见提单副本付清' },
}

const browserPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await puppeteer.launch({ executablePath: browserPath, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] })
const page = await browser.newPage()
// 用 evaluateOnNewDocument 注入 fetch 桩：该脚本在每次新文档（含 reload）前执行，
// 因此能跨 reload 存活，确保一键识别走桩返回而非真实网络。
await page.evaluateOnNewDocument((payload) => {
  const orig = window.fetch ? window.fetch.bind(window) : null
  const stubResponse = { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }) }
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input && input.url)
    if (url && url.includes('chat/completions')) return stubResponse
    return orig ? orig(input, init) : new Response('{}')
  }
}, STUB_PAYLOAD)
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
// 放行本地资源，仅拦截已知的外部汇率接口（frankfurter），使 networkidle2 可达
await page.setRequestInterception(true)
page.on('request', (req) => {
  if (req.url().includes('frankfurter')) req.abort()
  else req.continue()
})

await page.goto(BASE_URL + '/documents', { waitUntil: 'networkidle2' })
await page.waitForSelector('section', { timeout: 15000 })
await new Promise((r) => setTimeout(r, 500))

// ---- Test 1: no config -> settings form visible, one-click disabled, hint shown ----
const initial = await page.evaluate(() => {
  const body = document.body.innerText
  return {
    hasSettingsForm: body.includes('AI 服务设置'),
    hasFreeHint: body.includes('免费额度') || body.includes('极便宜') || body.includes('免费模型'),
    oneClickDisabled: !!document.querySelector('button[disabled]') && body.includes('AI 一键识别并填单'),
    securityNote: body.includes('仅保存在你本机浏览器'),
  }
})
check('未配置时展示 AI 设置表单', initial.hasSettingsForm)
check('设置表单展示低成本/免费额度说明', initial.hasFreeHint)
check('未配置时一键识别按钮禁用', initial.oneClickDisabled)
check('设置表单含密钥安全说明', initial.securityNote)

// ---- Test 2: one-click flow with stubbed fetch (injected via evaluateOnNewDocument) ----
await page.evaluate(() => {
  localStorage.setItem('ktb_ai_config', JSON.stringify({
    providerId: 'siliconflow',
    apiKey: 'test-key',
    model: 'Qwen/Qwen2.5-7B-Instruct',
  }))
})
await page.reload({ waitUntil: 'networkidle2' })
await page.waitForSelector('section', { timeout: 15000 })
await new Promise((r) => setTimeout(r, 500))

const panel = await page.evaluate(() => {
  const ta = document.querySelector('textarea[aria-label="待识别的外贸资料"]')
  return { hasTextarea: !!ta }
})
check('识别面板含资料输入框', panel.hasTextarea)

await page.type('textarea[aria-label="待识别的外贸资料"]', '客户：北辰户外用品有限公司，500个硅胶徽章，单价2.80美元，FOB深圳，见提单副本付清。')
const clicked = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('AI 一键识别并填单'))
  if (btn) { btn.click(); return true }
  return false
})
check('找到并点击「AI 一键识别并填单」', clicked)
await new Promise((r) => setTimeout(r, 800))

const filled = await page.evaluate(() => {
  const get = (label) => {
    const inputs = [...document.querySelectorAll('input')]
    const el = inputs.find((i) => (i.getAttribute('aria-label') || '').startsWith(label))
    return el ? el.value : ''
  }
  return {
    buyer: get('买方公司名称'),
    incoterm: get('贸易术语'),
    payment: get('付款方式'),
    reviewBadge: document.body.innerText.includes('请人工核对'),
  }
})
check('一键识别后买方公司名称被填充', filled.buyer.includes('北辰'), `buyer=${filled.buyer}`)
check('一键识别后贸易术语被填充', filled.incoterm.includes('FOB'), `incoterm=${filled.incoterm}`)
check('一键识别后付款方式被填充', filled.payment.includes('提单'), `payment=${filled.payment}`)
check('识别后展示待人工核对提示', filled.reviewBadge)

// ---- Test 3: manual fallback (no config, paste JSON) ----
await page.evaluate(() => { localStorage.removeItem('ktb_ai_config') })
await page.reload({ waitUntil: 'networkidle2' })
await page.waitForSelector('section', { timeout: 15000 })
await new Promise((r) => setTimeout(r, 400))
const openedManual = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('手动'))
  if (btn) { btn.click(); return true }
  return false
})
check('可展开手动方式', openedManual)
await new Promise((r) => setTimeout(r, 300))
await page.type('textarea[aria-label="AI 返回的 JSON 结果"]', JSON.stringify({
  buyer: { companyName: '手动测试客户' },
  items: [{ name: '测试品', quantity: 10, unit: '件', unitPrice: 5, currency: '美元' }],
}))
const manualClicked = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('解析并填单'))
  if (btn) { btn.click(); return true }
  return false
})
check('找到并点击「解析并填单」', manualClicked)
await new Promise((r) => setTimeout(r, 600))
const manualFilled = await page.evaluate(() => {
  const inputs = [...document.querySelectorAll('input')]
  const el = inputs.find((i) => (i.getAttribute('aria-label') || '').startsWith('买方公司名称'))
  return el ? el.value : ''
})
check('手动粘贴 JSON 后也能填单', manualFilled.includes('手动测试客户'), `buyer=${manualFilled}`)

await browser.close()
server.close()
const failed = results.filter((r) => !r.pass)
console.log(`\nRESULTS: ${results.length - failed.length}/${results.length} passed`)
console.log(failed.length === 0 ? 'E2E_PASS' : 'E2E_FAIL')
process.exit(failed.length === 0 ? 0 : 1)
