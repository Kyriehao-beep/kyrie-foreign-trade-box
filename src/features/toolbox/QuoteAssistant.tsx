import { Calculator, Copy, Check, Download, ImagePlus, FileText, MessageSquare, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { loadRates } from '../../services/rates'

/* ---------- types ---------- */

interface ProductParams {
  name: string
  qty: number
  unitCost: number       // 单件人民币成本
  packagingCost: number   // 单件包装成本
  domesticMisc: number    // 国内杂费（整单）
  domesticFreight: number // 国内运费（整单）
  intlFreight: number     // 国际运费（整单）
  platformRate: number    // 平台扣点 %
  collectionRate: number  // 收款手续费 %
  fxRisk: number          // 汇率风险 %
  rebateRate: number      // 退税率 %
  targetMargin: number    // 目标利润率 %
  targetUSD: number       // 客户目标 USD
}

interface ComputeResult {
  // costs
  totalProductCost: number
  totalPackaging: number
  totalDomesticMisc: number
  totalDomesticFreight: number
  totalIntlFreight: number
  totalRebate: number
  totalPlatformFee: number
  totalCollectionFee: number
  totalCost: number
  // prices
  currentUSD: number
  targetUSD: number
  listingUSD: number
  currentProfitCNY: number
  currentProfitRate: number
  targetProfitRate: number
  listingProfitRate: number
  fxAdjustedProfit: number
  revenueNet: number
}

/* ---------- math ---------- */

const num = (v: number): number => (Number.isFinite(v) ? v : 0)
const f2 = (n: number): string => num(n).toLocaleString('zh-CN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
const f0 = (n: number): string => Math.round(num(n)).toLocaleString('zh-CN')

function computeQuote(p: ProductParams, fxRate: number): ComputeResult {
  const qty = num(p.qty) || 1
  const fx = num(fxRate) || 1

  // cost totals
  const totalProductCost = num(p.unitCost) * qty
  const totalPackaging = num(p.packagingCost) * qty
  const totalDomesticMisc = num(p.domesticMisc)
  const totalDomesticFreight = num(p.domesticFreight)
  const totalIntlFreight = num(p.intlFreight)

  // rebate: assume cost is tax-inclusive, extract VAT portion × rebate rate
  // simplified: unitCost × rebateRate% × qty (user can set rebate=0 if N/A)
  const totalRebate = totalProductCost * (num(p.rebateRate) / 100)

  const grossCost = totalProductCost + totalPackaging + totalDomesticMisc + totalDomesticFreight + totalIntlFreight - totalRebate

  // platform & collection fees are % of revenue — solve iteratively
  // baseRevenue = grossCost / (1 - platform% - collection%)
  const platRate = num(p.platformRate) / 100
  const collRate = num(p.collectionRate) / 100
  const feeDeduction = platRate + collRate
  const baseRevenue = feeDeduction >= 1 ? 0 : grossCost / (1 - feeDeduction)

  const totalPlatformFee = baseRevenue * platRate
  const totalCollectionFee = baseRevenue * collRate
  const totalCost = grossCost + totalPlatformFee + totalCollectionFee
  const revenueNet = baseRevenue - totalPlatformFee - totalCollectionFee

  // current price: break-even+margin → add target margin
  const marginRate = num(p.targetMargin) / 100
  const quoteRevenue = marginRate >= 1 ? 0 : baseRevenue / (1 - marginRate)
  const currentUSD = fx > 0 ? quoteRevenue / fx : 0

  // target price (user-specified)
  const targetU = num(p.targetUSD)
  const targetRevenue = targetU * fx
  const targetProfit = targetRevenue - totalCost
  const targetProfitRate = targetRevenue > 0 ? targetProfit / targetRevenue : 0

  // listing price: to achieve target margin
  const listingRevenue = marginRate >= 1 ? 0 : totalCost / (1 - marginRate)
  const listingUSD = fx > 0 ? listingRevenue / fx : 0
  const listingProfit = listingRevenue - totalCost
  const listingProfitRate = listingRevenue > 0 ? listingProfit / listingRevenue : 0

  // current profit
  const currentProfitCNY = quoteRevenue - totalCost
  const currentProfitRate = quoteRevenue > 0 ? currentProfitCNY / quoteRevenue : 0

  // FX risk adjusted profit (if fx drops by fxRisk%)
  const fxDrop = fx * (1 - num(p.fxRisk) / 100)
  const fxAdjustedRevenue = currentUSD * fxDrop
  const fxAdjustedProfit = fxAdjustedRevenue - totalCost

  return {
    totalProductCost, totalPackaging, totalDomesticMisc, totalDomesticFreight,
    totalIntlFreight, totalRebate, totalPlatformFee, totalCollectionFee, totalCost,
    currentUSD, targetUSD: targetU, listingUSD,
    currentProfitCNY, currentProfitRate, targetProfitRate, listingProfitRate,
    fxAdjustedProfit, revenueNet,
  }
}

/* ---------- sales copy templates ---------- */

function generateSalesCopy(p: ProductParams, r: ComputeResult, fxRate: number): { email: string; whatsapp: string; points: string[] } {
  const product = p.name || '该产品'
  const qty = f0(p.qty)
  const price = `$${f2(r.currentUSD)}`
  const totalPrice = `$${f2(r.currentUSD * num(p.qty))}`
  const leadTime = '15-20 工作日'
  const moq = qty

  const email = `Dear [Customer Name],

Thank you for your inquiry about ${product}. We are pleased to provide our best quotation as follows:

Product: ${product}
MOQ: ${qty} units
Unit Price: ${price} (FOB)
Total Amount: ${totalPrice}
Lead Time: ${leadTime}
Payment Terms: 30% deposit, 70% before shipment
Validity: 15 days

Our factory has been specializing in this product for over 10 years. We currently supply to brands in [Region] and maintain strict quality control with a defect rate below 0.3%.

We have attached our Proforma Invoice for your review. Please confirm so we can arrange production.

Best regards,
[Your Name]
[Company Name]`

  const whatsapp = `Hi [Name], thanks for inquiring about ${product}! 🌿

Here's our offer:
• Product: ${product}
• Qty: ${qty} pcs
• Price: ${price}/pc FOB
• Total: ${totalPrice}
• Lead time: ${leadTime}

MOQ is flexible for first order. PI attached — let me know if you need any adjustments!`

  const points = [
    `价格锚点：报价 $${f2(r.currentUSD)}/件，基于当前汇率 ${fxRate} 计算。若客户还价到 $${f2(r.targetUSD)}，净利润率降至 ${(r.targetProfitRate * 100).toFixed(1)}%，仍为正但需评估是否接受。`,
    `成本底线：整单总成本 ¥${f2(r.totalCost)}，折合 $${f2(r.totalCost / fxRate)}/单。低于此价格必亏。`,
    `汇率缓冲：已预留 ${p.fxRisk}% 汇率风险空间。若汇率下跌 ${p.fxRisk}%，利润从 ¥${f2(r.currentProfitCNY)} 降至 ¥${f2(r.fxAdjustedProfit)}。`,
    `交期话术：标准交期 ${leadTime}，可加急（+10% 费用）。强调"工厂直供、无中间商"作为溢价支撑。`,
    `促单话术："This quote is valid for 15 days. Current raw material prices are trending up — locking in now protects your margin."`,
  ]

  return { email, whatsapp, points }
}

/* ---------- PI HTML generator ---------- */

function generatePIHTML(p: ProductParams, r: ComputeResult, fxRate: number, imageSrc: string | null): string {
  const today = new Date().toISOString().slice(0, 10)
  const piNo = `PI-${Date.now().toString(36).toUpperCase()}`
  const imageTag = imageSrc ? `<img src="${imageSrc}" style="max-width:200px;max-height:200px;border-radius:8px;border:1px solid #e5e7eb;" />` : '<div style="width:200px;height:150px;background:#f3f4f6;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:12px;">产品图片</div>'

  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Proforma Invoice</title>
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
  .label{color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
  .value{font-size:14px;color:#111827}
  .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:11px}
  .badge{display:inline-block;background:#0f6e59;color:white;font-size:10px;padding:2px 8px;border-radius:4px;vertical-align:middle;margin-left:8px}
  @media print{body{padding:0} .no-print{display:none}}
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start">
  <div><h1>PROFORMA INVOICE<span class="badge">${piNo}</span></h1><p class="sub">Date: ${today} &nbsp;|&nbsp; Validity: 15 days &nbsp;|&nbsp; Exchange Rate: ${fxRate}</p></div>
  <div>${imageTag}</div>
</div>

<div class="grid">
  <div><p class="label">Seller (卖方)</p><p class="value">[Your Company Name]<br/>[Address, City, Country]<br/>[Contact Email] &nbsp;|&nbsp; [Phone]</p></div>
  <div><p class="label">Buyer (买方)</p><p class="value">[Customer Company Name]<br/>[Address, City, Country]<br/>[Contact Email] &nbsp;|&nbsp; [Phone]</p></div>
</div>

<table>
  <thead><tr><th>#</th><th>Product / 产品</th><th class="text-right">Qty / 数量</th><th class="text-right">Unit Price / 单价</th><th class="text-right">Amount / 金额</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>${p.name || 'Product'}</td><td class="text-right">${f0(p.qty)}</td><td class="text-right">$${f2(r.currentUSD)}</td><td class="text-right">$${f2(r.currentUSD * num(p.qty))}</td></tr>
    <tr class="total-row"><td colspan="4" class="text-right">Total / 总计</td><td class="text-right">$${f2(r.currentUSD * num(p.qty))}</td></tr>
  </tbody>
</table>

<div class="grid">
  <div>
    <p class="label">Cost Breakdown / 费用明细 (内部参考)</p>
    <table>
      <tr><td>产品成本 Product Cost</td><td class="text-right">¥${f2(r.totalProductCost)}</td></tr>
      <tr><td>包装成本 Packaging</td><td class="text-right">¥${f2(r.totalPackaging)}</td></tr>
      <tr><td>国内杂费 Domestic Misc</td><td class="text-right">¥${f2(r.totalDomesticMisc)}</td></tr>
      <tr><td>国内运费 Domestic Freight</td><td class="text-right">¥${f2(r.totalDomesticFreight)}</td></tr>
      <tr><td>国际运费 Intl Freight</td><td class="text-right">¥${f2(r.totalIntlFreight)}</td></tr>
      <tr><td style="color:#059669">退税抵扣 Tax Rebate (-)</td><td class="text-right" style="color:#059669">-¥${f2(r.totalRebate)}</td></tr>
      <tr><td>平台扣点 Platform Fee</td><td class="text-right">¥${f2(r.totalPlatformFee)}</td></tr>
      <tr><td>收款手续费 Collection Fee</td><td class="text-right">¥${f2(r.totalCollectionFee)}</td></tr>
      <tr style="font-weight:700;background:#f9fafb"><td>Total Cost / 总成本</td><td class="text-right">¥${f2(r.totalCost)}</td></tr>
    </table>
  </div>
  <div>
    <p class="label">Terms / 条款</p>
    <table>
      <tr><td>Price Term / 价格条款</td><td>FOB [Port]</td></tr>
      <tr><td>Payment / 付款方式</td><td>30% T/T deposit, 70% before shipment</td></tr>
      <tr><td>Lead Time / 交期</td><td>15-20 working days after deposit</td></tr>
      <tr><td>Validity / 报价有效期</td><td>15 days from date</td></tr>
      <tr><td>Packing / 包装</td><td>Standard export packing</td></tr>
    </table>
  </div>
</div>

<div class="footer no-print">
  <p>This PI was generated by 外贸盒子 (Kyrie's Foreign Trade Box). Seller/Buyer information above are placeholders — please replace with actual details before sending.</p>
</div>
</body></html>`
}

/* ---------- sub-components ---------- */

function NumField({ label, value, onChange, suffix, step, hint }: {
  label: string; value: number; onChange: (v: number) => void;
  suffix?: string; step?: number; hint?: string
}) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      <span className="flex items-center gap-1">{label}{suffix ? <span className="text-slate-400">/ {suffix}</span> : null}</span>
      {hint ? <span className="ml-1 text-[10px] text-slate-400">({hint})</span> : null}
      <Input className="mt-1.5" type="number" step={step ?? 'any'}
        value={Number.isFinite(value) ? value : ''} aria-label={label}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} />
    </label>
  )
}

function Metric({ label, value, sub, good }: { label: string; value: string; sub?: string; good?: boolean }) {
  return (
    <div className="rounded-xl bg-white/10 p-3">
      <p className="text-[11px] text-white/60">{label}</p>
      <p className={`mt-0.5 text-xl font-semibold tabular-nums ${good === false ? 'text-amber-300' : good === true ? 'text-emerald-300' : ''}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-[10px] text-white/50">{sub}</p> : null}
    </div>
  )
}

function CostRow({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={`font-medium tabular-nums ${negative ? 'text-emerald-600' : 'text-ink'}`}>{negative ? `-` : null}{value}</span>
    </div>
  )
}

/* ---------- copy button hook ---------- */

function useCopy(timeoutMs = 2000): { copied: boolean; copy: (text: string) => void } {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), timeoutMs)
    }).catch(() => {})
  }, [])
  return { copied, copy }
}

