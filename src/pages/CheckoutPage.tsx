import { CheckCircle2, CreditCard, Loader2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { useMembership } from '../features/membership/MembershipContext'
import type { PaymentOrder, PlanId, PlanSummary } from '../features/membership/types'

const validPlans = new Set<PlanId>(['monthly', 'yearly', 'lifetime'])

export function CheckoutPage() {
  const { plan } = useParams()
  const planId = plan as PlanId
  const { snapshot, loading, createOrder, claimOrder, getPlans, getOwnOrders } = useMembership()
  const [selected, setSelected] = useState<PlanSummary | null>(null)
  const [order, setOrder] = useState<PaymentOrder | null>(null)
  const [method, setMethod] = useState<'wechat' | 'alipay'>('wechat')
  const [payerHint, setPayerHint] = useState('')
  const [paidAt, setPaidAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [restoring, setRestoring] = useState(true)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    let active = true
    if (!snapshot.user || !validPlans.has(planId)) { setRestoring(false); return () => { active = false } }
    setRestoring(true)
    Promise.all([getPlans(), getOwnOrders()])
      .then(([plans, orders]) => {
        if (!active) return
        const nextPlan = plans.find((item) => item.id === planId) ?? null
        const current = orders.find((item) => item.plan === planId && ['awaiting_payment', 'pending_review'].includes(item.status)) ?? null
        setSelected(nextPlan)
        setOrder(current)
        setSubmitted(current?.status === 'pending_review')
        if (current?.paymentMethod) setMethod(current.paymentMethod)
      })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : '订单信息载入失败') })
      .finally(() => { if (active) setRestoring(false) })
    return () => { active = false }
  }, [snapshot.user, planId, getPlans, getOwnOrders])

  if (!validPlans.has(planId)) return <Navigate to="/membership" replace />
  if (loading) return <main className="grid min-h-[65vh] place-items-center text-sm text-slate-600">正在验证账号……</main>
  if (!snapshot.user) return <Navigate to="/auth" replace />
  if (restoring) return <main className="grid min-h-[65vh] place-items-center text-sm text-slate-600">正在恢复订单信息……</main>

  async function startOrder() {
    setBusy(true); setError('')
    try {
      const next = await createOrder(planId)
      setOrder(next)
      setSubmitted(next.status === 'pending_review')
    } catch (reason) { setError(reason instanceof Error ? reason.message : '暂时无法创建订单') } finally { setBusy(false) }
  }

  async function submitClaim(event: FormEvent) {
    event.preventDefault()
    if (!order || !paidAt) return
    setBusy(true); setError('')
    try {
      setOrder(await claimOrder(order.orderId, { paymentMethod: method, payerHint, paidAtClaimed: new Date(paidAt).toISOString() }))
      setSubmitted(true)
    } catch (reason) { setError(reason instanceof Error ? reason.message : '提交失败，请稍后重试') } finally { setBusy(false) }
  }

  const planName = selected?.name ?? '会员方案'
  const displayedAmount = order?.amountCny ?? selected?.amountCny
  return <main className="mx-auto max-w-3xl px-5 py-12 lg:py-16">
    <div className="mb-8"><h1 className="text-3xl font-semibold">开通{planName}</h1><p className="mt-3 text-slate-600">{displayedAmount == null ? '价格正在从服务器读取。' : <>应付金额：<span className="font-semibold text-ink">¥{displayedAmount}</span>。</>}采用人工核对，无需接入复杂支付系统。</p></div>
    {error && !order ? <p className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p> : null}
    {submitted ? <Card><CardContent className="p-8 text-center"><CheckCircle2 aria-hidden="true" className="mx-auto h-12 w-12 text-brand-600" /><h2 className="mt-5 text-2xl font-semibold">付款信息已提交</h2><p className="mt-3 break-all text-sm text-slate-600">订单号：{order?.orderId}</p><p className="mt-2 text-slate-600">管理员核对收款后会人工开通。请勿重复付款。</p><Button asChild className="mt-6"><Link to="/membership">返回会员中心</Link></Button></CardContent></Card> : !order ? <Card><CardHeader><div className="flex items-center gap-3"><CreditCard aria-hidden="true" className="h-6 w-6 text-brand-600" /><div><h2 className="text-xl font-semibold">第一步：创建付款申请</h2><p className="text-sm text-slate-500">订单金额由服务器生成，前端无法修改</p></div></div></CardHeader><CardContent><Button onClick={() => void startOrder()} disabled={busy || !selected}>{busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}创建订单</Button></CardContent></Card> : <Card><CardHeader><h2 className="text-xl font-semibold">第二步：扫码付款并提交核对信息</h2><p className="mt-2 break-all text-sm text-slate-500">订单号：{order.orderId}</p><p className="mt-2 text-sm font-semibold text-amber-800">付款备注请填写上方订单号，便于快速核对。</p><p className="mt-2 text-sm font-semibold text-ink">本订单应付：¥{order.amountCny}</p></CardHeader><CardContent><div className="mb-5 flex gap-2"><Button type="button" variant={method === 'wechat' ? 'default' : 'outline'} onClick={() => setMethod('wechat')}>微信支付</Button><Button type="button" variant={method === 'alipay' ? 'default' : 'outline'} onClick={() => setMethod('alipay')}>支付宝</Button></div><div className="mx-auto mb-6 w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-4"><img className="aspect-square w-full object-contain" width="320" height="320" src={`/api/payment/qr/${method}`} alt={method === 'wechat' ? '微信收款码' : '支付宝收款码'} /></div><form className="space-y-4" onSubmit={submitClaim}><label className="block text-sm font-medium">付款人姓名或备注<Input className="mt-2" name="payerHint" value={payerHint} onChange={(event) => setPayerHint(event.target.value)} autoComplete="off" minLength={2} maxLength={64} required placeholder="例如：微信付款-Kyrie…" /></label><label className="block text-sm font-medium">实际付款时间<Input className="mt-2" name="paidAt" type="datetime-local" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} required /></label>{error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p> : null}<Button className="w-full" disabled={busy} type="submit">我已付款，提交人工核对</Button></form></CardContent></Card>}
  </main>
}
