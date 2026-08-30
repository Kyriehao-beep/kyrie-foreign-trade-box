import { Sparkles } from 'lucide-react'
import { type ReactNode } from 'react'
import { Link, Outlet, Route, Routes } from 'react-router-dom'
import { Button } from './components/ui/button'
import { MarketingLayout } from './components/layout/MarketingLayout'
import { WorkbenchLayout } from './components/layout/WorkbenchLayout'
import { MembershipProvider, useMembership } from './features/membership/MembershipContext'
import { PRICING_SUMMARY, WECHAT_ID } from './features/membership/staticConfig'
import { DocumentCenterPage } from './pages/DocumentCenterPage'
import { FollowUpPage } from './pages/FollowUpPage'
import { AuthPage } from './pages/AuthPage'
import { AdminPage } from './pages/AdminPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { HomePage } from './pages/HomePage'
import { MembershipPage } from './pages/MembershipPage'
import { QuotePage } from './pages/QuotePage'
import { ExchangePage } from './pages/ExchangePage'
import { WorldTimePage } from './pages/WorldTimePage'
import { CartonCbmPage } from './pages/CartonCbmPage'
import ContactPage from './pages/ContactPage'
import AboutPage from './pages/AboutPage'
import { UnlockPage } from './pages/UnlockPage'

export function ProtectedFeature({ children }: { children: ReactNode }) {
  const { snapshot, loading } = useMembership()
  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-20 text-center text-sm text-slate-500 print:hidden">
        正在验证会员状态……
      </div>
    )
  }
  const { entitlement } = snapshot
  if (entitlement.hasAccess) return <>{children}</>
  if (entitlement.phase === 'unavailable') {
    return <FeatureGate title="暂时无法验证会员状态" desc="请检查网络后刷新页面重试。" />
  }
  const expired = entitlement.phase === 'expired'
  return (
    <FeatureGate
      title={expired ? '免费试用已结束' : `登录后开启 ${PRICING_SUMMARY.trialDays} 天完整试用`}
      desc={expired
        ? `订阅后可继续使用全部工具：${PRICING_SUMMARY.monthly}、${PRICING_SUMMARY.yearly}，或${PRICING_SUMMARY.lifetime}（${PRICING_SUMMARY.lifetimeScope}）。${PRICING_SUMMARY.noAutoCharge}。`
        : `注册登录即送 ${PRICING_SUMMARY.trialDays} 天完整试用，六类单据、跟单助手与全部工具开放。`}
    />
  )
}

function FeatureGate({ title, desc }: { title: string; desc: string }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16 text-center print:hidden">
      <div className="rounded-panel border border-slate-200 bg-white p-8 shadow-soft">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <Sparkles className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-ink">{title}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">{desc}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg"><Link to="/membership">查看会员方案</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/auth">登录 / 注册</Link></Button>
        </div>
        <p className="mt-5 text-xs text-slate-400">付款后加微信 {WECHAT_ID} 领取解锁码，或登录后由站长直接开通。</p>
      </div>
    </main>
  )
}

function Marketing() {
  return <MarketingLayout><Outlet /></MarketingLayout>
}

function Workbench() {
  return <WorkbenchLayout><Outlet /></WorkbenchLayout>
}

export function App() {
  return (
    <MembershipProvider>
      <Routes>
        {/* 营销页：轻量导航，无世界时间条 */}
        <Route element={<Marketing />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/membership" element={<MembershipPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/checkout/:plan" element={<CheckoutPage />} />
          <Route path="/unlock" element={<UnlockPage />} />
        </Route>

        {/* 工作台：可折叠侧栏 + 世界时间条 + 移动底栏 */}
        <Route element={<Workbench />}>
          <Route path="/documents" element={<ProtectedFeature><DocumentCenterPage /></ProtectedFeature>} />
          <Route path="/follow-up" element={<ProtectedFeature><FollowUpPage /></ProtectedFeature>} />
          <Route path="/quote" element={<ProtectedFeature><QuotePage /></ProtectedFeature>} />
          <Route path="/exchange" element={<ProtectedFeature><ExchangePage /></ProtectedFeature>} />
          <Route path="/world" element={<ProtectedFeature><WorldTimePage /></ProtectedFeature>} />
          <Route path="/carton-cbm" element={<ProtectedFeature><CartonCbmPage /></ProtectedFeature>} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<main className="mx-auto min-h-[70vh] max-w-3xl px-5 py-20 text-center"><h1 className="text-4xl font-semibold">页面不存在</h1><Button asChild className="mt-6"><Link to="/">返回首页</Link></Button></main>} />
      </Routes>
    </MembershipProvider>
  )
}
