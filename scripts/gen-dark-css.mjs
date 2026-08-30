// 生成 src/features/theme/dark.css —— 暗色模式覆盖层。
// 机制：扫描 src 下全部 .ts/.tsx，收集实际使用的 Tailwind 颜色工具类（含 hover:/focus-visible:/
// placeholder: 等变体前缀与 /透明度 后缀），在 .dark 作用域下用更高优先级选择器覆盖为暗色值。
// 这样无需逐个改 270+ 处硬编码颜色，降低回归风险。改色板请改本脚本后重跑：
//   node scripts/gen-dark-css.mjs
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'

const SRC = join(process.cwd(), 'src')
const OUT = join(SRC, 'features', 'theme', 'dark.css')

const files = []
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) walk(p)
    else if (['.ts', '.tsx'].includes(extname(p))) files.push(p)
  }
}
walk(SRC)

// 匹配带变体前缀 + 属性 + 颜色 + 透明度 的工具类 token
const TOKEN_RE =
  /\b((?:[a-z]+(?:-[a-z]+)*:)*)(bg|text|border|ring|divide|from|to|via|placeholder|outline|decoration|fill|stroke|caret)-((?:white|slate|zinc|gray|neutral|stone|brand|ink|paper|line|ocean|amber|emerald|rose|red|green|blue|yellow|orange|pink|purple|indigo|cyan|teal|lime|fuchsia|violet)(?:-\d{1,3})?)(?:\/(\d{1,3}))?\b/g

const found = new Map()
for (const f of files) {
  const text = readFileSync(f, 'utf8')
  let m
  TOKEN_RE.lastIndex = 0
  while ((m = TOKEN_RE.exec(text))) {
    const variant = m[1] || ''
    const prop = m[2]
    const color = m[3]
    const opacity = m[4] ? Number(m[4]) : null
    const full = variant + prop + '-' + color + (opacity != null ? '/' + opacity : '')
    if (!found.has(full)) found.set(full, { variant, prop, color, opacity })
  }
}

const SURFACE = { 50: '#18271f', 100: '#1d2d29', 200: '#253832', 300: '#2b3d38', 900: '#070f0e' }
const STEXT = { 300: '#9fb0ab', 400: '#8b9a95', 500: '#8e9e98', 600: '#aebdb8', 700: '#c6d2cd', 800: '#dbe5e1', 900: '#e9f1ee' }
const SBORDER = { 100: '#23342f', 200: '#2c3e39', 300: '#364a44', 900: '#2c3e39' }
const SURFACE_DARK = '#15231f'

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex)
  if (a == null) return `rgb(${r}, ${g}, ${b})`
  const alpha = Math.round((a / 100) * 1000) / 1000
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function resolve({ variant, prop, color, opacity }) {
  if (variant.includes('print:')) return null // 打印样式保持浅色，不被暗色覆盖
  const isPlaceholder = variant.includes('placeholder:')
  let cssProp
  let value
  if (color === 'white') {
    if (prop === 'text' || prop === 'border' || prop === 'ring' || prop === 'outline') return null
    if (opacity != null && opacity < 85) return null // 彩色背景上的白色叠层保留
    cssProp = 'background-color'
    value = rgba(SURFACE_DARK, opacity)
  } else if (color.startsWith('slate-')) {
    const n = Number(color.slice(6))
    if (['bg', 'from', 'to', 'via'].includes(prop)) {
      cssProp = 'background-color'
      value = rgba(SURFACE[n] || '#243732', opacity)
    } else if (prop === 'text') {
      cssProp = 'color'
      value = rgba(STEXT[n] || '#aebdb8', opacity)
    } else if (['border', 'divide'].includes(prop)) {
      cssProp = 'border-color'
      value = rgba(SBORDER[n] || '#2c3e39', opacity)
    } else return null
  } else if (color === 'brand-50' || color === 'brand-100') {
    const teal = color === 'brand-50' ? '#0f3a31' : '#0f352d'
    if (['bg', 'from', 'to', 'via'].includes(prop)) {
      cssProp = 'background-color'
      value = rgba(teal, opacity)
    } else if (prop === 'text') {
      cssProp = 'color'
      value = '#7fe0c4'
    } else if (['border', 'divide'].includes(prop)) {
      cssProp = 'border-color'
      value = '#1c5a4d'
    } else return null
  } else if (['brand-600', 'brand-700', 'brand-500'].includes(color)) {
    if (prop === 'text') {
      cssProp = 'color'
      value = color === 'brand-700' ? '#7fe0c4' : '#84d3bd'
    } else return null
  } else if (color === 'ink') {
    if (prop === 'text') {
      cssProp = 'color'
      value = '#e9f1ee'
    } else return null
  } else if (color === 'paper') {
    if (prop === 'bg') {
      cssProp = 'background-color'
      value = '#0c1614'
    } else return null
  } else if (color === 'line') {
    if (['border', 'divide'].includes(prop)) {
      cssProp = 'border-color'
      value = '#243531'
    } else return null
  } else if (color === 'ocean') {
    if (prop === 'text') {
      cssProp = 'color'
      value = '#5aa9d6'
    } else return null
  } else if (color === 'amber-50') {
    if (['bg', 'from', 'to', 'via'].includes(prop)) {
      cssProp = 'background-color'
      value = rgba('#3a2e0c', opacity)
    } else if (prop === 'text') {
      cssProp = 'color'
      value = '#f4d58a'
    } else if (['border', 'divide'].includes(prop)) {
      cssProp = 'border-color'
      value = '#6b5310'
    } else return null
  } else if (color === 'amber-700') {
    if (prop === 'text') {
      cssProp = 'color'
      value = '#f4d58a'
    } else if (['border', 'divide'].includes(prop)) {
      cssProp = 'border-color'
      value = '#6b5310'
    } else return null
  } else if (color === 'amber-500') {
    if (['border', 'divide'].includes(prop)) {
      cssProp = 'border-color'
      value = '#6b5310'
    } else return null
  } else {
    return null
  }
  return { cssProp, value, isPlaceholder }
}

function esc(t) {
  return t.replace(/:/g, '\\:').replace(/\//g, '\\/')
}

const lines = []
for (const info of found.values()) {
  const r = resolve(info)
  if (!r) continue
  const selector = `.dark .${esc(info.variant + info.prop + '-' + info.color + (info.opacity != null ? '/' + info.opacity : ''))}`
  lines.push(`${selector}${r.isPlaceholder ? '::placeholder' : ''} { ${r.cssProp}: ${r.value}; }`)
}
lines.sort()

const header = `/* 自动生成：暗色模式覆盖层（由 scripts/gen-dark-css.mjs 生成，勿手改）
   机制：.dark 作用域下用更高优先级选择器覆盖 Tailwind 的中性/品牌色工具类，
   避免逐个组件改 270+ 处硬编码颜色。改色板请改生成脚本后重跑。
   共 ${lines.length} 条覆盖规则。 */
html.dark { background-color: #0c1614; color: #e9f1ee; }
html.dark body { background-color: #0c1614; }

`

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, header + lines.join('\n') + '\n')
console.log(`wrote ${OUT} (${lines.length} rules)`)
