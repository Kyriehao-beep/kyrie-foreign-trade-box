// 手机端工作台底部导航：首页 / 单据 / 跟单 / 工具 / 更多。
// 桌面端由侧栏承载，这里仅在 <lg 显示。
import { Home, FileText, Users, Calculator, MoreHorizontal, ArrowLeftRight, Globe2, Crown, MessageSquare, UserCircle, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useMembership } from '../features/membership/MembershipContext'
import { getAdminToken, isBackendEnabled } from '../services/apiClient'
import { adminApi } from '../features/membership/adminApi'

const PRIMARY = [
  { to: '/', label: '首页', icon: Home },
  { to: '/documents', label: '单据', icon: FileText },
  { to: '/follow-up', label: '跟单', icon: Users },
  { to: '/quote', label: '工具', icon: Calculator },
] as const

const MORE_ITEMS = [
  { to: '/exchange', label: '汇率换算', icon: ArrowLeftRight },
  { to: '/world', label: '世界时间', icon: Globe2 },
  { to: '/membership', label: '会员中心', icon: Crown },
  { to: '/contact', label: '联系站长', icon: MessageSquare },
  { to: '/about', label: '关于 & 定制', icon: UserCircle },
] as const

function itemClass(active: boolean) {
  return `flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
    active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
  }`
}

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const { snapshot } = useMembership()
  const isAdmin = snapshot.user?.role === 'admin' || (isBackendEnabled() ? !!getAdminToken() : adminApi.isLoggedIn())

  const moreActive = MORE_ITEMS.some((item) => item.to === location.pathname)

  return (
    <>
      <nav
        aria-label="底部导航"
        className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch gap-1 border-t border-line bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur-lg print:hidden lg:hidden"
      >
        {PRIMARY.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  isActive ? 'text-brand-700' : 'text-slate-500 hover:text-slate-700'
                }`
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </NavLink>
          )
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((value) => !value)}
          aria-label="更多功能"
          aria-expanded={moreOpen}
          className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
            moreOpen || moreActive ? 'text-brand-700' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          更多
        </button>
      </nav>

      {moreOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="更多功能">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMoreOpen(false)} aria-hidden="true" />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-panel border-t border-line bg-white p-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] print:hidden">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-200" />
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">更多功能</p>
            <ul className="space-y-0.5">
              {MORE_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.to}>
                    <NavLink to={item.to} onClick={() => setMoreOpen(false)} className={({ isActive }) => itemClass(isActive)}>
                      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                      {item.label}
                    </NavLink>
                  </li>
                )
              })}
              {isAdmin ? (
                <li>
                  <NavLink to="/admin" onClick={() => setMoreOpen(false)} className={itemClass(false) + ' text-amber-700'}>
                    <ShieldCheck className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                    管理后台
                  </NavLink>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  )
}
