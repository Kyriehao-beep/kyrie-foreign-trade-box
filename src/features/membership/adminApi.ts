import { request } from './membershipApi'
import type { EntitlementSummary, PaymentOrder, PlanId, UserSummary } from './types'

export interface AdminUser extends UserSummary { trialEndsAt: string | null; entitlement: EntitlementSummary }
export interface AuditEvent { id: string; adminUsername: string; action: string; targetId: string; createdAt: string }
export interface PaymentSettings { wechatConfigured: boolean; alipayConfigured: boolean; supportContact: string }

export const adminApi = {
  users: () => request<AdminUser[]>('/api/admin/users'),
  orders: () => request<PaymentOrder[]>('/api/admin/orders'),
  audit: () => request<AuditEvent[]>('/api/admin/audit'),
  paymentSettings: () => request<PaymentSettings>('/api/admin/payment-settings'),
  confirmOrder: (orderId: string, note = '') => request(`/api/admin/orders/${encodeURIComponent(orderId)}/confirm`, { method: 'POST', body: JSON.stringify({ note }) }),
  rejectOrder: (orderId: string, note: string, adminNote = '') => request(`/api/admin/orders/${encodeURIComponent(orderId)}/reject`, { method: 'POST', body: JSON.stringify({ note, adminNote }) }),
  changeUserStatus: (userId: string, status: 'active' | 'suspended') => request(`/api/admin/users/${encodeURIComponent(userId)}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
  resetPassword: (userId: string) => request<{ temporaryPassword: string }>(`/api/admin/users/${encodeURIComponent(userId)}/reset-password`, { method: 'POST' }),
  grantEntitlement: (userId: string, plan: PlanId, idempotencyKey: string) => request(`/api/admin/users/${encodeURIComponent(userId)}/entitlement`, { method: 'POST', body: JSON.stringify({ plan, idempotencyKey }) }),
  grantDays: (userId: string, days: number, idempotencyKey: string) => request(`/api/admin/users/${encodeURIComponent(userId)}/entitlement`, { method: 'POST', body: JSON.stringify({ days, idempotencyKey }) }),
  uploadQr: (formData: FormData) => request('/api/admin/payment-settings', { method: 'POST', body: formData }),
}
