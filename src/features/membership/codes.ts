import type { PlanId } from './types'
import { UNLOCK_SECRET } from './staticConfig'

// 轻量哈希（非加密，仅用于离线校验解锁码格式，防随手乱猜）
export function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0')
}

export function hashPassword(password: string): string {
  return cyrb53('pw:' + password, 7)
}

const PLAN_LETTER: Record<PlanId, string> = { monthly: 'M', yearly: 'Y', lifetime: 'L' }
const LETTER_PLAN: Record<string, PlanId> = { M: 'monthly', Y: 'yearly', L: 'lifetime' }

function deriveCode(plan: PlanId, serial: string): string {
  const sig = cyrb53(UNLOCK_SECRET + '|' + plan + '|' + serial).slice(0, 6).toUpperCase()
  return `KTB-${PLAN_LETTER[plan]}${serial.toUpperCase()}-${sig}`
}

export function newCode(plan: PlanId): string {
  const serial = Math.random().toString(36).slice(2, 8).toUpperCase()
  return deriveCode(plan, serial)
}

export function verifyCode(raw: string): { plan: PlanId } | null {
  const code = raw.trim().toUpperCase()
  const m = code.match(/^KTB-([MYL])([0-9A-Z]{6})-([0-9A-F]{6})$/)
  if (!m) return null
  const plan = LETTER_PLAN[m[1]]
  const serial = m[2]
  if (deriveCode(plan, serial) !== code) return null
  return { plan }
}
