export type PlanId = 'monthly' | 'yearly' | 'lifetime'

export type EntitlementPhase =
  | 'anonymous'
  | 'trialing'
  | 'expired'
  | 'active_monthly'
  | 'active_yearly'
  | 'active_lifetime'
  | 'suspended'
  | 'admin'
  | 'unavailable'

export interface UserSummary {
  id: string
  username: string
  displayName: string
  contact: string
  role: 'user' | 'admin'
  status: 'active' | 'suspended'
  passwordResetRequired: boolean
  createdAt: string
}

export interface EntitlementSummary {
  phase: EntitlementPhase
  hasAccess: boolean
  plan: PlanId | null
  expiresAt: string | null
  trialEndsAt: string | null
}

export interface MembershipSnapshot {
  user: UserSummary | null
  entitlement: EntitlementSummary
}

export interface PlanSummary {
  id: PlanId
  name: string
  amountCny: number
  durationDays: number | null
  suffix: string
  note: string
}

export interface PaymentOrder {
  orderId: string
  userId: string
  username: string
  plan: PlanId
  amountCny: number
  paymentMethod: 'wechat' | 'alipay' | null
  payerHint: string | null
  paidAtClaimed: string | null
  status: 'awaiting_payment' | 'pending_review' | 'confirmed' | 'rejected'
  createdAt: string
  claimedAt: string | null
  reviewedAt: string | null
  userMessage?: string
  adminNote?: string
}

export interface MembershipApi {
  me: () => Promise<MembershipSnapshot>
  login: (input: { username: string; password: string }) => Promise<MembershipSnapshot>
  register: (input: { username: string; password: string; contact: string; displayName?: string }) => Promise<MembershipSnapshot>
  logout: () => Promise<void>
  changePassword: (input: { currentPassword: string; newPassword: string }) => Promise<MembershipSnapshot>
  getPlans: () => Promise<PlanSummary[]>
  createOrder: (input: { plan: PlanId }) => Promise<PaymentOrder>
  claimOrder: (orderId: string, input: { paymentMethod: 'wechat' | 'alipay'; payerHint: string; paidAtClaimed: string }) => Promise<PaymentOrder>
  getOwnOrders: () => Promise<PaymentOrder[]>
}
