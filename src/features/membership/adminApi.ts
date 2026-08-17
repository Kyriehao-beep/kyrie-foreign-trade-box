import { newCode } from './codes'
import { ADMIN_PASSWORD } from './staticConfig'
import type { PlanId } from './types'

const ADMIN_KEY = 'ktb_admin_v1'

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

export const adminApi = {
  login(password: string): boolean {
    if (password !== ADMIN_PASSWORD) return false
    const state = load()
    state.session = true
    save(state)
    return true
  },
  isLoggedIn(): boolean {
    return load().session === true
  },
  logout(): void {
    const state = load()
    state.session = false
    save(state)
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
