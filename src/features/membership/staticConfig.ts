import type { PlanId, PlanSummary } from './types'

// 改这里：管理密码数组（任一匹配即可登录 /admin，最多 3 个席位）
export const ADMIN_PASSWORDS = ['wiz1', 'wiz2', 'wiz3']
// 管理员会话存储键（会员逻辑据此判定管理员是否已拥有产品访问权）
export const ADMIN_STORAGE_KEY = 'ktb_admin_v1'
// 改这里：解锁码密钥。注意：改了会让已发出的解锁码失效。
export const UNLOCK_SECRET = 'ktb-unlock-secret-2026-change-me'
// 改这里：你的微信号（付款后用户加你领码）
export const WECHAT_ID = 'kyrie_wx_demo'
// 付款后给用户的提示文案
export const CONTACT_TIP = '付款后加微信，备注「外贸盒子+方案」，领取解锁码'

// 免费试用天数
export const TRIAL_DAYS = 3

// 会员方案（价格、时长）
export const PLANS: PlanSummary[] = [
  { id: 'monthly', name: '月度会员', amountCny: 29, durationDays: 30, suffix: '/月', note: '适合短期集中制单' },
  { id: 'yearly', name: '年度会员', amountCny: 199, durationDays: 365, suffix: '/年', note: '最常选，平均每天不到 0.6 元' },
  { id: 'lifetime', name: '永久买断', amountCny: 599, durationDays: null, suffix: '/永久', note: '一次付费，长期可用' },
]

export function planName(id: PlanId): string {
  return PLANS.find((p) => p.id === id)?.name ?? '会员'
}

export function planDurationDays(id: PlanId): number | null {
  return PLANS.find((p) => p.id === id)?.durationDays ?? null
}