/* ---------- main component ---------- */

export function QuoteAssistant() {
  // image
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // FX
  const [fxRate, setFxRate] = useState(7.18)
  const [fxSource, setFxSource] = useState<'在线' | '离线参考' | ''>('')

  // params
  const [p, setP] = useState<ProductParams>({
    name: '', qty: 100, unitCost: 80, packagingCost: 4,
    domesticMisc: 500, domesticFreight: 300, intlFreight: 1800,
    platformRate: 3, collectionRate: 1, fxRisk: 2,
    rebateRate: 0, targetMargin: 20, targetUSD: 19.9,
  })

  // UI state
  const [showPI, setShowPI] = useState(false)
  const [showCopy, setShowCopy] = useState(false)
  const { copied: copiedEmail, copy: copyEmail } = useCopy()
  const { copied: copiedWA, copy: copyWA } = useCopy()
  const { copied: copiedPoint, copy: copyPoint } = useCopy()

  // load FX
  useEffect(() => {
    let active = true
    void loadRates('USD').then((r) => {
      if (active && r.rates.CNY) {
        setFxRate(Number(r.rates.CNY.toFixed(4)))
        setFxSource(r.source)
      }
    })
    return () => { active = false }
  }, [])

  const set = (key: keyof ProductParams) => (value: number) =>
    setP((prev) => ({ ...prev, [key]: value }))

  const r = useMemo(() => computeQuote(p, fxRate), [p, fxRate])
  const copyData = useMemo(() => generateSalesCopy(p, r, fxRate), [p, r, fxRate])

  // image handler
  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('图片请小于 5MB'); return }
    const reader = new FileReader()
    reader.onload = () => setImageSrc(reader.result as string)
    reader.readAsDataURL(file)
  }

  // PI download
  const handleDownloadPI = () => {
    const html = generatePIHTML(p, r, fxRate, imageSrc)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `PI-${(p.name || 'quote').replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShowPI(true)
  }

  const invalidFees = num(p.platformRate) + num(p.collectionRate) >= 100
  const invalidMargin = num(p.targetMargin) >= 100

  return (
    <Card id="quote-assistant" className="overflow-hidden p-0">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-brand-50 to-white px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-600">外贸防亏报价助手</p>
            <p className="text-xs text-slate-500">输入成本、数量、汇率和费用，自动算出保本价、目标价和利润</p>
          </div>
        </div>
        <Button size="sm" onClick={handleDownloadPI}>
          <FileText className="mr-1.5 h-4 w-4" />生成 PI
        </Button>
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        {/* ===== LEFT: Params ===== */}
        <div className="border-r border-slate-100 p-5 sm:p-6">
          {/* product image + name */}
          <div className="flex gap-4">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="group flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 transition hover:border-brand-300 hover:bg-brand-50/50"
              aria-label="上传产品图片">
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
            <div className="min-w-0 flex-1">
              <NumField label="产品名称" value={p.name ? 0 : 0} onChange={(v) => set('name')(v)} suffix="" />
              {/* override: use a text input for name */}
              <Input className="mt-1.5" placeholder="例：加固镀铬钓鱼椅" value={p.name}
                aria-label="产品名称" onChange={(e) => setP((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">报价参数</p>
            <p className="mb-3 text-xs text-slate-500">第一版按单个产品计算，适合快速判断一个产品或一个 SKU 能不能报。</p>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <NumField label="数量" value={p.qty} onChange={set('qty')} suffix="pos" hint="pcs" />
              <NumField label="当前/客户目标 USD" value={p.targetUSD} onChange={set('targetUSD')} suffix="" hint="客户期望价" />
              <NumField label="单件人民币成本" value={p.unitCost} onChange={set('unitCost')} suffix="RMB" />
              <NumField label="单件包装成本" value={p.packagingCost} onChange={set('packagingCost')} suffix="RMB" />
              <NumField label="国内杂费" value={p.domesticMisc} onChange={set('domesticMisc')} suffix="RMB" hint="整单" />
              <NumField label="国际运费" value={p.intlFreight} onChange={set('intlFreight')} suffix="RMB" hint="整单" />
              <NumField label="汇率 USD-CNY" value={fxRate} onChange={setFxRate} step={0.0001} />
              <NumField label="国内运费" value={p.domesticFreight} onChange={set('domesticFreight')} suffix="RMB" hint="整单" />
              <NumField label="平台扣点" value={p.platformRate} onChange={set('platformRate')} suffix="%" />
              <NumField label="收款手续费" value={p.collectionRate} onChange={set('collectionRate')} suffix="%" />
              <NumField label="汇率风险" value={p.fxRisk} onChange={set('fxRisk')} suffix="%" hint="预留跌幅" />
              <NumField label="目标利润率" value={p.targetMargin} onChange={set('targetMargin')} suffix="%" />
              <NumField label="退税率" value={p.rebateRate} onChange={set('rebateRate')} suffix="%" hint="可选填 0" />
            </div>
          </div>

          {(invalidFees || invalidMargin) && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {invalidFees ? '平台扣点 + 收款手续费不能 ≥ 100%。 ' : ''}
              {invalidMargin ? '目标利润率不能 ≥ 100%。' : ''}
            </p>
          )}

          <p className="mt-4 flex items-start gap-2 text-[11px] text-slate-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>先输成本和费用，系统会自动推出最低不能低于多少。</span>
          </p>
        </div>

        {/* ===== RIGHT: Results ===== */}
        <div className="bg-slate-50/50 p-5 sm:p-6">
          {/* Profit Health */}
          <div className="rounded-2xl bg-gradient-to-br from-ocean to-blue-700 p-5 text-white">
            <p className="text-sm font-medium text-white/80">利润健康</p>
            <p className="mt-1 text-xs text-white/60">这些有正常利润空间，可以继续谈。但别忘了守住底线。</p>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <Metric label="像本" value={`$${f2(r.currentUSD)}`} sub={`净利润率 ${(r.currentProfitRate * 100).toFixed(1)}%`} good={r.currentProfitCNY > 0} />
              <Metric label="客户目标" value={`$${f2(r.targetUSD)}`} sub={`净利润率 ${(r.targetProfitRate * 100).toFixed(1)}%`} good={r.targetProfitRate > 0} />
              <Metric label="目标标调价" value={`$${f2(r.listingUSD)}`} sub={`净利润率 ${(r.listingProfitRate * 100).toFixed(1)}%`} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[11px] text-white/60">当前报价利润</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">¥{f2(r.currentProfitCNY)}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[11px] text-white/60">当前报价利润率</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">{(r.currentProfitRate * 100).toFixed(1)}%</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[11px] text-white/60">汇率下跌后利润</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">¥{f2(r.fxAdjustedProfit)}</p>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">费用明细</p>
              <span className="text-sm font-semibold text-ink">总成本 ¥{f2(r.totalCost)}</span>
            </div>
            <div className="mt-2">
              <CostRow label="产品成本" value={`¥${f2(r.totalProductCost)}`} />
              <CostRow label="包装成本" value={`¥${f2(r.totalPackaging)}`} />
              <CostRow label="国内杂费" value={`¥${f2(r.totalDomesticMisc)}`} />
              <CostRow label="国际运费" value={`¥${f2(r.totalIntlFreight)}`} />
              <CostRow label="国内运费" value={`¥${f2(r.totalDomesticFreight)}`} />
              <CostRow label="退税抵扣" value={`¥${f2(r.totalRebate)}`} negative />
              <CostRow label="平台扣点" value={`¥${f2(r.totalPlatformFee)}`} />
              <CostRow label="收款手续费" value={`¥${f2(r.totalCollectionFee)}`} />
              <div className="flex items-center justify-between border-t border-slate-200 pt-2 mt-1 text-sm font-semibold">
                <span>当前报价到手</span>
                <span className="text-brand-600">¥{f2(r.currentProfitCNY + r.totalCost)}</span>
              </div>
            </div>
          </div>

          {/* Sales Copy Section */}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white">
            <button type="button" onClick={() => setShowCopy(!showCopy)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-ink">
              <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-brand-500" />报价话术</span>
              {showCopy ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {showCopy && (
              <div className="border-t border-slate-100 px-4 pb-4">
                {/* Email */}
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">邮件模板</p>
                    <Button size="sm" variant="ghost" onClick={() => copyEmail(copyData.email)}>
                      {copiedEmail ? <><Check className="mr-1 h-3.5 w-3.5" />已复制</> : <><Copy className="mr-1 h-3.5 w-3.5" />复制</>}
                    </Button>
                  </div>
                  <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap break-all">{copyData.email}</pre>
                </div>

                {/* WhatsApp */}
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">WhatsApp 模板</p>
                    <Button size="sm" variant="ghost" onClick={() => copyWA(copyData.whatsapp)}>
                      {copiedWA ? <><Check className="mr-1 h-3.5 w-3.5" />已复制</> : <><Copy className="mr-1 h-3.5 w-3.5" />复制</>}
                    </Button>
                  </div>
                  <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap break-all">{copyData.whatsapp}</pre>
                </div>

                {/* Talking Points */}
                <div className="mt-3">
                  <p className="text-xs font-medium text-slate-500">谈判要点</p>
                  <ul className="mt-2 space-y-2">
                    {copyData.points.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-600">
                        <button type="button" onClick={() => copyPoint(point)} className="mt-0.5 shrink-0 text-slate-400 hover:text-brand-500" aria-label="复制">
                          {copiedPoint ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* PI Preview Toggle */}
          {showPI && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">PI 预览</p>
                <Button size="sm" variant="outline" onClick={handleDownloadPI}>
                  <Download className="mr-1.5 h-4 w-4" />重新下载
                </Button>
              </div>
              <p className="mt-2 text-xs text-slate-500">PI 已生成为 HTML 文件，可在浏览器中打开后打印为 PDF 或直接发送给客户（记得替换买卖方信息）。</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
