// 工作台侧栏（桌面常驻 + 可收起为图标；移动端为抽屉）。
// 「跟单助手」作为直达项放在「业务」分组。
import { useEffect, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { ArrowLeftRight, Box, Calculator, Crown, FileText, Globe2, Home, Menu, MessageSquare, PanelLeftClose, PanelLeftOpen, ShieldCheck, UserCircle, Users, X } from 'lucide-react'
import { useMembership } from '../features/membership/MembershipContext'
import { adminApi } from '../features/membership/adminApi'
import { PRICING_SUMMARY } from '../features/membership/staticConfig'
import { getAdminToken, isBackendEnabled } from '../services/apiClient'

interface NavItem {
  to: string
  label: string
  icon: typeof Home
  badge?: string
}

const GROUPS: { label: string; items: NavItem[] }[] = [
  { label: '工作台', items: [{ to: '/', label: '首页', icon: Home }] },
  {
    label: '业务',
    items: [
      { to: '/documents', label: '外贸单据中心', icon: FileText },
      { to: '/follow-up', label: '跟单助手', icon: Users, badge: '新' },
    ],
  },
  {
    label: '工具箱',
    items: [
      { to: '/quote', label: '报价助手', icon: Calculator },
      { to: '/exchange', label: '汇率换算', icon: ArrowLeftRight },
      { to: '/world', label: '世界时间', icon: Globe2 },
    ],
  },
  { label: '账户', items: [{ to: '/membership', label: '会员中心', icon: Crown }, { to: '/contact', label: '联系站长', icon: MessageSquare }, { to: '/about', label: '关于 & 定制', icon: UserCircle }] },
]

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-soft">
        <Box className="h-5 w-5" aria-hidden="true" />
      </span>
      {collapsed ? null : (
        <span className="leading-tight">
          <span className="block text-[10px] font-semibold tracking-[0.16em] text-brand-600">本地外贸工作台</span>
          <span className="block text-sm font-semibold">Kyrie的外贸盒子</span>
        </span>
      )}
    </span>
  )
}

function NavContent({ onNavigate, collapsed }: { onNavigate?: () => void; collapsed?: boolean }) {
  const { snapshot } = useMembership()
  const backend = isBackendEnabled()
  const isAdmin = snapshot.user?.role === 'admin' || (backend ? !!getAdminToken() : adminApi.isLoggedIn())

  return (
    <nav className="space-y-5" aria-label="主导航">
      {GROUPS.map((group) => (
        <div key={group.label}>
          {collapsed ? null : (
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.label}</p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onNavigate}
                    aria-label={collapsed ? item.label : undefined}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `group flex min-h-[44px] items-center gap-3 rounded-xl border-l-[3px] px-3 text-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                        collapsed ? 'justify-center' : ''
                      } ${isActive ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-ink'}`
                    }
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                    {collapsed ? null : <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && item.badge ? (
                      <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">{item.badge}</span>
                    ) : null}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      {isAdmin ? (
        <div className={collapsed ? '' : 'mt-1 border-t border-slate-200 pt-4'}>
          <NavLink
            to="/admin"
            onClick={onNavigate}
            aria-label={collapsed ? '管理后台' : undefined}
            title={collapsed ? '管理后台' : undefined}
            className={({ isActive }) =>
              `group flex min-h-[44px] items-center gap-3 rounded-xl border-l-[3px] px-3 text-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${collapsed ? 'justify-center' : ''} ${isActive ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-transparent text-slate-600 hover:bg-amber-50/60 hover:text-amber-700'}`
            }
          >
            <ShieldCheck className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            {collapsed ? null : <span className="flex-1">管理后台</span>}
          </NavLink>
        </div>
      ) : null}
    </nav>
  )
}

export function Sidebar({ open, onClose, collapsed, onToggleCollapse }: { open: boolean; onClose: () => void; collapsed: boolean; onToggleCollapse: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const desktop: ReactNode = (
    <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-white transition-[width] duration-base lg:flex ${collapsed ? 'w-[76px]' : 'w-64'}`}>
      <div className={`flex items-center border-b border-slate-100 py-4 ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
        <Brand collapsed={collapsed} />
        {!collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="收起侧栏"
            className="rounded-lg p-1.5 text-slate-400 transition-colors duration-fast hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavContent collapsed={collapsed} />
      </div>
      <div className="border-t border-slate-100 px-4 py-3">
        {collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="展开侧栏"
            className="mx-auto block rounded-lg p-1.5 text-slate-400 transition-colors duration-fast hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <p className="text-[11px] leading-relaxed text-slate-400">
            数据默认保存在本机浏览器<br />{PRICING_SUMMARY.trial}，定制需求加微信聊
          </p>
        )}
      </div>
    </aside>
  )

  const drawer: ReactNode = open ? (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="导航菜单">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-pop">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <Brand />
          <button type="button" onClick={onClose} aria-label="关闭导航菜单" className="rounded-lg p-2 text-slate-500 transition-colors duration-fast hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavContent onNavigate={onClose} />
        </div>
      </aside>
    </div>
  ) : null

  return (
    <>
      {desktop}
      {drawer}
    </>
  )
}

// 移动端顶部汉堡按钮（与营销页共用同一视觉）。
export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="rounded-lg p-2 text-slate-600 transition-colors duration-fast hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 lg:hidden" aria-label="打开导航菜单" onClick={onClick}>
      <Menu className="h-5 w-5" />
    </button>
  )
}
