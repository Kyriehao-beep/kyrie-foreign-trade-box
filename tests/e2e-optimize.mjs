import puppeteer from 'puppeteer-core'
import { execSync } from 'child_process'
import fs from 'fs'

const BASE = 'http://localhost:4173/kyrie-foreign-trade-box'
const results = []
function check(name, cond, extra = '') { results.push({ name, pass: !!cond, extra }); console.log(`${cond ? 'PASS' : 'FAIL'} - ${name}${extra ? ' :: ' + extra : ''}`) }

async function findBrowser() {
  try { const p = execSync('which chromium || which chrome || which google-chrome').toString().trim(); if (p) return p } catch {}
  for (const p of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium']) {
    try { await puppeteer.launch({ executablePath: p, headless: true, args: ['--no-sandbox'] }); return p } catch {}
  }
  return null
}

const browserPath = await findBrowser()
if (!browserPath) { console.log('E2E_SKIP: no browser'); process.exit(0) }

const browser = await puppeteer.launch({ executablePath: browserPath, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] })
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await page.setRequestInterception(true)
page.on('request', (req) => { if (req.url().includes('frankfurter')) req.abort(); else req.continue() })

// ---- Test A: WorldTimeBar hidden on home, shown on /quote ----
await page.goto(BASE + '/', { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 400))
const homeBar = await page.evaluate(() => document.querySelectorAll('[aria-label="选择显示的国家或地区时间"]').length)
check('WorldTimeBar 设置按钮在首页不存在', homeBar === 0, `count=${homeBar}`)

await page.goto(BASE + '/quote', { waitUntil: 'networkidle2' })
await page.waitForSelector('[aria-label="选择显示的国家或地区时间"]', { timeout: 15000 })
await new Promise((r) => setTimeout(r, 600))
const barInfo = await page.evaluate(() => {
  const body = document.body.innerText
  return { hasTokyoOrNy: body.includes('纽约') || body.includes('上海'), settingBtn: document.querySelectorAll('[aria-label="选择显示的国家或地区时间"]').length }
})
check('WorldTimeBar 出现在 /quote', barInfo.settingBtn === 1, `settingBtn=${barInfo.settingBtn}`)
check('WorldTimeBar 默认显示城市时间', barInfo.hasTokyoOrNy, `textHasCity=${barInfo.hasTokyoOrNy}`)

// ---- Test B: settings popover toggles + persists ----
await page.click('[aria-label="选择显示的国家或地区时间"]')
await new Promise((r) => setTimeout(r, 300))
// click a city not in default set: 东京
const toggled = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  const tokyo = btns.find((b) => b.textContent.trim() === '东京')
  if (tokyo) { tokyo.click(); return true }
  return false
})
await new Promise((r) => setTimeout(r, 300))
check('点击设置可打开城市选择并切换 东京', toggled)
// close popover + reload to verify persistence
await page.click('[aria-label="选择显示的国家或地区时间"]')
await new Promise((r) => setTimeout(r, 200))
await page.reload({ waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 600))
const persisted = await page.evaluate(() => {
  try { const raw = localStorage.getItem('ktb_worldbar_selection'); return raw ? JSON.parse(raw).includes('东京') : false } catch { return false }
})
check('城市选择持久化到 localStorage（东京）', persisted)

// ---- Test C: logo upload on /documents ----
await page.goto(BASE + '/documents', { waitUntil: 'networkidle2' })
await page.waitForSelector('input[aria-label="上传公司 Logo"]', { timeout: 15000 })
await new Promise((r) => setTimeout(r, 500))
const input = await page.$('input[aria-label="上传公司 Logo"]')
await input.uploadFile('/tmp/logo.png')
await page.waitForSelector('#document-print-area img[alt="公司 Logo"]', { timeout: 8000 })
const previewSrc = await page.evaluate(() => {
  const img = document.querySelector('#document-print-area img[alt="公司 Logo"]')
  return img ? img.getAttribute('src') : null
})
check('Logo 上传后在预览区显示', previewSrc && previewSrc.startsWith('data:image'), `srcStart=${previewSrc ? previewSrc.slice(0, 11) : 'null'}`)

await new Promise((r) => setTimeout(r, 800))
const pdfLogo = await page.evaluate(() => document.querySelectorAll('img.pdf-page__brand-logo').length)
check('Logo 出现在 PDF 导出模板抬头', pdfLogo > 0, `pdfLogoImgs=${pdfLogo}`)

const draftLogo = await page.evaluate(() => {
  try { const raw = localStorage.getItem('kyrie-trade-box:v1:draft:QT'); if (!raw) return false; const d = JSON.parse(raw); return typeof d.logo === 'string' && d.logo.startsWith('data:image') } catch { return false }
})
check('Logo 已存入草稿（localStorage）', draftLogo)

await browser.close()
const failed = results.filter((r) => !r.pass)
console.log(`\nRESULTS: ${results.length - failed.length}/${results.length} passed`)
console.log(failed.length === 0 ? 'E2E_PASS' : 'E2E_FAIL')
process.exit(failed.length === 0 ? 0 : 1)
