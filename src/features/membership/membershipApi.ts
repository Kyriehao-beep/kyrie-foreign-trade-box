import type { MembershipApi, MembershipSnapshot, PaymentOrder, PlanSummary } from './types'

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 10_000)
  const headers = new Headers(init?.headers)
  if (init?.body && !(init.body instanceof FormData)) headers.set('content-type', 'application/json')

  try {
    const response = await fetch(path, { ...init, headers, credentials: 'same-origin', signal: controller.signal })
    if (response.status === 204) return undefined as T
    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw new ApiError(502, '服务器返回的数据格式无效')
    }
    const body = await response.json().catch(() => ({})) as { error?: string; message?: string } & T
    if (!response.ok) throw new ApiError(response.status, body.message || '请求失败，请稍后重试')
    return body
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new Error(error instanceof DOMException && error.name === 'AbortError' ? '请求超时，请检查网络' : '网络连接失败，请稍后重试')
  } finally {
    window.clearTimeout(timeout)
  }
}

const anonymousSnapshot: MembershipSnapshot = {
  user: null,
  entitlement: { phase: 'anonymous', hasAccess: false, plan: null, expiresAt: null, trialEndsAt: null },
}

export const membershipApi: MembershipApi = {
  async me() {
    try {
      return await request<MembershipSnapshot>('/api/auth/me')
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return anonymousSnapshot
      throw error
    }
  },
  login: (input) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  register: (input) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(input) }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  changePassword: (input) => request('/api/auth/password', { method: 'POST', body: JSON.stringify(input) }),
  async getPlans() {
    return request<PlanSummary[]>('/api/plans')
  },
  createOrder: (input) => request('/api/orders', { method: 'POST', body: JSON.stringify(input) }),
  claimOrder: (orderId, input) => request(`/api/orders/${encodeURIComponent(orderId)}/claim`, { method: 'POST', body: JSON.stringify(input) }),
  async getOwnOrders() {
    return request<PaymentOrder[]>('/api/orders/me')
  },
}
