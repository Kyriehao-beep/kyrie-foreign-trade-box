import puppeteer from 'puppeteer-core'
import { execSync } from 'node:child_process'

const BASE = 'http://localhost:4173/kyrie-foreign-trade-box'
const CHROME = execSync("ls -d /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome 2>/dev/null || which google-chrome || which chromium || echo ''").toString().trim()

const checks = []
const check = (name, pass, detail = '') => { checks.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' | ' + detail : ''}`) }

const browser = await puppeteer.launch({ executablePath: CHROME || undefined, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
const consoleErrors = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR ' + e.message))

// desktop
await page.setViewport({ width: 1440, height: 900 })
await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 30000 })
await new Promise((r) => setTimeout(r, 600))

// 1. new slogan present
const slogan = await page.evaluate(() => document.querySelector('h1')?.innerText || '')
check('新标语渲染', slogan.includes('把时间还给成交'), slogan.replace(/\n/g, ' '))

// 2. tool matrix + coming-soon card
const tools = await page.evaluate(() => ['外贸报价助手', '汇率换算器', '世界时间', 'AI 粘贴识别', '单据制作', '更多工具持续上线'].filter((t) => document.body.innerText.includes(t)))
check('工具矩阵 5 卡 + 持续上新卡', tools.length === 6, `found ${tools.length}`)

// 3. membership rewritten copy
const member = await page.evaluate(() => document.body.innerText)
check('会员文案改写', member.includes('按需订阅，工具持续上新') && member.includes('后续上线的新工具'), '')

// 4. CTA band
check('结尾 CTA 区', member.includes('把外贸生意里的琐碎，交给一个工作台'))

// 5. scroll-reveal: scroll through, all .reveal should get is-visible
for (let y = 0; y <= 1; y += 0.2) {
  await page.evaluate((f) => window.scrollTo(0, document.body.scrollHeight * f), y)
  await new Promise((r) => setTimeout(r, 250))
}
await new Promise((r) => setTimeout(r, 800))
const hidden = await page.evaluate(() => document.querySelectorAll('.reveal:not(.is-visible)').length)
check('滚动后元素全部揭示', hidden === 0, `hidden=${hidden}`)

// 6. console errors
check('无控制台报错', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' || '))

// 7. responsive 375 no horizontal scroll
await page.setViewport({ width: 375, height: 800 })
await page.reload({ waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 500))
const hScrollMobile = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
check('移动端 375 无横向滚动', hScrollMobile <= 1, `overflowX=${hScrollMobile}`)

// 8. responsive 1440 no horizontal scroll + hero 2-col implies wide
await page.setViewport({ width: 1440, height: 900 })
await page.reload({ waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 500))
const hScrollDesk = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
check('桌面端 1440 无横向滚动', hScrollDesk <= 1, `overflowX=${hScrollDesk}`)

await browser.close()
const passed = checks.filter((c) => c.pass).length
console.log(`\nE2E_RESULT ${passed}/${checks.length}`)
process.exit(passed === checks.length ? 0 : 1)
