import { Calculator, Info } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { loadRates } from '../../services/rates'

type Mode = 'FOB' | 'CIF'

interface Params {
  purchaseTaxIncl: number
  vatRate: number
  rebateRate: number
  qty: number
  domestic: number
  freight: number
  insuranceRate: number
  commissionRate: number
  margin: number
  fxRate: number
  mode: Mode
}

const num = (v: number): number => (Number.isFinite(v) ? v : 0)
const f2 = (n: number): string => num(n).toLocaleString('zh-CN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
const f0 = (n: number): string => Math.round(num(n)).toLocaleString('zh-CN')

function compute(p: Params) {
  const purchaseTaxIncl = num(p.purchaseTaxIncl)
  const vat = num(p.vatRate) / 100
  const rebate = num(p.rebateRate) / 100
  const qty = num(p.qty) || 1
  const domestic = num(p.domestic)
  const freight = p.mode === 'CIF' ? num(p.freight) : 0
  const insRate = p.mode === 'CIF' ? num(p.insuranceRate) / 100 : 0
  const commission = num(p.commissionRate) / 100
  const margin = num(p.margin) / 100
  const fx = num(p.fxRate) || 1

  const netPurchase = purchaseTaxIncl / (1 + vat)
  const rebateAmt = netPurchase * rebate
  const actualCost = purchaseTaxIncl - rebateAmt
  const fobCost = actualCost + domestic

  let baseCost: number
  let insurance = 0
  if (p.mode === 'CIF') {
    baseCost = (fobCost + freight) / (1 - insRate)
    insurance = baseCost * insRate
  } else {
    baseCost = fobCost
  }

  const deduction = commission + margin
  const quoteCNY = deduction >= 1 ? 0 : baseCost / (1 - deduction)
  const quoteUSD = fx > 0 ? quoteCNY / fx : 0
  const revenueNet = quoteCNY * (1 - commission)
  const profit = revenueNet - baseCost
  const profitRate = quoteCNY > 0 ? profit / quoteCNY : 0

  return { actualCost, rebateAmt, fobCost, freight, insurance, baseCost, quoteCNY, quoteUSD, profit, profitRate, totalCNY: quoteCNY * qty }
}

function reverseCeiling(p: Params, targetUSD: number) {
  const fx = num(p.fxRate) || 1
  const targetCNY = num(targetUSD) * fx
  const vat = num(p.vatRate) / 100
  const rebate = num(p.rebateRate) / 100
  const domestic = num(p.domestic)
  const freight = p.mode === 'CIF' ? num(p.freight) : 0
  const insRate = p.mode === 'CIF' ? num(p.insuranceRate) / 100 : 0
  const commission = num(p.commissionRate) / 100
  const margin = num(p.margin) / 100
  const deduction = commission + margin

  const maxBaseCost = deduction >= 1 ? 0 : targetCNY * (1 - deduction)
  const maxFob = p.mode === 'CIF' ? maxBaseCost * (1 - insRate) - freight - domestic : maxBaseCost - domestic
  const factor = rebate / (1 + vat)
  const maxPurchaseTaxIncl = maxFob > 0 ? maxFob / (1 - factor) : 0
  return { maxPurchaseTaxIncl }
}

export function QuoteCalculator() {
  const [mode, setMode] = useState<Mode>('FOB')
  const [fxRate, setFxRate] = useState(7.2)
  const [fxSource, setFxSource] = useState<'在线' | '离线参考' | ''>('')
  const [targetUSD, setTargetUSD] = useState(8)
  const [p, setP] = useState<Omit<Params, 'fxRate' | 'mode'>>({
    purchaseTaxIncl: 50,
    vatRate: 13,
    rebateRate: 13,
    qty: 1000,
    domestic: 2,
    freight: 3,
    insuranceRate: 0.3,
    commissionRate: 0,
    margin: 10,
  })

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

  const set = (key: keyof typeof p) => (value: number) => setP((prev) => ({ ...prev, [key]: value }))
  const params: Params = { ...p, fxRate, mode }
  const r = useMemo(() => compute(params), [params])
  const rev = useMemo(() => reverseCeiling(params, targetUSD), [params, targetUSD])
  const profitable = p.purchaseTaxIncl <= rev.maxPurchaseTaxIncl
  const invalid = num(p.commissionRate) + num(p.margin) >= 100

  return (
    <Card id="quote-calculator" className="p-5 lg:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm font-semibold text-brand-600">外贸报价计算器</p><h2 className="mt-1 text-2xl font-semibold">算清报价、利润与退税</h2></div>
        <div className="flex rounded-xl border border-slate-200 p-1">
          {(['FOB', 'CIF'] as Mode[]).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`h-9 rounded-lg px-4 text-sm font-medium transition ${mode === m ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-brand-700'}`}>{m}</button>
          ))}
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NumField label="采购含税价" suffix="元/件" value={p.purchaseTaxIncl} onChange={set('purchaseTaxIncl')} />
        <NumField label="增值税率" suffix="%" value={p.vatRate} onChange={set('vatRate')} />
        <NumField label="出口退税率" suffix="%" value={p.rebateRate} onChange={set('rebateRate')} />
        <NumField label="数量" suffix="件" value={p.qty} onChange={set('qty')} />
        <NumField label="国内费用" suffix="元/件" value={p.domestic} onChange={set('domestic')} />
        {mode === 'CIF' ? (
          <>
            <NumField label="国际运费" suffix="元/件" value={p.freight} onChange={set('freight')} />
            <NumField label="保险费率" suffix="%" value={p.insuranceRate} onChange={set('insuranceRate')} />
          </>
        ) : null}
        <NumField label="佣金率" suffix="%" value={p.commissionRate} onChange={set('commissionRate')} />
        <NumField label="目标毛利率" suffix="%" value={p.margin} onChange={set('margin')} />
        <NumField label={`汇率 (USD→CNY)${fxSource ? ` · ${fxSource}` : ''}`} value={fxRate} onChange={setFxRate} step={0.0001} />
      </div>

      <div className="mt-6 rounded-2xl bg-ink p-6 text-white">
        <p className="text-xs text-white/60">单件报价与利润（{mode}）</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="美金报价" value={`$${f2(r.quoteUSD)}`} big />
          <Metric label="人民币报价" value={`¥${f2(r.quoteCNY)}`} />
          <Metric label="单件利润" value={`¥${f2(r.profit)}`} />
          <Metric label="毛利率" value={`${(r.profitRate * 100).toFixed(1)}%`} />
        </div>
        <p className="mt-4 text-xs text-white/50">退税后实际采购成本 ¥{f2(r.actualCost)}/件（退税 ¥{f2(r.rebateAmt)}）· 整单合计 ¥{f0(r.totalCNY)}（{f0(p.qty)} 件）。{mode === 'CIF' ? `含国际运费 ¥${f2(r.freight)}、保险 ¥${f2(r.insurance)}。` : ''}</p>
      </div>

      {invalid ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">佣金率与毛利率之和不能超过 100%。</p>
      ) : (
        <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
          <p className="text-sm font-semibold text-brand-700">反推：客户目标价下的成本上限</p>
          <div className="mt-4 grid items-end gap-4 sm:grid-cols-[1fr_auto]">
            <NumField label="客户目标美金售价" suffix="$/件" value={targetUSD} onChange={setTargetUSD} />
            <div className="pb-1 text-sm text-slate-600">最高可接采购含税价 <span className="text-lg font-semibold text-ink">¥{f2(rev.maxPurchaseTaxIncl)}</span>/件</div>
          </div>
          <p className={`mt-3 text-sm ${profitable ? 'text-emerald-700' : 'text-amber-700'}`}>{profitable ? `当前采购含税价 ¥${f2(p.purchaseTaxIncl)} ≤ 上限，可达目标毛利率。` : `当前采购含税价 ¥${f2(p.purchaseTaxIncl)} 已超过上限，按此目标价成交会低于目标毛利率。`}</p>
        </div>
      )}

      <p className="mt-4 flex items-start gap-2 text-xs text-slate-400"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>结果仅供业务估算，未含杂费与汇率波动；实际成交以合同、银行结算与退税为准。</span></p>
    </Card>
  )
}

function NumField({ label, value, onChange, suffix, step }: { label: string; value: number; onChange: (v: number) => void; suffix?: string; step?: number }) {
  return (
    <label className="text-xs font-medium text-slate-600">{label}{suffix ? <span className="ml-1 text-slate-400">({suffix})</span> : null}
      <Input className="mt-1.5" type="number" step={step ?? 'any'} value={Number.isFinite(value) ? value : ''} aria-label={label} onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} />
    </label>
  )
}

function Metric({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div>
      <p className="text-xs text-white/60">{label}</p>
      <p className={`mt-1 font-semibold tabular-nums ${big ? 'text-3xl' : 'text-xl'}`}>{value}</p>
    </div>
  )
}
