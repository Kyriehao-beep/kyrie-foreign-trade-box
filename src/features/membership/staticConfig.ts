import type { PlanId, PlanSummary } from './types'

// 管理员登录 /admin 的口令。
// 安全说明：纯前端无法真正保密，这里只做"源码混淆 + 暴力破解防护"，并非绝对安全。
// - 默认口令仅存哈希（源码中无明文 wiz1/wiz2/wiz3）。
// - 生产环境请通过构建变量 VITE_ADMIN_PASS 覆盖为你的强口令（多个用逗号分隔），
//   重新 `npm run build` 注入即可；配置后默认口令不再生效。
// 管理员会话存储键（会员逻辑据此判定管理员是否已拥有产品访问权）
export const ADMIN_STORAGE_KEY = 'ktb_admin_v1'
// 默认口令哈希（对应 wiz1 / wiz2 / wiz3）。仅为演示兜底，配置 VITE_ADMIN_PASS 后不使用。
export const DEFAULT_ADMIN_PASSWORD_HASHES = [
  'fc0c9dffe43d4322',
  '2e7cc3d020420654',
  '0c159043f66d44e2',
]
// 暴力破解防护：连续失败上限与锁定时长（毫秒）
export const ADMIN_MAX_FAILS = 5
export const ADMIN_LOCK_MS = 5 * 60 * 1000
// 登录失败计数存储键
export const ADMIN_LOCK_KEY = 'ktb_admin_lock_v1'
// 改这里：解锁码密钥。注意：改了会让已发出的解锁码失效。
export const UNLOCK_SECRET = 'ktb-unlock-secret-2026-change-me'
// 改这里：你的微信号（付款后用户加你领码）——请确认这是可搜索的真实微信号
export const WECHAT_ID = 'Kyrie'
// 付款后给用户的提示文案
export const CONTACT_TIP = '付款后加微信，备注「外贸盒子+方案」，领取解锁码'

// 免费试用天数
export const TRIAL_DAYS = 14

// 会员方案（价格、时长）
// 文案口径全站统一：试用 14 天；¥9.9/月；¥99/年；本地买断版 ¥299。
// 买断版只覆盖「购买时已经上线的本地功能」，未来的 AI、云服务、企业定制不在此列，
// 因此任何页面都不得出现「未来所有工具永久免费」一类的表述。
export const PLANS: PlanSummary[] = [
  { id: 'monthly', name: '月度会员', amountCny: 9.9, durationDays: 30, suffix: '/月', note: '完整使用全部工具，随时可取消' },
  { id: 'yearly', name: '年度会员', amountCny: 99, durationDays: 365, suffix: '/年', note: '比月付省约 ¥20，平均每天不到 0.3 元' },
  {
    id: 'lifetime',
    name: '本地买断版',
    amountCny: 299,
    durationDays: null,
    suffix: '/买断',
    note: '仅包含购买时已上线的本地功能，未来的 AI、云服务与企业定制不包含在内',
  },
]

/** 全站统一的收费说明，页面直接引用，避免各处手写导致口径不一致。 */
export const PRICING_SUMMARY = {
  /** 试用天数，页面拼接文案时直接取这个值，避免多处硬编码。 */
  trialDays: TRIAL_DAYS,
  trial: '免费试用 14 天',
  monthly: '¥9.9/月',
  yearly: '¥99/年',
  lifetime: '本地买断版 ¥299',
  lifetimeScope: '买断版仅包含购买时已经上线的本地功能',
  lifetimeExcludes: '未来的 AI、云服务、企业定制不包含在本地买断版中',
  noAutoCharge: '不自动扣费',
} as const

export function planName(id: PlanId): string {
  return PLANS.find((p) => p.id === id)?.name ?? '会员'
}

export function planDurationDays(id: PlanId): number | null {
  return PLANS.find((p) => p.id === id)?.durationDays ?? null
}
