import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { membershipApi } from './membershipApi'
import type { MembershipApi, MembershipSnapshot, PaymentOrder, PlanId, PlanSummary } from './types'

const anonymousSnapshot: MembershipSnapshot = {
  user: null,
  entitlement: { phase: 'anonymous', hasAccess: false, plan: null, expiresAt: null, trialEndsAt: null },
}

interface MembershipContextValue {
  snapshot: MembershipSnapshot
  loading: boolean
  error: string
  refresh: () => Promise<void>
  logout: () => Promise<void>
  login: (input: { username: string; password: string }) => Promise<void>
  register: (input: { username: string; password: string; contact: string }) => Promise<void>
  changePassword: (input: { currentPassword: string; newPassword: string }) => Promise<void>
  getPlans: () => Promise<PlanSummary[]>
  createOrder: (plan: PlanId) => Promise<PaymentOrder>
  claimOrder: (orderId: string, input: { paymentMethod: 'wechat' | 'alipay'; payerHint: string; paidAtClaimed: string }) => Promise<PaymentOrder>
  getOwnOrders: () => Promise<PaymentOrder[]>
  status: { phase: '试用中' | '已到期' | '已激活' | '已停用' | '未登录' | '无法验证'; hasAccess: boolean; remainingDays: number }
}

const MembershipContext = createContext<MembershipContextValue | null>(null)

export function MembershipProvider({ children, api = membershipApi }: { children: ReactNode; api?: MembershipApi }) {
  const [snapshot, setSnapshot] = useState<MembershipSnapshot>(anonymousSnapshot)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestId = useRef(0)

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current
    setLoading(true)
    setError('')
    try {
      const next = await api.me()
      if (currentRequest === requestId.current) setSnapshot(next)
    } catch {
      if (currentRequest === requestId.current) {
        setSnapshot({ ...anonymousSnapshot, entitlement: { ...anonymousSnapshot.entitlement, phase: 'unavailable' } })
        setError('暂时无法验证会员状态，请检查网络后重试')
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [api])

  useEffect(() => { void refresh() }, [refresh])

  // 管理员在 /admin 登录/退出后，刷新产品侧权限（同一 SPA 会话内即时生效）
  useEffect(() => {
    const onAdminChange = () => void refresh()
    window.addEventListener('ktb-admin-changed', onAdminChange)
    return () => window.removeEventListener('ktb-admin-changed', onAdminChange)
  }, [refresh])

  const logout = useCallback(async () => {
    await api.logout()
    requestId.current += 1
    setSnapshot(anonymousSnapshot)
    setError('')
    setLoading(false)
  }, [api])

  const applyAccountAction = useCallback(async (action: () => Promise<MembershipSnapshot>) => {
    const currentRequest = ++requestId.current
    setLoading(true)
    setError('')
    try {
      const next = await action()
      if (currentRequest === requestId.current) setSnapshot(next)
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [])

  const login = useCallback((input: { username: string; password: string }) => applyAccountAction(() => api.login(input)), [api, applyAccountAction])
  const register = useCallback((input: { username: string; password: string; contact: string }) => applyAccountAction(() => api.register(input)), [api, applyAccountAction])
  const changePassword = useCallback((input: { currentPassword: string; newPassword: string }) => applyAccountAction(() => api.changePassword(input)), [api, applyAccountAction])
  const getPlans = useCallback(() => api.getPlans(), [api])
  const createOrder = useCallback((plan: PlanId) => api.createOrder({ plan }), [api])
  const claimOrder = useCallback((orderId: string, input: { paymentMethod: 'wechat' | 'alipay'; payerHint: string; paidAtClaimed: string }) => api.claimOrder(orderId, input), [api])
  const getOwnOrders = useCallback(() => api.getOwnOrders(), [api])

  const status = useMemo(() => {
    const { entitlement } = snapshot
    let phase: MembershipContextValue['status']['phase'] = '已到期'
    if (entitlement.phase === 'trialing') phase = '试用中'
    else if (entitlement.phase === 'anonymous') phase = '未登录'
    else if (entitlement.phase === 'unavailable') phase = '无法验证'
    else if (entitlement.phase === 'suspended') phase = '已停用'
    else if (entitlement.hasAccess) phase = '已激活'
    const remainingMs = entitlement.trialEndsAt ? new Date(entitlement.trialEndsAt).getTime() - Date.now() : 0
    return { phase, hasAccess: entitlement.hasAccess, remainingDays: Math.max(0, Math.ceil(remainingMs / 86_400_000)) }
  }, [snapshot])

  const value = useMemo(() => ({ snapshot, loading, error, refresh, logout, login, register, changePassword, getPlans, createOrder, claimOrder, getOwnOrders, status }), [snapshot, loading, error, refresh, logout, login, register, changePassword, getPlans, createOrder, claimOrder, getOwnOrders, status])
  return <MembershipContext.Provider value={value}>{children}</MembershipContext.Provider>
}

export function useMembership() {
  const context = useContext(MembershipContext)
  if (!context) throw new Error('MembershipProvider is required')
  return context
}
