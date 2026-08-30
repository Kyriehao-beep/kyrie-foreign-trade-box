import { Moon, Sun } from 'lucide-react'
import { useTheme } from './theme'
import { cn } from '../../lib/utils'

// 亮 / 暗 主题切换按钮。自身样式（bg-white / border-slate-200 / text-slate-600）
// 由 dark.css 的 .dark 覆盖层自动切换为暗色表面，无需额外变体。
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? '切换到亮色模式' : '切换到暗色模式'}
      title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
      className={cn(
        'grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors duration-fast hover:border-brand-200 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        className,
      )}
    >
      {isDark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
    </button>
  )
}
