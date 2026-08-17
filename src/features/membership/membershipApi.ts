import type { MembershipApi, MembershipSnapshot, PaymentOrder, PlanId, PlanSummary, UserSummary } from './types'
import { PLANS, TRIAL_DAYS, planDurationDays } from './staticConfig'
import { verifyCode, hashPassword } from './codes'

const STORAGE_KEY = 'ktb_static_v1'

interface LocalAccount {
  id: string
  username: string
  displayName: string
  contact: string
  role: 'user' | 'admin'
  status: 'active' | 'suspended'
  passwordResetRequired: boolean
  createdAt: string
  passwordHash: string
}

interface LocalState {
  firstVisit?: string
  account?: LocalAccount
  unlocked?: { plan: PlanId; expiresAt: string | null }
  orders?: PaymentOrder[]
}

function load(): LocalState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as LocalState) : {}
  } catch {
    return {}
  }
}

function save(state: LocalState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function defaultUser(state: LocalState): UserSummary {
  const created = state.firstVisit ?? new Date().toISOString()
  return {
    id: 'local-guest',
    username: '我',
    displayName: '我',
    contact: '',
    role: 'user',
    status: 'active',
    passwordResetRequired: false,
    createdAt: created,
  }
}

function computeEntitlement(state: LocalState): { entitlement: MembershipSnapshot['entitlement']; user: UserSummary } {
  const now = Date.now()
  const user: UserSummary = state.account
    ? {
        id: state.account.id,
        username: state.account.username,
        displayName: state.account.displayName,
        contact: state.account.contact,
        role: state.account.role,
        status: state.account.status,
        passwordResetRequired: state.account.passwordResetRequired,
        createdAt: state.account.createdAt,
      }
    : defaultUser(state)

  if (state.unlocked && (state.unlocked.expiresAt == null || new Date(state.unlocked.expiresAt).getTime() > now)) {
    const plan = state.unlocked.plan
    const phase = plan === 'lifetime' ? 'active_lifetime' : plan === 'yearly' ? 'active_yearly' : 'active_monthly'
    return { entitlement: { phase, hasAccess: true, plan, expiresAt: state.unlocked.expiresAt, trialEndsAt: null }, user }
  }

  const firstVisit = state.firstVisit ?? new Date().toISOString()
  const trialEnds = new Date(firstVisit).getTime() + TRIAL_DAYS * 86_400_000
  if (trialEnds > now) {
    return {
      entitlement: { phase: 'trialing', hasAccess: true, plan: null, expiresAt: null, trialEndsAt: new Date(trialEnds).toISOString() },
      user,
    }
  }

  return { entitlement: { phase: 'expired', hasAccess: false, plan: null, expiresAt: null, trialEndsAt: null }, user }
}

function snapshot(state: LocalState): MembershipSnapshot {
  const { entitlement, user } = computeEntitlement(state)
  return { user, entitlement }
}

export const membershipApi: MembershipApi = {
  async me() {
    const state = load()
    if (!state.firstVisit) {
      state.firstVisit = new Date().toISOString()
      save(state)
    }
    return snapshot(state)
  },
  async register(input) {
    const state = load()
    if (!state.firstVisit) state.firstVisit = new Date().toISOString()
    state.account = {
      id: 'local-' + Math.random().toString(36).slice(2, 10),
      username: input.username,
      displayName: input.displayName ?? input.username,
      contact: input.contact,
      role: 'user',
      status: 'active',
      passwordResetRequired: false,
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword(input.password),
    }
    save(state)
    return snapshot(state)
  },
  async login(input) {
    const state = load()
    if (!state.account) throw new Error('账号不存在，请先注册')
    if (state.account.passwordHash !== hashPassword(input.password)) throw new Error('用户名或密码错误')
    return snapshot(state)
  },
  async logout() {
    const state = load()
    delete state.account
    save(state)
  },
  async changePassword(input) {
    const state = load()
    if (!state.account) throw new Error('请先登录')
    if (state.account.passwordHash !== hashPassword(input.currentPassword)) throw new Error('当前密码错误')
    state.account.passwordHash = hashPassword(input.newPassword)
    save(state)
    return snapshot(state)
  },
  async getPlans() {
    return PLANS
  },
  async createOrder(input) {
    const state = load()
    const plan = PLANS.find((p) => p.id === input.plan)
    if (!plan) throw new Error('方案不存在')
    const order: PaymentOrder = {
      orderId:
        'KTB-' +
        new Date().toISOString().slice(0, 10).replace(/-/g, '') +
        '-' +
        Math.random().toString(36).slice(2, 10).toUpperCase(),
      userId: state.account?.id ?? 'guest',
      username: state.account?.username ?? 'guest',
      plan: input.plan,
      amountCny: plan.amountCny,
      paymentMethod: null,
      payerHint: null,
      paidAtClaimed: null,
      status: 'awaiting_payment',
      createdAt: new Date().toISOString(),
      claimedAt: null,
      reviewedAt: null,
    }
    state.orders = [...(state.orders ?? []), order]
    save(state)
    return order
  },
  async claimOrder(orderId, input) {
    const state = load()
    const order = (state.orders ?? []).find((o) => o.orderId === orderId)
    if (!order) throw new Error('订单不存在')
    order.status = 'pending_review'
    order.paymentMethod = input.paymentMethod
    order.payerHint = input.payerHint
    order.paidAtClaimed = input.paidAtClaimed
    order.claimedAt = new Date().toISOString()
    save(state)
    return order
  },
  async getOwnOrders() {
    return load().orders ?? []
  },
}

// 解锁码兑换（前端离线校验）
export async function redeemCode(raw: string): Promise<{ plan: PlanId }> {
  const result = verifyCode(raw)
  if (!result) throw new Error('解锁码无效，请检查后重试')
  const state = load()
  if (!state.firstVisit) state.firstVisit = new Date().toISOString()
  const durationDays = planDurationDays(result.plan)
  state.unlocked = {
    plan: result.plan,
    expiresAt: durationDays == null ? null : new Date(Date.now() + durationDays * 86_400_000).toISOString(),
  }
  save(state)
  return { plan: result.plan }
}
