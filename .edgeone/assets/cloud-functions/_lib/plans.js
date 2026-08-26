export const PLANS = Object.freeze([
  Object.freeze({
    id: 'monthly',
    name: '月度订阅',
    amountCny: 29,
    durationDays: 30,
    suffix: '/月',
    note: '适合短期灵活使用',
  }),
  Object.freeze({
    id: 'yearly',
    name: '年度订阅',
    amountCny: 199,
    durationDays: 365,
    suffix: '/年',
    note: '比按月支付节省 149 元',
  }),
  Object.freeze({
    id: 'lifetime',
    name: '永久买断',
    amountCny: 599,
    durationDays: null,
    suffix: '/永久',
    note: '一次付费，长期使用当前核心功能',
  }),
])

export function getPlan(planId) {
  return PLANS.find((plan) => plan.id === planId) ?? null
}
