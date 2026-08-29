import { Check, Crown, Shield, UserCog, WalletCards } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { useMembership } from '../features/membership/MembershipContext'
import { PLANS, PRICING_SUMMARY } from '../features/membership/staticConfig'
import type { PlanSummary } from '../features/membership/types'

// 价格以 staticConfig 为唯一来源；这里的 fallback 直接复用，避免两处口径不一致。
const fallbackPlans: PlanSummary[] = PLANS

const phaseLabels: Record<string, string> = {
  anonymous: '未登录', trialing: '试用中', expired: '试用已到期', active_monthly: '月度会员', active_yearly: '年度会员', active_lifetime: '本地买断版', suspended: '账号已停用', admin: '管理员', unavailable: '暂时无法验证',
}

export function MembershipPage() {
  const { snapshot, getPlans } = useMembership()
  const [plans, setPlans] = useState(fallbackPlans)
  useEffect(() => { void getPlans().then(setPlans).catch(() => undefined) }, [getPlans])

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
      <section className="mx-auto max-w-3xl text-center">
        <Badge>简单、透明、无次数收费</Badge>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">先完整试用，再决定是否付费</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">
          新用户{PRICING_SUMMARY.trial}，六类单据、跟单助手和全部工具完整开放。到期后选择 {PRICING_SUMMARY.monthly} 或 {PRICING_SUMMARY.yearly} 订阅，也可选择{PRICING_SUMMARY.lifetime}。不按生成次数计费、{PRICING_SUMMARY.noAutoCharge}。
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          {PRICING_SUMMARY.lifetimeScope}；{PRICING_SUMMARY.lifetimeExcludes}。未来的 AI 与云服务上线后按各自方式单独提供。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2"><Badge className="bg-white text-slate-700">当前状态：{phaseLabels[snapshot.entitlement.phase] ?? '未知'}</Badge>{snapshot.user ? <Badge className="bg-white text-slate-700">账号：{snapshot.user.username}</Badge> : null}</div>
      </section>

      <section className="mt-12 grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => <Card key={plan.id} className={plan.id === 'yearly' ? 'relative border-brand-500 ring-2 ring-brand-100' : ''}>
          {plan.id === 'yearly' ? <Badge className="absolute -top-3 left-5 bg-brand-600 text-white">更适合长期使用</Badge> : null}
          <CardHeader><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{plan.name}</h2><WalletCards className="h-5 w-5 text-brand-600" /></div><p className="mt-2 text-sm text-slate-500">{plan.note}</p></CardHeader>
          <CardContent><p><span className="text-4xl font-semibold tracking-tight">¥{plan.amountCny}</span><span className="ml-1 text-sm text-slate-500">{plan.suffix}</span></p>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              {['六类外贸单据', '跟单助手（优先级/时间线/业务剧本）', 'PDF 与 Excel 导出', '贸商工具箱']
                .concat(plan.id === 'lifetime' ? [PRICING_SUMMARY.lifetimeScope] : ['订阅期内可继续使用后续上线的工具'])
                .map((item) => <li className="flex gap-2" key={item}><Check className="h-4 w-4 shrink-0 text-brand-600" />{item}</li>)}
            </ul>
            <Button asChild className="mt-7 w-full"><Link to={snapshot.user ? `/checkout/${plan.id}` : '/auth'}>{snapshot.user ? '选择此方案' : '登录后购买'}</Link></Button>
          </CardContent>
        </Card>)}
      </section>

      <section className="mt-14 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card><CardHeader><div className="flex items-center gap-3"><UserCog className="h-6 w-6 text-brand-600" /><div><h2 className="text-xl font-semibold">管理员席位</h2><p className="text-sm text-slate-500">系统仅预留三个邀请制管理员，不计入普通用户订阅</p></div></div></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3">{['一', '二', '三'].map((seat) => <div key={seat} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><Shield className="h-5 w-5 text-brand-600" /><p className="mt-3 font-semibold">管理员席位{seat}</p><p className="mt-1 text-xs text-slate-500">通过服务器环境变量邀请</p></div>)}</CardContent></Card>
        <Card><CardHeader><div className="flex items-center gap-3"><Crown className="h-6 w-6 text-ocean" /><div><h2 className="text-xl font-semibold">本地买断版说明</h2><p className="text-sm text-slate-500">{PRICING_SUMMARY.lifetimeScope}</p></div></div></CardHeader><CardContent><p className="text-sm leading-6 text-slate-600">买断版一次付费 {PRICING_SUMMARY.lifetime}，可以一直使用<strong>购买时已经上线的本地功能</strong>，不受订阅到期影响。需要说清楚的是：{PRICING_SUMMARY.lifetimeExcludes}——这几项会按各自的方式单独提供，不承诺"以后所有新东西都免费"。不搞增值包，也不自动扣费。</p></CardContent></Card>
      </section>
    </main>
  )
}
