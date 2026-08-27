import { Box, Menu, ShieldCheck, Sparkles } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { Button } from './components/ui/button'
import { Sidebar } from './components/Sidebar'
import { MembershipProvider, useMembership } from './features/membership/MembershipContext'
import { WECHAT_ID } from './features/membership/staticConfig'
import { isBackendEnabled } from './services/apiClient'
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
import ContactPage from './pages/ContactPage'
import AboutPage from './pages/AboutPage'
import { UnlockPage } from './pages/UnlockPage'
import { WorldTimeBar } from './components/WorldTimeBar'

function AppHeader({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-emerald-950/10 bg-white/95 backdrop-blur-xl print:hidden">
      <div className="flex min-h-[64px] items-center justify-between gap-3 px-4 lg:px-8">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="打开导航菜单"
            onClick={onMenu}
          >
            <Menu className="h-5 w-5" />
          </button>
          <NavLink to="/" className="flex items-center gap-2 lg:hidden" aria-label="Kyrie的外贸盒子首页">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-lg shadow-emerald-900/15">
              <Box className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-semibold">Kyrie的外贸盒子</span>
          </NavLink>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700 xl:flex">
            <ShieldCheck className="h-4 w-4" />
            单据本地处理
          </span>
          <Button asChild size="sm">
            <Link to="/contact">联系站长</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

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
  if (entitlement.hasAccess) return children
  if (entitlement.phase === 'unavailable') {
    return <FeatureGate title="暂时无法验证会员状态" desc="请检查网络后刷新页面重试。" />
  }
  const expired = entitlement.phase === 'expired'
  return (
    <FeatureGate
      title={expired ? '免费试用已结束' : '登录后开启 30 天完整试用'}
      desc={expired
        ? '订阅后可继续使用全部工具：¥9.9/月、¥99/年，或一次买断 ¥199 永久使用。'
        : '注册登录即送 30 天完整试用，六类单据、跟单助手与全部工具开放。'}
    />
  )
}

function FeatureGate({ title, desc }: { title: string; desc: string }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16 text-center print:hidden">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
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

export function App() {
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <MembershipProvider>
      <div className="min-h-screen bg-paper text-ink">
        <a href="#main-content" className="sr-only z-[100] rounded-lg bg-white px-4 py-3 text-sm font-semibold text-brand-700 shadow focus:not-sr-only focus:fixed focus:left-4 focus:top-4">跳至主要内容</a>
        <div className="flex min-h-screen">
          <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
          <div className="flex min-w-0 flex-1 flex-col">
            <AppHeader onMenu={() => setMobileOpen(true)} />
            <WorldTimeBar />
            <div id="main-content" tabIndex={-1} className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/documents" element={<ProtectedFeature><DocumentCenterPage /></ProtectedFeature>} />
                <Route path="/follow-up" element={<ProtectedFeature><FollowUpPage /></ProtectedFeature>} />
                <Route path="/quote" element={<ProtectedFeature><QuotePage /></ProtectedFeature>} />
                <Route path="/exchange" element={<ProtectedFeature><ExchangePage /></ProtectedFeature>} />
                <Route path="/world" element={<ProtectedFeature><WorldTimePage /></ProtectedFeature>} />
                <Route path="/toolbox" element={<Navigate to="/quote" replace />} />
                <Route path="/membership" element={<MembershipPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/checkout/:plan" element={<CheckoutPage />} />
                <Route path="/unlock" element={<UnlockPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="*" element={<main className="mx-auto min-h-[70vh] max-w-3xl px-5 py-20 text-center"><h1 className="text-4xl font-semibold">页面不存在</h1><Button asChild className="mt-6"><Link to="/">返回首页</Link></Button></main>} />
              </Routes>
            </div>
            <footer className="border-t border-slate-200 bg-white px-5 py-8 text-center text-xs text-slate-500 print:hidden">Kyrie的外贸盒子 · 让外贸制单更清楚、更省心</footer>
          </div>
        </div>
      </div>
    </MembershipProvider>
  )
}
