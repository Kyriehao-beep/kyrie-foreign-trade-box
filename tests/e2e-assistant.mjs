import puppeteer from 'puppeteer-core'
import { execSync } from 'child_process'

const BASE = 'http://localhost:4173/kyrie-foreign-trade-box/toolbox'

async function findBrowser() {
  try {
    const p = execSync('which chromium || which chrome || which google-chrome').toString().trim()
    return p
  } catch { /* */ }
  const paths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]
  for (const p of paths) {
    try { await puppeteer.launch({ executablePath: p, headless: true, args: ['--no-sandbox'] }); return p }
    catch { /* try next */ }
  }
  return null
}

async function main() {
  const browserPath = await findBrowser()
  if (!browserPath) { console.log('E2E_SKIP: no browser found'); process.exit(0) }

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message))

  // abort FX fetch so we control the rate
  await page.setRequestInterception(true)
  page.on('request', (req) => {
    if (req.url().includes('frankfurter')) req.abort()
    else req.continue()
  })

  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 })
  await page.waitForSelector('#quote-assistant', { timeout: 15000 })
  await new Promise((r) => setTimeout(r, 1200))

  // set FX rate manually
  await page.evaluate(() => {
    const input = document.querySelector('input[aria-label="汇率 USD-CNY"]')
    if (input) { input.value = '6.82'; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })) }
  })
  await new Promise((r) => setTimeout(r, 300))

  // set product name
  await page.evaluate(() => {
    const input = document.querySelector('input[aria-label="产品名称"]')
    if (input) { input.value = '加固镀铬钓鱼椅'; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })) }
  })

  // set distinctive values
  const fields = [
    ['input[aria-label="数量 / pos (pcs)"]', '100'],
    ['input[aria-label="当前/客户目标 USD (客户期望价)"]', '19.9'],
    ['input[aria-label="单件人民币成本 / RMB"]', '80'],
    ['input[aria-label="单件包装成本 / RMB"]', '4'],
    ['input[aria-label="国内杂费 / RMB (整单)"]', '500'],
    ['input[aria-label="国际运费 / RMB (整单)"]', '1800'],
    ['input[aria-label="国内运费 / RMB (整单)"]', '300'],
    ['input[aria-label="平台扣点 / %"]', '3'],
    ['input[aria-label="收款手续费 / %"]', '1'],
    ['input[aria-label="汇率风险 / % (预留跌幅)"]', '2'],
    ['input[aria-label="目标利润率 / %"]', '20'],
    ['input[aria-label="退税率 / % (可选填 0)"]', '0'],
  ]

  for (const [sel, val] of fields) {
    await page.evaluate(([s, v]) => {
      const el = document.querySelector(s)
      if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })) }
    }, [sel, val])
  }

  await new Promise((r) => setTimeout(r, 500))

  // --- CHECKS ---
  const checks = {}
  const profitText = await page.evaluate(() => document.querySelector('#quote-assistant')?.textContent ?? '')

  checks['assistant_mounted'] = !!(await page.$('#quote-assistant'))
  checks['has_profit_health'] = profitText.includes('利润健康')
  checks['has_customer_target'] = profitText.includes('客户目标')
  checks['has_listing_price'] = profitText.includes('目标标调价')
  checks['has_cost_breakdown'] = profitText.includes('费用明细')
  checks['has_total_cost'] = profitText.includes('总成本')
  checks['has_sales_copy'] = profitText.includes('报价话术')
  checks['has_pi_button'] = profitText.includes('生成 PI')
  checks['has_image_upload'] = profitText.includes('上传图片')

  // extract computed values
  const results = await page.evaluate(() => {
    const text = document.querySelector('#quote-assistant')?.textContent ?? ''
    const usdMatch = text.match(/\$[\d,]+\.\d{2}/g)
    const cnyMatch = text.match(/¥[\d,]+\.\d{2}/g)
    return { usdValues: usdMatch || [], cnyValues: cnyMatch || [] }
  })

  console.log('USD values found:', results.usdValues.slice(0, 6))
  console.log('CNY values found:', results.cnyValues.slice(0, 6))

  console.log('--- CHECKS ---')
  let allPass = true
  Object.entries(checks).forEach(([k, v]) => {
    console.log(v ? `PASS ${k}` : `FAIL ${k}`)
    if (!v) allPass = false
  })

  // Test sales copy expand - click by text content
  const buttons = await page.$$('button')
  let clicked = false
  for (const btn of buttons) {
    const text = await page.evaluate((el) => el.textContent, btn)
    if (text?.includes('报价话术')) { await btn.click(); clicked = true; break }
  }
  if (clicked) { await new Promise((r) => setTimeout(r, 500)) }
  const copyVisible = !!(await page.$('pre'))
  console.log(copyVisible ? 'PASS sales_copy_expandable' : 'FAIL sales_copy_expandable')
  if (!copyVisible) allPass = false

  console.log(allPass ? '\nE2E_PASS' : '\nE2E_FAIL')

  await browser.close()
  process.exit(allPass ? 0 : 1)
}

main().catch((e) => { console.error('E2E_CRASH:', e.message); process.exit(2) })
