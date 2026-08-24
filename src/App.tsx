import { Box, LockKeyhole, Menu, RefreshCw, ShieldCheck, UserCircle, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { Button } from './components/ui/button'
import { MembershipProvider, useMembership } from './features/membership/MembershipContext'
import { TrialBanner } from './features/membership/TrialBanner'
import { DocumentCenterPage } from './pages/DocumentCenterPage'
import { FollowUpPage } from './pages/FollowUpPage'
import { AuthPage } from './pages/AuthPage'
import { AdminPage } from './pages/AdminPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { HomePage } from './pages/HomePage'
import { MembershipPage } from './pages/MembershipPage'
import { ToolboxPage } from './pages/ToolboxPage'
import { UnlockPage } from './pages/UnlockPage'
import { WorldTimeBar } from './components/WorldTimeBar'

const navigation = [
  { to: '/', label: '首页' },
  { to: '/documents', label: '外贸单据中心' },
  { to: '/toolbox', label: '贸商工具箱' },
  { to: '/membership', label: '会员中心' },
]

function AppHeader() {
  const [open, setOpen] = useState(false)
  const { snapshot, logout } = useMembership()
  return (
    <header className="sticky top-0 z-50 border-b border-emerald-950/10 bg-white/95 backdrop-blur-xl print:hidden">
      <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
        <NavLink to="/" className="flex items-center gap-3 py-3" aria-label="Kyrie的外贸盒子首页">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white shadow-lg shadow-emerald-900/15"><Box className="h-5 w-5" aria-hidden="true" /></span>
          <span><span className="block text-[10px] font-semibold tracking-[0.16em] text-brand-600">本地外贸工作台</span><span className="block font-semibold">Kyrie的外贸盒子</span></span>
        </NavLink>
        <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">{navigation.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => `rounded-full px-4 py-2 text-sm font-medium transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-ink'}`}>{item.label}</NavLink>)}</nav>
        <div className="hidden items-center gap-2 lg:flex">
          <span className="hidden items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700 xl:flex"><ShieldCheck className="h-4 w-4" />单据本地处理</span>
          {snapshot.user ? <><Link className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700" to={snapshot.user.role === 'admin' ? '/admin' : '/membership'}><UserCircle className="h-4 w-4" />{snapshot.user.username}</Link><Button variant="ghost" size="sm" onClick={() => void logout()}>退出</Button></> : <Button asChild size="sm"><Link to="/auth">登录 / 注册</Link></Button>}
        </div>
        <button className="rounded-lg p-2 text-slate-600 md:hidden" aria-label={open ? '关闭导航菜单' : '打开导航菜单'} onClick={() => setOpen((value) => !value)} type="button">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      {open ? <nav className="grid border-t border-slate-100 bg-white p-3 md:hidden" aria-label="移动导航">{navigation.map((item) => <NavLink onClick={() => setOpen(false)} key={item.to} to={item.to} className={({ isActive }) => `rounded-xl px-4 py-3 text-sm font-medium ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600'}`}>{item.label}</NavLink>)}{snapshot.user?.role === 'admin' ? <NavLink to="/admin" className="rounded-xl px-4 py-3 text-sm font-medium text-slate-600">管理后台</NavLink> : null}{snapshot.user ? <Button variant="ghost" onClick={() => void logout()}>退出登录</Button> : <Button asChild><Link to="/auth">登录 / 注册</Link></Button>}</nav> : null}
    </header>
  )
}

export function ProtectedFeature({ children }: { children: ReactNode }) {
  const { snapshot, loading, refresh } = useMembership()
  if (loading) return <main className="grid min-h-[70vh] place-items-center px-5"><p className="text-sm text-slate-600">正在安全验证会员状态……</p></main>
  if (snapshot.user?.passwordResetRequired) return <main className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-5 py-16"><div className="w-full rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-soft sm:p-12"><LockKeyhole className="mx-auto h-10 w-10 text-amber-700" /><h1 className="mt-5 text-3xl font-semibold">请先更换临时密码</h1><p className="mt-3 text-slate-600">为保护账号安全，更换密码后才能继续使用。</p><Button asChild className="mt-6"><Link to="/auth">前往更换密码</Link></Button></div></main>
  if (snapshot.entitlement.hasAccess) return children

  const unavailable = snapshot.entitlement.phase === 'unavailable'
  const anonymous = snapshot.entitlement.phase === 'anonymous'
  const suspended = snapshot.entitlement.phase === 'suspended'
  const title = unavailable ? '暂时无法验证会员状态' : suspended ? '账号已停用' : anonymous ? '登录后开启 3 天完整试用' : '3 天完整试用已结束'
  const description = unavailable ? '为了保护您的会员权益，系统无法连接服务器时不会放行付费功能。请检查网络后重试。' : suspended ? '请联系人工客服核实账号状态，恢复后即可继续使用。' : anonymous ? '创建账号即可免费使用全部功能 72 小时，无需绑定银行卡。' : '试用已结束。付款后由管理员发放解锁码，输入即可继续使用。'
  return <main className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-5 py-16"><div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft sm:p-12"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">{unavailable ? <RefreshCw className="h-6 w-6" /> : <LockKeyhole className="h-6 w-6" />}</span><h1 className="mt-6 text-3xl font-semibold">{title}</h1><p className="mx-auto mt-4 max-w-xl leading-7 text-slate-600">{description}</p>{unavailable ? <Button className="mt-7" onClick={() => void refresh()}>重新验证</Button> : !suspended ? <div className="mt-7 flex flex-wrap justify-center gap-3"><Button asChild><Link to={anonymous ? '/auth' : '/membership'}>{anonymous ? '登录 / 注册' : '查看会员方案'}</Link></Button><Button asChild variant="outline"><Link to="/unlock">我有解锁码</Link></Button></div> : null}</div></main>
}

export function App() {
  return (
    <MembershipProvider>
      <div className="min-h-screen bg-paper text-ink">
        <a href="#main-content" className="sr-only z-[100] rounded-lg bg-white px-4 py-3 text-sm font-semibold text-brand-700 shadow focus:not-sr-only focus:fixed focus:left-4 focus:top-4">跳至主要内容</a>
        <AppHeader />
        <WorldTimeBar />
        <TrialBanner />
        <div id="main-content" tabIndex={-1}><Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/documents" element={<ProtectedFeature><DocumentCenterPage /></ProtectedFeature>} />
          <Route path="/follow-up" element={<ProtectedFeature><FollowUpPage /></ProtectedFeature>} />
          <Route path="/toolbox" element={<ProtectedFeature><ToolboxPage /></ProtectedFeature>} />
          <Route path="/membership" element={<MembershipPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/checkout/:plan" element={<CheckoutPage />} />
          <Route path="/unlock" element={<UnlockPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<main className="mx-auto min-h-[70vh] max-w-3xl px-5 py-20 text-center"><h1 className="text-4xl font-semibold">页面不存在</h1><Button asChild className="mt-6"><Link to="/">返回首页</Link></Button></main>} />
        </Routes></div>
        <footer className="border-t border-slate-200 bg-white px-5 py-8 text-center text-xs text-slate-500 print:hidden">Kyrie的外贸盒子 · 让外贸制单更清楚、更省心</footer>
      </div>
    </MembershipProvider>
  )
}
