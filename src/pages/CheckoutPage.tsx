import { CreditCard, QrCode } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { useMembership } from '../features/membership/MembershipContext'
import { PLANS, WECHAT_ID, CONTACT_TIP } from '../features/membership/staticConfig'
import type { PlanId } from '../features/membership/types'

const validPlans = new Set<PlanId>(['monthly', 'yearly', 'lifetime'])

export function CheckoutPage() {
  const { plan } = useParams()
  const planId = plan as PlanId
  const { snapshot } = useMembership()
  const selected = PLANS.find((p) => p.id === planId) ?? null
  const [method, setMethod] = useState<'wechat' | 'alipay'>('wechat')
  const [imgError, setImgError] = useState(false)

  if (!validPlans.has(planId) || !selected) return <Navigate to="/membership" replace />

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 lg:py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">开通{selected.name}</h1>
        <p className="mt-3 text-slate-600">
          应付金额：<span className="font-semibold text-ink">¥{selected.amountCny}</span>。采用人工核对，无需接入复杂支付系统。
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-brand-600" />
            <div>
              <h2 className="text-xl font-semibold">第一步：扫码付款</h2>
              <p className="text-sm text-slate-500">付款金额请严格按上方金额支付</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-5 flex gap-2">
            <Button type="button" variant={method === 'wechat' ? 'default' : 'outline'} onClick={() => { setMethod('wechat'); setImgError(false) }}>
              微信支付
            </Button>
            <Button type="button" variant={method === 'alipay' ? 'default' : 'outline'} onClick={() => { setMethod('alipay'); setImgError(false) }}>
              支付宝
            </Button>
          </div>
          {imgError ? (
            <div className="mx-auto mb-4 w-full max-w-xs rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              收款码图片待上传。<br />请微信联系：<span className="font-semibold text-ink">{WECHAT_ID}</span>
            </div>
          ) : (
            <img
              className="mx-auto mb-4 aspect-square w-full max-w-xs rounded-2xl border border-slate-200 object-contain"
              src={`${import.meta.env.BASE_URL}pay/${method}.png`}
              alt={method === 'wechat' ? '微信收款码' : '支付宝收款码'}
              onError={() => setImgError(true)}
            />
          )}
          <p className="text-center text-sm text-slate-600">{CONTACT_TIP}</p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="p-8 text-center">
          <QrCode className="mx-auto h-10 w-10 text-brand-600" />
          <h2 className="mt-4 text-xl font-semibold">第二步：领取解锁码</h2>
          <p className="mt-2 text-sm text-slate-600">
            付款后加微信 <span className="font-semibold text-ink">{WECHAT_ID}</span>，备注「外贸盒子+{selected.name}」，管理员会发你专属解锁码。
          </p>
          <Button asChild className="mt-6">
            <Link to="/unlock">我已付款，去输入解锁码</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
