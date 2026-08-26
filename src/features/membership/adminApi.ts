import { newCode, hashPassword } from './codes'
import {
  ADMIN_STORAGE_KEY,
  ADMIN_LOCK_KEY,
  DEFAULT_ADMIN_PASSWORD_HASHES,
  ADMIN_MAX_FAILS,
  ADMIN_LOCK_MS,
} from './staticConfig'
import type { PlanId } from './types'

const ADMIN_KEY = ADMIN_STORAGE_KEY

export interface GeneratedCode {
  code: string
  plan: PlanId
  createdAt: string
}

interface AdminState {
  codes: GeneratedCode[]
  session: boolean
}

function load(): AdminState {
  try {
    const raw = localStorage.getItem(ADMIN_KEY)
    if (raw) return JSON.parse(raw) as AdminState
  } catch {
    /* ignore */
  }
  return { codes: [], session: false }
}

function save(state: AdminState): void {
  localStorage.setItem(ADMIN_KEY, JSON.stringify(state))
}

// 允许的口令哈希：配置了构建变量 VITE_ADMIN_PASS 则只用真实口令；否则退回演示默认。
function allowedHashes(): string[] {
  const raw = (import.meta.env as Record<string, unknown>).VITE_ADMIN_PASS as string | undefined
  if (raw) {
    const fromEnv = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(hashPassword)
    if (fromEnv.length) return fromEnv
  }
  return DEFAULT_ADMIN_PASSWORD_HASHES
}

interface LockState {
  fails: number
  lockUntil: number
}

function loadLock(): LockState {
  try {
    const raw = localStorage.getItem(ADMIN_LOCK_KEY)
    if (raw) return JSON.parse(raw) as LockState
  } catch {
    /* ignore */
  }
  return { fails: 0, lockUntil: 0 }
}

function saveLock(state: LockState): void {
  localStorage.setItem(ADMIN_LOCK_KEY, JSON.stringify(state))
}

export const adminApi = {
  login(password: string): 'ok' | 'bad' | 'locked' {
    const now = Date.now()
    const lock = loadLock()
    if (lock.lockUntil > now) return 'locked'

    if (allowedHashes().includes(hashPassword(password))) {
      saveLock({ fails: 0, lockUntil: 0 })
      const state = load()
      state.session = true
      save(state)
      window.dispatchEvent(new Event('ktb-admin-changed'))
      return 'ok'
    }

    // 失败：累加计数，达到上限即临时锁定，挡掉 UI 穷举
    lock.fails += 1
    if (lock.fails >= ADMIN_MAX_FAILS) {
      lock.lockUntil = now + ADMIN_LOCK_MS
      lock.fails = 0
    }
    saveLock(lock)
    return lock.lockUntil > now ? 'locked' : 'bad'
  },
  lockRemaining(): number {
    return Math.max(0, loadLock().lockUntil - Date.now())
  },
  isLoggedIn(): boolean {
    return load().session === true
  },
  logout(): void {
    const state = load()
    state.session = false
    save(state)
    window.dispatchEvent(new Event('ktb-admin-changed'))
  },
  generateCode(plan: PlanId): string {
    const state = load()
    const code = newCode(plan)
    state.codes = [{ code, plan, createdAt: new Date().toISOString() }, ...state.codes]
    save(state)
    return code
  },
  listCodes(): GeneratedCode[] {
    return load().codes
  },
}
