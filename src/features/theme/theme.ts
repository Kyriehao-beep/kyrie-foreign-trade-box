// 主题（亮 / 暗）状态管理：localStorage 持久化 + 首次访问跟随系统偏好。
// 仅操作 <html> 上的 .dark 类；具体颜色覆盖由 dark.css 的 .dark 作用域规则完成。
const STORAGE_KEY = 'ktb_theme'

export type Theme = 'light' | 'dark'

const listeners = new Set<(t: Theme) => void>()

function systemTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function getStoredTheme(): Theme | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s === 'light' || s === 'dark' ? s : null
  } catch {
    return null
  }
}

export function getTheme(): Theme {
  return getStoredTheme() ?? systemTheme()
}

function setDom(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark')
}

function emit(t: Theme) {
  listeners.forEach((l) => l(t))
}

export function setTheme(t: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, t)
  } catch {
    /* 隐私模式可能禁用 storage；仍切换本次会话 */
  }
  setDom(t)
  emit(t)
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark')
}

// 用户未手动选择时，跟随系统主题变化实时更新。
let systemListenerAttached = false
function ensureSystemListener() {
  if (systemListenerAttached || typeof window === 'undefined' || !window.matchMedia) return
  systemListenerAttached = true
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => {
    if (!getStoredTheme()) {
      setDom(mq.matches ? 'dark' : 'light')
      emit(mq.matches ? 'dark' : 'light')
    }
  }
  mq.addEventListener?.('change', onChange)
}

export function subscribe(listener: (t: Theme) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// 在 React 挂载前调用一次，确保与内联脚本（防闪烁）状态一致。
export function initTheme() {
  ensureSystemListener()
  setDom(getTheme())
}

import { useEffect, useState } from 'react'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getTheme)
  useEffect(() => {
    ensureSystemListener()
    return subscribe(setThemeState)
  }, [])
  return { theme, toggle: toggleTheme, setTheme }
}
