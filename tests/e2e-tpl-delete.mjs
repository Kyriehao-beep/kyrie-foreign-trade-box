import puppeteer from 'puppeteer-core'
import { execSync } from 'node:child_process'

const BASE = 'http://localhost:4173/kyrie-foreign-trade-box'
const CHROME = execSync("ls -d /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome 2>/dev/null || which google-chrome || which chromium || echo ''").toString().trim()

const checks = []
function check(name, pass, detail = '') { checks.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' | ' + detail : ''}`) }

const browser = await puppeteer.launch({ executablePath: CHROME || undefined, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
page.on('dialog', async (d) => { await d.accept() }) // auto-accept confirm()

// fresh context: clear templates + go to documents
await page.goto(BASE + '/documents', { waitUntil: 'networkidle2', timeout: 30000 })
await page.evaluate(() => localStorage.removeItem('kyrie-trade-box:v1:partyTemplates'))
await page.reload({ waitUntil: 'networkidle2' })
await page.waitForSelector('input[aria-label="卖方公司名称"]', { timeout: 15000 })

// type seller company name (native setter bypasses React value tracker)
await page.evaluate(() => {
  const el = document.querySelector('input[aria-label="卖方公司名称"]')
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(el, '测试贸易有限公司')
  el.dispatchEvent(new Event('input', { bubbles: true }))
})

// save as template
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('保存为模板'))
  btn.click()
})
await new Promise((r) => setTimeout(r, 500))

// open select-template dropdown
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('选择模板'))
  btn.click()
})
await new Promise((r) => setTimeout(r, 400))

// template should appear
const tmplVisible = await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === '测试贸易有限公司'))
check('保存后出现模板选项', tmplVisible)

// capture delete button aria-label then click
const deleted = await page.evaluate(() => {
  const del = [...document.querySelectorAll('button[aria-label^="删除模板"]')][0]
  if (!del) return false
  del.click()
  return true
})
await new Promise((r) => setTimeout(r, 600))
check('点击删除按钮', deleted)

// reopen dropdown, template gone
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('选择模板'))
  btn.click()
})
await new Promise((r) => setTimeout(r, 400))
const tmplGone = await page.evaluate(() => !([...document.querySelectorAll('button')].some((b) => b.textContent.trim() === '测试贸易有限公司')))
check('删除后模板不再出现', tmplGone)

// localStorage empty after delete
const lsEmpty = await page.evaluate(() => {
  const v = localStorage.getItem('kyrie-trade-box:v1:partyTemplates')
  if (!v) return true
  try { return JSON.parse(v).length === 0 } catch { return false }
})
check('localStorage 模板已清空', lsEmpty)

await browser.close()
const passed = checks.filter((c) => c.pass).length
console.log(`\nE2E_RESULT ${passed}/${checks.length}`)
process.exit(passed === checks.length ? 0 : 1)
