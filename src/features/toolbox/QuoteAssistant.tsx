import {
  Calculator,
  Copy,
  Check,
  Download,
  ImagePlus,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Info,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { loadRates } from '../../services/rates'
import { CustomServiceNudge } from '../marketing/CustomServiceNudge'
import {
  DEFAULT_QUOTE_INPUT,
  belowBreakEvenAdvice,
  computeQuote,
  type QuoteInput,
  type QuoteMode,
  type QuoteResult,
} from '../../domain/quote'

/* ------------------------------ formatting ------------------------------ */

const f2 = (n: number): string =>
  (Number.isFinite(n) ? n : 0).toLocaleString('zh-CN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })
const f0 = (n: number): string => Math.round(Number.isFinite(n) ? n : 0).toLocaleString('zh-CN')
const pct = (n: number): string => `${(Number.isFinite(n) ? n : 0) * 100 >= 0 ? '' : ''}${((Number.isFinite(n) ? n : 0) * 100).toFixed(1)}%`

/* ------------------------------ sales copy (Chinese) ------------------------------ */

function generateSalesCopy(input: QuoteInput, r: QuoteResult): { email: string; whatsapp: string; points: string[] } {
  const product = input.productName.trim() || '该产品'
  const qty = f0(input.qty)
  const price = `$${f2(r.unitPriceUSD)}`
  const totalPrice = `$${f2(r.orderAmountUSD)}`
  const lead = '15-20 个工作日'

  const email = `尊敬的 [客户名称]：

感谢您的询价。现将 ${product} 的报价提供如下，供您参考：

产品名称：${product}
起订数量：${qty} 件
单价：${price}（${r.mode}）
总金额：${totalPrice}
交期：${lead}
付款方式：30% 定金，出货前付清 70%
报价有效期：15 天

我们可根据您的实际需求调整包装与交期，也接受验厂与第三方验货。形式发票（PI）已附在附件中，如信息无误请回复确认，我们即可安排排产。

顺祝商祺
[您的姓名]
[公司名称]
[联系电话]`

  const whatsapp = `您好 [客户称呼]，感谢咨询 ${product}！

报价如下：
• 数量：${qty} 件
• 单价：${price}/件（${r.mode}）
• 总金额：${totalPrice}
• 交期：${lead}

首单起订量可协商，PI 已附上，如需调整数量或包装请随时告诉我。`

  const points = [
    `价格锚点：本单报价 ${price}/件（${r.mode}），按汇率 ${r.fxRate} 测算。若客户还价到 $${f2(r.targetUSD)}/件，整单利润为 ¥${f0(
      r.targetOrderProfitCNY,
    )}，利润率 ${pct(r.targetProfitRate)}。`,
    `成本底线：保本价 $${f2(r.breakEvenUSD)}/件，低于此价接单即亏。整单成本 ¥${f2(r.orderCostCNY)}。`,
    `汇率缓冲：已按汇率下跌 ${(r.fxDropRate * 100).toFixed(0)}% 做压力测试，届时整单利润为 ¥${f0(r.fxDropOrderProfitCNY)}，单件利润 ¥${f2(
      r.fxDropUnitProfitCNY,
    )}。`,
    `交期话术：标准交期 ${lead}，加急需另议。可用"工厂直供、无中间商"作为价格支撑，不要先自降利润。`,
    `促单话术：本报价 15 天内有效，近期原材料价格上行，尽早锁定价格对双方都更稳妥。`,
  ]

  return { email, whatsapp, points }
}

/* ------------------------------ PI HTML (Chinese) ------------------------------ */

function generatePIHTML(input: QuoteInput, r: QuoteResult, imageSrc: string | null): string {
  const esc = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const product = esc(input.productName.trim() || '产品')
  const today = new Date().toISOString().slice(0, 10)
  const piNo = `PI-${Date.now().toString(36).toUpperCase()}`
  const imageTag = imageSrc
    ? `<img src="${imageSrc}" style="max-width:200px;max-height:200px;border-radius:8px;border:1px solid #e5e7eb;" />`
    : '<div style="width:200px;height:150px;background:#f3f4f6;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:12px;">产品图片</div>'

  const b = r.breakdown

  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>形式发票 Proforma Invoice</title>
<style>
  body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#1f2937;max-width:800px;margin:0 auto;padding:24px 16px;font-size:13px;line-height:1.6}
  h1{font-size:22px;color:#0f6e59;margin:0 0 4px}
  .sub{color:#6b7280;font-size:12px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  th{background:#eefaf6;text-align:left;padding:8px 10px;font-size:12px;color:#0f6e59;border-bottom:2px solid #0f6e59}
  td{padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:12px}
  .text-right{text-align:right}
  .total-row{background:#f0fdf4;font-weight:600}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
  .label{color:#6b7280;font-size:11px;letter-spacing:.05em}
  .value{font-size:14px;color:#111827}
  .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:11px}
  .badge{display:inline-block;background:#0f6e59;color:white;font-size:10px;padding:2px 8px;border-radius:4px;vertical-align:middle;margin-left:8px}
  @media print{body{padding:0} .no-print{display:none}}
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start">
  <div><h1>形式发票<span class="badge">${piNo}</span></h1><p class="sub">日期：${today} &nbsp;|&nbsp; 有效期：15 天 &nbsp;|&nbsp; 汇率：${r.fxRate}</p></div>
  <div>${imageTag}</div>
</div>

<div class="grid">
  <div><p class="label">卖方 Seller</p><p class="value">[公司名称]<br/>[地址]<br/>[邮箱] &nbsp;|&nbsp; [电话]</p></div>
  <div><p class="label">买方 Buyer</p><p class="value">[客户公司名称]<br/>[地址]<br/>[邮箱] &nbsp;|&nbsp; [电话]</p></div>
</div>

<table>
  <thead><tr><th>#</th><th>产品</th><th class="text-right">数量</th><th class="text-right">单价</th><th class="text-right">金额</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>${product}</td><td class="text-right">${f0(r.qty)}</td><td class="text-right">$${f2(r.unitPriceUSD)}</td><td class="text-right">$${f2(r.orderAmountUSD)}</td></tr>
    <tr class="total-row"><td colspan="4" class="text-right">总计</td><td class="text-right">$${f2(r.orderAmountUSD)}</td></tr>
  </tbody>
</table>

<div class="grid">
  <div>
    <p class="label">费用明细（内部参考，不会展示给客户）</p>
    <table>
      <tr><td>采购成本（含税）</td><td class="text-right">¥${f2(b.purchaseTaxIncl)}</td></tr>
      <tr><td style="color:#059669">出口退税抵扣（-）</td><td class="text-right" style="color:#059669">-¥${f2(b.rebateDeduction)}</td></tr>
      <tr><td>包装成本</td><td class="text-right">¥${f2(b.packaging)}</td></tr>
      <tr><td>国内操作费</td><td class="text-right">¥${f2(b.domesticFee)}</td></tr>
      <tr><td>国际运费</td><td class="text-right">¥${f2(b.intlFreight)}</td></tr>
      <tr><td>保险费</td><td class="text-right">¥${f2(b.insurance)}</td></tr>
      <tr><td>国内杂费</td><td class="text-right">¥${f2(b.orderDomesticMisc)}</td></tr>
      <tr><td>国内运费</td><td class="text-right">¥${f2(b.orderDomesticFreight)}</td></tr>
      <tr><td>平台扣点 / 收款手续费 / 佣金</td><td class="text-right">¥${f2(b.revenueBasedFees)}</td></tr>
      <tr style="font-weight:700;background:#f9fafb"><td>整单成本</td><td class="text-right">¥${f2(r.orderCostCNY)}</td></tr>
      <tr style="font-weight:700;background:#f9fafb"><td>整单利润</td><td class="text-right">¥${f2(r.orderProfitCNY)}</td></tr>
    </table>
  </div>
  <div>
    <p class="label">条款</p>
    <table>
      <tr><td>价格条款</td><td>${r.mode} [港口]</td></tr>
      <tr><td>付款方式</td><td>30% 定金，出货前付清 70%</td></tr>
      <tr><td>交期</td><td>收到定金后 15-20 个工作日</td></tr>
      <tr><td>报价有效期</td><td>自开票日起 15 天</td></tr>
      <tr><td>包装</td><td>标准出口包装</td></tr>
    </table>
  </div>
</div>

<div class="footer no-print">
  <p>本文件由「外贸盒子」生成。上方买卖方信息为占位内容，发送前请务必替换为真实信息，并核对金额与条款。</p>
</div>
</body></html>`
}

/* ------------------------------ sub components ------------------------------ */

function NumField({
  label,
  value,
  onChange,
  suffix,
  step,
  hint,
  unit,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  suffix?: string
  step?: number
  hint?: string
  /** '每件' / '整单' badge shown next to the label. */
  unit?: '每件' | '整单'
}) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      <span className="flex flex-wrap items-center gap-1">
        {label}
        {unit ? (
          <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
            {unit}
          </Badge>
        ) : null}
        {suffix ? <span className="text-slate-400">/ {suffix}</span> : null}
      </span>
      {hint ? <span className="ml-1 text-[10px] text-slate-400">（{hint}）</span> : null}
      <Input
        className="mt-1.5"
        type="number"
        step={step ?? 'any'}
        value={Number.isFinite(value) ? value : ''}
        aria-label={label}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      />
    </label>
  )
}

/** A single result metric. The unit tag is mandatory so 每件 and 整单 can never be mixed up. */
function Metric({
  label,
  value,
  unit,
  sub,
  tone,
}: {
  label: string
  value: string
  unit: '每件' | '整单'
  sub?: string
  tone?: 'good' | 'warn' | 'bad'
}) {
  const toneClass = tone === 'bad' ? 'text-red-300' : tone === 'good' ? 'text-emerald-300' : tone === 'warn' ? 'text-amber-300' : ''
  return (
    <div className="rounded-xl bg-white/10 p-3">
      <p className="flex items-center gap-1 text-[11px] text-white/60">
        {label}
        <span className="rounded bg-white/15 px-1 text-[9px] text-white/70">{unit}</span>
      </p>
      <p className={`mt-0.5 text-xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-[10px] text-white/50">{sub}</p> : null}
    </div>
  )
}

function CostRow({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={`font-medium tabular-nums ${negative ? 'text-emerald-600' : 'text-ink'}`}>
        {negative ? '-' : ''}
        {value}
      </span>
    </div>
  )
}

function useCopy(timeoutMs = 2000): { copied: boolean; copy: (text: string) => void } {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const copy = useCallback((text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setCopied(false), timeoutMs)
      })
      .catch(() => {})
  }, [])
  return { copied, copy }
}

/* ------------------------------ main component ------------------------------ */

const STEPS = [
  { id: 1, title: '快速报价', desc: '成本与数量' },
  { id: 2, title: '高级费用', desc: '税费与运费' },
  { id: 3, title: '报价结果', desc: '利润与话术' },
] as const

export function QuoteAssistant() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [input, setInput] = useState<QuoteInput>(DEFAULT_QUOTE_INPUT)

  const [fxSource, setFxSource] = useState<'在线' | '离线参考' | ''>('')
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [showCopy, setShowCopy] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const { copied: copiedEmail, copy: copyEmail } = useCopy()
  const { copied: copiedWA, copy: copyWA } = useCopy()
  const { copied: copiedPoint, copy: copyPoint } = useCopy()

  // Pull the live USD->CNY rate; silently falls back to the offline reference rate.
  useEffect(() => {
    let active = true
    void loadRates('USD').then((r) => {
      if (active && r.rates.CNY) {
        setInput((prev) => ({ ...prev, fxRate: Number(r.rates.CNY.toFixed(4)) }))
        setFxSource(r.source)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const set = <K extends keyof QuoteInput>(key: K) => (value: QuoteInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }))

  // 入向联动：装箱 CBM 计算器「带入报价助手」通过 ?freight=<平均运费/件(元)> 跳转，
  // 自动填入单件国际运费并切到 CIF（海运/空运/快递的运费均计入 CIF）。
  const [searchParams] = useSearchParams()
  useEffect(() => {
    const freight = searchParams.get('freight')
    if (freight == null || freight === '') return
    const f = Number(freight)
    if (Number.isFinite(f) && f > 0) {
      setInput((prev) => ({ ...prev, unitIntlFreight: f, mode: 'CIF' }))
    }
  }, [searchParams])

  const result = useMemo(() => computeQuote(input), [input])
  const copyData = useMemo(() => generateSalesCopy(input, result), [input, result])

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      window.alert('图片请小于 5MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setImageSrc(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleDownloadPI = () => {
    const html = generatePIHTML(input, result, imageSrc)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `PI-${(input.productName.trim() || 'quote').replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setDownloaded(true)
  }

  const isCIF = input.mode === 'CIF'

  return (
    <Card id="quote-assistant" className="overflow-hidden p-0">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-brand-50 to-white dark:from-[#0f3a31] dark:to-[#15231f] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-600">外贸防亏报价助手</p>
            <p className="text-xs text-slate-500">一套公式算清保本价、建议报价与真实利润，避免接单即亏</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {fxSource ? (
            <Badge variant="outline" className="text-[10px] font-normal">
              汇率{fxSource}
            </Badge>
          ) : null}
          <Button size="sm" onClick={handleDownloadPI}>
            <FileText className="mr-1.5 h-4 w-4" />
            生成 PI
          </Button>
        </div>
      </div>

      {/* step bar */}
      <div className="flex flex-wrap items-stretch gap-2 border-b border-slate-100 bg-white px-5 py-3 sm:px-6">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(s.id)}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition ${
                step === s.id ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                  step === s.id ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {s.id}
              </span>
              <span>
                <span className="block text-xs font-medium">{s.title}</span>
                <span className="block text-[10px] text-slate-400">{s.desc}</span>
              </span>
            </button>
            {i < STEPS.length - 1 ? <ArrowRight className="h-3.5 w-3.5 text-slate-300" /> : null}
          </div>
        ))}
      </div>

      <div className="p-5 sm:p-6">
        {/* ==================== STEP 1: quick quote ==================== */}
        {step === 1 ? (
          <section>
            <h3 className="text-sm font-semibold text-ink">第一步 · 快速报价</h3>
            <p className="mt-1 text-xs text-slate-500">
              只填最核心的几项，就能立刻看到能不能报。进阶的税费、运费、扣点留到第二步再补。
            </p>

            <div className="mt-4 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="group flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 transition hover:border-brand-300 hover:bg-brand-50/50"
                aria-label="上传产品图片"
              >
                {imageSrc ? (
                  <img src={imageSrc} alt="" className="h-full w-full rounded-xl object-cover" />
                ) : (
                  <>
                    <ImagePlus className="h-6 w-6 text-slate-400 group-hover:text-brand-500" />
                    <p className="mt-1 text-[10px] text-slate-400">上传图片</p>
                  </>
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
              <div className="min-w-[200px] flex-1">
                <label className="block text-xs font-medium text-slate-600">
                  产品名称
                  <Input
                    className="mt-1.5"
                    placeholder="例：加固镀铬钓鱼椅"
                    value={input.productName}
                    aria-label="产品名称"
                    onChange={(e) => set('productName')(e.target.value)}
                  />
                </label>
                <p className="mt-2 text-[11px] text-slate-400">
                  图片仅用于生成的 PI 与报价展示，不会做任何图像识别，也不会参与计算。
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-3">
              <NumField label="数量" value={input.qty} onChange={set('qty')} suffix="件" unit="整单" />
              <NumField
                label="单件采购成本"
                value={input.unitCostTaxIncl}
                onChange={set('unitCostTaxIncl')}
                suffix="元"
                unit="每件"
                hint="含税进价"
              />
              <NumField label="单件包装成本" value={input.unitPackaging} onChange={set('unitPackaging')} suffix="元" unit="每件" />
              <NumField
                label="目标利润率"
                value={input.targetMarginRate}
                onChange={set('targetMarginRate')}
                suffix="%"
                hint="按报价额计算"
              />
              <NumField
                label="客户目标价"
                value={input.customerTargetUSD}
                onChange={set('customerTargetUSD')}
                suffix="美元"
                unit="每件"
                hint="客户还价"
              />
              <NumField label="汇率 USD→CNY" value={input.fxRate} onChange={set('fxRate')} step={0.0001} />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-slate-600">贸易条款</p>
              <div className="flex gap-2">
                {(['FOB', 'CIF'] as QuoteMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set('mode')(m)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      input.mode === m
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-400">选 CIF 时第二步需补国际运费与保险费率。</p>
            </div>
          </section>
        ) : null}

        {/* ==================== STEP 2: advanced fees ==================== */}
        {step === 2 ? (
          <section>
            <h3 className="text-sm font-semibold text-ink">第二步 · 高级费用</h3>
            <p className="mt-1 text-xs text-slate-500">
              带「每件」的费用按单件计入成本；带「整单」的费用会按数量摊到每件，数量越大单件负担越低。
            </p>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">税与退税</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
                <NumField label="增值税率" value={input.vatRate} onChange={set('vatRate')} suffix="%" hint="用于剥离不含税进价" />
                <NumField label="出口退税率" value={input.rebateRate} onChange={set('rebateRate')} suffix="%" hint="按不含税进价退" />
                <NumField label="单件国内操作费" value={input.unitDomesticFee} onChange={set('unitDomesticFee')} suffix="元" unit="每件" />
                <NumField
                  label="单件国际运费"
                  value={input.unitIntlFreight}
                  onChange={set('unitIntlFreight')}
                  suffix="元"
                  unit="每件"
                  hint={isCIF ? 'CIF 计入' : 'FOB 下不参与计算'}
                />
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">整单费用（按数量摊薄）</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
                <NumField label="国内杂费" value={input.orderDomesticMisc} onChange={set('orderDomesticMisc')} suffix="元" unit="整单" />
                <NumField label="国内运费" value={input.orderDomesticFreight} onChange={set('orderDomesticFreight')} suffix="元" unit="整单" />
                <NumField
                  label="保险费率"
                  value={input.insuranceRate}
                  onChange={set('insuranceRate')}
                  suffix="%"
                  hint={isCIF ? '按 CIF 金额计' : 'FOB 下不参与计算'}
                />
                <NumField label="汇率风险预留" value={input.fxRiskRate} onChange={set('fxRiskRate')} suffix="%" hint="压力测试跌幅" />
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">按报价额收取的费用</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-3">
                <NumField label="平台扣点" value={input.platformRate} onChange={set('platformRate')} suffix="%" />
                <NumField label="收款手续费" value={input.collectionRate} onChange={set('collectionRate')} suffix="%" />
                <NumField label="佣金" value={input.commissionRate} onChange={set('commissionRate')} suffix="%" />
              </div>
            </div>

            {result.invalid.feeRate || result.invalid.margin || result.invalid.insurance ? (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {result.invalid.feeRate ? '平台扣点 + 收款手续费 + 佣金不能 ≥ 100%，否则无法解出报价。 ' : ''}
                {result.invalid.margin ? '扣点合计 + 目标利润率不能 ≥ 100%，请降低目标利润率。 ' : ''}
                {result.invalid.insurance ? '保险费率不能 ≥ 100%。' : ''}
              </p>
            ) : null}
          </section>
        ) : null}

        {/* ==================== STEP 3: results ==================== */}
        {step === 3 ? (
          <section className="space-y-5">
            {/* the six mandatory metrics */}
            <div>
              <h3 className="text-sm font-semibold text-ink">第三步 · 报价结果</h3>
              <p className="mt-1 text-xs text-slate-500">每个数字都标了「每件」或「整单」，请勿混用。</p>
              <div className="mt-4 rounded-2xl bg-gradient-to-br from-ocean to-blue-700 p-5 text-white">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  <Metric label="单件人民币成本" value={`¥${f2(result.unitCostCNY)}`} unit="每件" sub="不含按报价额收取的费用" />
                  <Metric label="单件美元报价" value={`$${f2(result.unitPriceUSD)}`} unit="每件" sub={`≈ ¥${f2(result.unitPriceCNY)}`} />
                  <Metric label="整单人民币成本" value={`¥${f2(result.orderCostCNY)}`} unit="整单" sub={`共 ${f0(result.qty)} 件`} />
                  <Metric label="整单美元金额" value={`$${f2(result.orderAmountUSD)}`} unit="整单" sub={`≈ ¥${f2(result.orderAmountCNY)}`} />
                  <Metric
                    label="单件利润"
                    value={`¥${f2(result.unitProfitCNY)}`}
                    unit="每件"
                    sub={`利润率 ${pct(result.unitProfitRate)}`}
                    tone={result.unitProfitCNY > 0 ? 'good' : 'bad'}
                  />
                  <Metric
                    label="整单利润"
                    value={`¥${f2(result.orderProfitCNY)}`}
                    unit="整单"
                    sub="已扣平台/收款/佣金"
                    tone={result.orderProfitCNY > 0 ? 'good' : 'bad'}
                  />
                </div>
              </div>
            </div>

            {/* price anchors */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-ink">价格锚点（每件）</p>
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">保本价</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-amber-600">${f2(result.breakEvenUSD)}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">低于此价必亏</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">建议报价</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-brand-600">${f2(result.suggestedUSD)}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">达到目标利润率</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">客户目标价</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">${f2(result.targetUSD)}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">客户期望成交价</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">目标利润率</p>
                  <p
                    className={`mt-0.5 text-lg font-semibold tabular-nums ${
                      result.targetProfitRate > 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {pct(result.targetProfitRate)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">按客户目标价测算</p>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] text-slate-500">
                  汇率下跌 {(result.fxDropRate * 100).toFixed(0)}% 后的利润
                </p>
                <p
                  className={`mt-0.5 text-lg font-semibold tabular-nums ${
                    result.fxDropUnitProfitCNY > 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  ¥{f2(result.fxDropUnitProfitCNY)}
                  <span className="ml-1 text-xs font-normal text-slate-500">/ 每件</span>
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400">整单 ¥{f2(result.fxDropOrderProfitCNY)}</p>
              </div>

              {result.targetBelowBreakEven ? (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700">
                  {belowBreakEvenAdvice(result)}
                </p>
              ) : result.targetUSD > 0 ? (
                <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-800">
                  客户目标价高于保本价 ${f2(result.targetGapUSD)}/件，整单利润约 ¥{f0(result.targetOrderProfitCNY)}，可以接，但仍建议先报建议价再让。
                </p>
              ) : null}
            </div>

            {/* breakdown */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">费用明细（整单）</p>
                <span className="text-sm font-semibold text-ink">整单成本 ¥{f2(result.orderCostCNY)}</span>
              </div>
              <div className="mt-2">
                <CostRow label="采购成本（含税）" value={`¥${f2(result.breakdown.purchaseTaxIncl)}`} />
                <CostRow label="出口退税抵扣" value={`¥${f2(result.breakdown.rebateDeduction)}`} negative />
                <CostRow label="包装成本" value={`¥${f2(result.breakdown.packaging)}`} />
                <CostRow label="国内操作费" value={`¥${f2(result.breakdown.domesticFee)}`} />
                <CostRow label="国际运费" value={`¥${f2(result.breakdown.intlFreight)}`} />
                <CostRow label="保险费" value={`¥${f2(result.breakdown.insurance)}`} />
                <CostRow label="国内杂费" value={`¥${f2(result.breakdown.orderDomesticMisc)}`} />
                <CostRow label="国内运费" value={`¥${f2(result.breakdown.orderDomesticFreight)}`} />
                <CostRow label="平台扣点 / 收款手续费 / 佣金" value={`¥${f2(result.breakdown.revenueBasedFees)}`} />
                <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-semibold">
                  <span>整单报价（到手前）</span>
                  <span className="text-brand-600">¥{f2(result.orderAmountCNY)}</span>
                </div>
              </div>
            </div>

            {/* sales copy */}
            <div className="rounded-2xl border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setShowCopy(!showCopy)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-ink"
              >
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-brand-500" />
                  报价话术
                </span>
                {showCopy ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>

              {showCopy ? (
                <div className="border-t border-slate-100 px-4 pb-4">
                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-500">邮件模板</p>
                      <Button size="sm" variant="ghost" onClick={() => copyEmail(copyData.email)}>
                        {copiedEmail ? (
                          <>
                            <Check className="mr-1 h-3.5 w-3.5" />
                            已复制
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 h-3.5 w-3.5" />
                            复制
                          </>
                        )}
                      </Button>
                    </div>
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-700">
                      {copyData.email}
                    </pre>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-500">WhatsApp 模板</p>
                      <Button size="sm" variant="ghost" onClick={() => copyWA(copyData.whatsapp)}>
                        {copiedWA ? (
                          <>
                            <Check className="mr-1 h-3.5 w-3.5" />
                            已复制
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 h-3.5 w-3.5" />
                            复制
                          </>
                        )}
                      </Button>
                    </div>
                    <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-700">
                      {copyData.whatsapp}
                    </pre>
                  </div>

                  <div className="mt-3">
                    <p className="text-xs font-medium text-slate-500">谈判要点</p>
                    <ul className="mt-2 space-y-2">
                      {copyData.points.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-600">
                          <button
                            type="button"
                            onClick={() => copyPoint(point)}
                            className="mt-0.5 shrink-0 text-slate-400 hover:text-brand-500"
                            aria-label="复制"
                          >
                            {copiedPoint ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>

            {downloaded ? (
              <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
                PI 已生成为 HTML 文件，浏览器打开后可打印为 PDF 或直接发给客户。发送前请替换买卖方占位信息。
              </p>
            ) : null}

            <CustomServiceNudge />
          </section>
        ) : null}

        {/* step navigation */}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={step === 1}
            onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            上一步
          </Button>
          <p className="hidden items-start gap-2 text-[11px] text-slate-400 sm:flex">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>所有计算只在你的浏览器里完成，输入不会上传服务器。</span>
          </p>
          {step < 3 ? (
            <Button size="sm" onClick={() => setStep((s) => (s === 1 ? 2 : 3))}>
              下一步
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setStep(1)}>
              返回修改参数
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
