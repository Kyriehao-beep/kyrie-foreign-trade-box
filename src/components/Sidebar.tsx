// 左侧分组导航（桌面常驻 + 移动抽屉）。
// 把「跟单助手」作为直达项放在「业务」分组，解决原先只能回首页下滑才能进入的问题。
import { useEffect, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Box, CreditCard, FileText, Home, ShieldCheck, Users, Wrench, X } from 'lucide-react'
import { useMembership } from '../features/membership/MembershipContext'
import { adminApi } from '../features/membership/adminApi'
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
  { label: '工具箱', items: [{ to: '/toolbox', label: '贸商工具箱', icon: Wrench }] },
  { label: '账户', items: [{ to: '/membership', label: '会员中心', icon: CreditCard }] },
]

function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-lg shadow-emerald-900/15">
        <Box className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="leading-tight">
        <span className="block text-[10px] font-semibold tracking-[0.16em] text-brand-600">本地外贸工作台</span>
        <span className="block text-sm font-semibold">Kyrie的外贸盒子</span>
      </span>
    </span>
  )
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const { snapshot } = useMembership()
  const backend = isBackendEnabled()
  // 管理后台入口只在「已登录站长」可见：本地模式看本地管理员标记，后端模式看 admin token。
  const isAdmin =
    snapshot.user?.role === 'admin' || (backend ? !!getAdminToken() : adminApi.isLoggedIn())

  return (
    <nav className="space-y-5" aria-label="主导航">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `group flex min-h-[44px] items-center gap-3 rounded-xl border-l-[3px] px-3 text-sm font-medium transition ${
                        isActive
                          ? 'border-brand-600 bg-brand-50 text-brand-700'
                          : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-ink'
                      }`
                    }
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
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
        <div className="mt-1 border-t border-slate-200 pt-4">
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-600">站长专用</p>
          <ul className="space-y-0.5">
            <li>
              <NavLink
                to="/admin"
                onClick={onNavigate}
                className={({ isActive }) =>
                  `group flex min-h-[44px] items-center gap-3 rounded-xl border-l-[3px] px-3 text-sm font-medium transition ${
                    isActive
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-transparent text-slate-600 hover:bg-amber-50/60 hover:text-amber-700'
                  }`
                }
              >
                <ShieldCheck className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                <span className="flex-1">管理后台</span>
              </NavLink>
            </li>
          </ul>
        </div>
      ) : null}
    </nav>
  )
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const desktop: ReactNode = (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="border-b border-slate-100 px-4 py-4">
        <Brand />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavContent />
      </div>
      <div className="border-t border-slate-100 px-4 py-3 text-[11px] leading-relaxed text-slate-400">
        数据均保存在本机浏览器<br />会员功能由站长统一管理
      </div>
    </aside>
  )

  const drawer: ReactNode = open ? (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="导航菜单">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <Brand />
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭导航菜单"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
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
