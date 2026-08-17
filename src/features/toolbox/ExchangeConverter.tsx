import { ArrowRightLeft, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { loadRates, type RateResult } from '../../services/rates'

const currencies = [{ code: 'USD', name: '美元' }, { code: 'CNY', name: '人民币' }, { code: 'EUR', name: '欧元' }, { code: 'GBP', name: '英镑' }, { code: 'JPY', name: '日元' }, { code: 'HKD', name: '港币' }, { code: 'AUD', name: '澳元' }, { code: 'CAD', name: '加元' }, { code: 'SGD', name: '新加坡元' }, { code: 'AED', name: '阿联酋迪拉姆' }]

export function ExchangeConverter() {
  const [amount, setAmount] = useState(1000)
  const [from, setFrom] = useState('USD')
  const [to, setTo] = useState('CNY')
  const [result, setResult] = useState<RateResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    void loadRates(from).then((next) => { if (active) { setResult(next); setLoading(false) } })
    return () => { active = false }
  }, [from])

  const converted = useMemo(() => amount * (result?.rates[to] ?? 0), [amount, result, to])
  const selectClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-100'

  return (
    <Card className="p-5 lg:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-brand-600">汇率换算</p><h2 className="mt-1 text-2xl font-semibold">常用币种快速折算</h2></div>{result ? <Badge className={result.source === '在线' ? '' : 'bg-amber-50 text-amber-700'}>{result.source === '在线' ? '在线汇率' : '当前使用离线参考汇率'}</Badge> : null}</div>
      <div className="mt-7 grid items-end gap-4 md:grid-cols-[1fr_1fr_auto_1fr]">
        <label className="text-xs font-medium text-slate-600">金额<Input className="mt-1.5" type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></label>
        <label className="text-xs font-medium text-slate-600">从<select className={`${selectClass} mt-1.5`} value={from} onChange={(event) => setFrom(event.target.value)}>{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.name}（{currency.code}）</option>)}</select></label>
        <Button type="button" variant="outline" aria-label="交换币种" onClick={() => { setFrom(to); setTo(from) }}><ArrowRightLeft className="h-4 w-4" /></Button>
        <label className="text-xs font-medium text-slate-600">换算为<select className={`${selectClass} mt-1.5`} value={to} onChange={(event) => setTo(event.target.value)}>{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.name}（{currency.code}）</option>)}</select></label>
      </div>
      <div className="mt-6 rounded-2xl bg-ink p-6 text-white"><p className="text-xs text-white/60">换算结果</p><p className="mt-2 text-3xl font-semibold tabular-nums">{loading ? <RefreshCw className="h-6 w-6 animate-spin" /> : `${converted.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} ${to}`}</p><p className="mt-3 text-xs text-white/50">汇率日期：{result?.asOf ?? '正在获取'}。金额仅供业务估算，结算以银行或支付机构为准。</p></div>
    </Card>
  )
}
