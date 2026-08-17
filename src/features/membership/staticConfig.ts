import type { PlanId, PlanSummary } from './types'

// 改这里：管理密码（登录 /admin 用）
export const ADMIN_PASSWORD = 'kyrie-admin-2026'
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
  { id: 'monthly', name: '月度会员', amountCny: 59, durationDays: 30, suffix: '/月', note: '适合短期集中制单' },
  { id: 'yearly', name: '年度会员', amountCny: 499, durationDays: 365, suffix: '/年', note: '最常选，平均每天不到 1.4 元' },
  { id: 'lifetime', name: '永久买断', amountCny: 1299, durationDays: null, suffix: '/永久', note: '一次付费，长期可用' },
]

export function planName(id: PlanId): string {
  return PLANS.find((p) => p.id === id)?.name ?? '会员'
}

export function planDurationDays(id: PlanId): number | null {
  return PLANS.find((p) => p.id === id)?.durationDays ?? null
}
