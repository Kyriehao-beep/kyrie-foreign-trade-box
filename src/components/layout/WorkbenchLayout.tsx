// 工作台布局：单据 / 跟单 / 报价 / 工具类页面使用。
// 可折叠侧栏 + 世界时间条（仅此处显示）+ 手机端底部导航。
import { useState, type ReactNode } from 'react'
import { Sidebar } from '../Sidebar'
import { BottomNav } from '../BottomNav'
import { WorldTimeBar } from '../WorldTimeBar'

export function WorkbenchLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      <a href="#main-content" className="sr-only z-[100] rounded-lg bg-white px-4 py-3 text-sm font-semibold text-brand-700 shadow-pop focus:not-sr-only focus:fixed focus:left-4 focus:top-4">跳至主要内容</a>
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} collapsed={collapsed} onToggleCollapse={() => setCollapsed((value) => !value)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <WorldTimeBar />
        <main id="main-content" tabIndex={-1} className="flex-1 pb-20 lg:pb-0">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
