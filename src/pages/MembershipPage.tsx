import { Check, Crown, Shield, UserCog, WalletCards } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { useMembership } from '../features/membership/MembershipContext'
import type { PlanSummary } from '../features/membership/types'

const fallbackPlans: PlanSummary[] = [
  { id: 'monthly', name: '月度会员', amountCny: 9.9, durationDays: 30, suffix: '/月', note: '完整使用全部工具，随时可取消' },
  { id: 'yearly', name: '年度会员', amountCny: 99, durationDays: 365, suffix: '/年', note: '比月付省约 ¥20，平均每天不到 0.3 元' },
  { id: 'lifetime', name: '买断（永久）', amountCny: 199, durationDays: null, suffix: '/永久', note: '一次付费，现有 + 未来所有工具永久免费' },
]

const phaseLabels: Record<string, string> = {
  anonymous: '未登录', trialing: '试用中', expired: '试用已到期', active_monthly: '月度会员', active_yearly: '年度会员', active_lifetime: '永久会员', suspended: '账号已停用', admin: '管理员', unavailable: '暂时无法验证',
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
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">新用户免费试用 30 天，六类单据、跟单助手和全部工具完整开放。到期后选择订阅或买断，不按生成次数计费。</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2"><Badge className="bg-white text-slate-700">当前状态：{phaseLabels[snapshot.entitlement.phase] ?? '未知'}</Badge>{snapshot.user ? <Badge className="bg-white text-slate-700">账号：{snapshot.user.username}</Badge> : null}</div>
      </section>

      <section className="mt-12 grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => <Card key={plan.id} className={plan.id === 'yearly' ? 'relative border-brand-500 ring-2 ring-brand-100' : ''}>
          {plan.id === 'yearly' ? <Badge className="absolute -top-3 left-5 bg-brand-600 text-white">更适合长期使用</Badge> : null}
          <CardHeader><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{plan.name}</h2><WalletCards className="h-5 w-5 text-brand-600" /></div><p className="mt-2 text-sm text-slate-500">{plan.note}</p></CardHeader>
          <CardContent><p><span className="text-4xl font-semibold tracking-tight">¥{plan.amountCny}</span><span className="ml-1 text-sm text-slate-500">{plan.suffix}</span></p>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">{['六类外贸单据', '跟单助手（优先级/时间线/业务剧本）', 'PDF 与 Excel 导出', '贸商工具箱及后续新工具'].map((item) => <li className="flex gap-2" key={item}><Check className="h-4 w-4 shrink-0 text-brand-600" />{item}</li>)}</ul>
            <Button asChild className="mt-7 w-full"><Link to={snapshot.user ? `/checkout/${plan.id}` : '/auth'}>{snapshot.user ? '选择此方案' : '登录后购买'}</Link></Button>
          </CardContent>
        </Card>)}
      </section>

      <section className="mt-14 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card><CardHeader><div className="flex items-center gap-3"><UserCog className="h-6 w-6 text-brand-600" /><div><h2 className="text-xl font-semibold">管理员席位</h2><p className="text-sm text-slate-500">系统仅预留三个邀请制管理员，不计入普通用户订阅</p></div></div></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3">{['一', '二', '三'].map((seat) => <div key={seat} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><Shield className="h-5 w-5 text-brand-600" /><p className="mt-3 font-semibold">管理员席位{seat}</p><p className="mt-1 text-xs text-slate-500">通过服务器环境变量邀请</p></div>)}</CardContent></Card>
        <Card><CardHeader><div className="flex items-center gap-3"><Crown className="h-6 w-6 text-ocean" /><div><h2 className="text-xl font-semibold">总包说明</h2><p className="text-sm text-slate-500">一次付费，终身使用，未来新工具全免费</p></div></div></CardHeader><CardContent><p className="text-sm leading-6 text-slate-600">这个工作台我会持续更新——装箱计算、客户管理、开发信生成、更多外贸工具正在打磨中。买了总包，等于把现在和未来的所有工具都打包带走，后续上线新功能<strong>不需要再付一分钱</strong>。不搞订阅套路，不搞增值包，一次买断，越用越值。</p></CardContent></Card>
      </section>
    </main>
  )
}
