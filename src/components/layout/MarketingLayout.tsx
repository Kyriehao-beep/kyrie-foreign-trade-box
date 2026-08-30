// 营销页面布局：首页 / 关于 / 联系 / 会员 等公共页面使用。
// 轻量顶部导航，不显示世界时间条；底部带站点页脚。
import { Box, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Button } from '../ui/button'
import { MobileMenuButton } from '../Sidebar'
import { ThemeToggle } from '../../features/theme/ThemeToggle'

const LINKS = [
  { to: '/', label: '首页', end: true },
  { to: '/quote', label: '工具' },
  { to: '/membership', label: '会员方案' },
  { to: '/about', label: '关于 & 定制' },
  { to: '/contact', label: '联系站长' },
] as const

export function MarketingLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <a href="#main-content" className="sr-only z-[100] rounded-lg bg-white px-4 py-3 text-sm font-semibold text-brand-700 shadow-pop focus:not-sr-only focus:fixed focus:left-4 focus:top-4">跳至主要内容</a>
      <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur-lg print:hidden">
        <div className="mx-auto flex h-16 max-w-shell items-center justify-between gap-3 px-4 lg:px-8">
          <div className="flex items-center gap-2">
            <MobileMenuButton onClick={() => setOpen(true)} />
            <Link to="/" className="flex items-center gap-2" aria-label="Kyrie的外贸盒子首页">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-soft">
                <Box className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-semibold">Kyrie的外贸盒子</span>
            </Link>
            <ThemeToggle />
          </div>
          <nav className="hidden items-center gap-1 md:flex" aria-label="顶部导航">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={'end' in link ? link.end : undefined}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${isActive ? 'text-brand-700' : 'text-slate-600 hover:text-ink'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link to="/documents">免费开始使用</Link>
          </Button>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1">{children}</main>

      <footer className="border-t border-line bg-white px-5 py-8 text-center text-xs text-slate-500 print:hidden">
        Kyrie的外贸盒子 · 让外贸制单更清楚、更省心
      </footer>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="导航菜单">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white"><Box className="h-5 w-5" aria-hidden="true" /></span>
                <span className="font-semibold">Kyrie的外贸盒子</span>
              </Link>
              <button type="button" onClick={() => setOpen(false)} aria-label="关闭导航菜单" className="rounded-lg p-2 text-slate-500 transition-colors duration-fast hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                <X className="h-5 w-5" />
              </button>
              <ThemeToggle />
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4" aria-label="导航菜单">
              {LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={'end' in link ? link.end : undefined}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex min-h-[44px] items-center rounded-xl px-3 text-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <Button asChild className="mt-3 w-full"><Link to="/documents" onClick={() => setOpen(false)}>免费开始使用</Link></Button>
            </nav>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
