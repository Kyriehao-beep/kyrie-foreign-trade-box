// 后端版会员 API：实现与本地 membershipApi 完全一致的 MembershipApi 接口，
// 实际请求转发到 Cloudflare Worker（worker/backend.js）。
import type { MembershipApi, MembershipSnapshot, PaymentOrder, PlanId, PlanSummary } from './types'
import { apiFetch, getToken, setToken, clearToken } from '../../services/apiClient'

const anonymousSnapshot: MembershipSnapshot = {
  user: null,
  entitlement: { phase: 'anonymous', hasAccess: false, plan: null, expiresAt: null, trialEndsAt: null },
}

interface AuthResponse {
  token: string
  snapshot: MembershipSnapshot
}

export const backendMembershipApi: MembershipApi = {
  async me() {
    if (!getToken()) return anonymousSnapshot
    try {
      return await apiFetch<MembershipSnapshot>('/api/me', { auth: true })
    } catch (e) {
      const err = e as { status?: number }
      if (err && err.status === 401) {
        clearToken()
        return anonymousSnapshot
      }
      throw e
    }
  },
  async register(input) {
    const data = await apiFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: input,
      auth: false,
    })
    setToken(data.token)
    return data.snapshot
  },
  async login(input) {
    const data = await apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: input,
      auth: false,
    })
    setToken(data.token)
    return data.snapshot
  },
  async logout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch {
      /* 忽略网络错误，本地仍需清 token */
    }
    clearToken()
  },
  async changePassword(input) {
    const data = await apiFetch<AuthResponse>('/api/auth/change-password', {
      method: 'POST',
      body: input,
      auth: true,
    })
    setToken(data.token)
    return data.snapshot
  },
  async getPlans() {
    const data = await apiFetch<{ plans: PlanSummary[] }>('/api/plans', { auth: false })
    return data.plans
  },
  async createOrder(input) {
    return apiFetch<PaymentOrder>('/api/orders', { method: 'POST', body: input, auth: true })
  },
  async claimOrder(orderId, input) {
    return apiFetch<PaymentOrder>(
      `/api/orders/${encodeURIComponent(orderId)}/claim`,
      { method: 'POST', body: input, auth: true },
    )
  },
  async getOwnOrders() {
    return apiFetch<PaymentOrder[]>('/api/orders', { auth: true })
  },
}

export type { PlanId }
