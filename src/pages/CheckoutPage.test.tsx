import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MembershipProvider } from '../features/membership/MembershipContext'
import type { MembershipApi, PaymentOrder, PlanSummary } from '../features/membership/types'
import { CheckoutPage } from './CheckoutPage'

const snapshot = {
  user: { id: 'u1', username: 'kyrie', displayName: 'kyrie', contact: 'wx', role: 'user' as const, status: 'active' as const, passwordResetRequired: false, createdAt: '2026-08-17T00:00:00.000Z' },
  entitlement: { phase: 'trialing' as const, hasAccess: true, plan: null, expiresAt: null, trialEndsAt: '2026-08-20T00:00:00.000Z' },
}
const order: PaymentOrder = { orderId: 'KTB-20260817-ABCD1234', userId: 'u1', username: 'kyrie', plan: 'monthly', amountCny: 60, paymentMethod: null, payerHint: null, paidAtClaimed: null, status: 'awaiting_payment', createdAt: '2026-08-17T00:00:00.000Z', claimedAt: null, reviewedAt: null }
const plans: PlanSummary[] = [{ id: 'monthly', name: '月度订阅', amountCny: 59, durationDays: 30, suffix: '/月', note: '灵活使用' }]

function api(overrides: Partial<MembershipApi> = {}): MembershipApi {
  return { me: vi.fn().mockResolvedValue(snapshot), login: vi.fn(), register: vi.fn(), logout: vi.fn(), changePassword: vi.fn(), getPlans: vi.fn().mockResolvedValue(plans), createOrder: vi.fn().mockResolvedValue(order), claimOrder: vi.fn().mockResolvedValue({ ...order, status: 'pending_review' }), getOwnOrders: vi.fn().mockResolvedValue([]), ...overrides }
}

it('creates a server-priced order and submits manual payment evidence', async () => {
  const membershipApi = api()
  render(<MemoryRouter initialEntries={['/checkout/monthly']}><MembershipProvider api={membershipApi}><Routes><Route path="/checkout/:plan" element={<CheckoutPage />} /></Routes></MembershipProvider></MemoryRouter>)
  expect(await screen.findByRole('heading', { name: '开通月度订阅' })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: '创建订单' }))
  expect(membershipApi.createOrder).toHaveBeenCalledWith({ plan: 'monthly' })
  expect(await screen.findByText(/KTB-20260817-ABCD1234/)).toBeInTheDocument()
  expect(screen.getByText(/付款备注请填写上方订单号/)).toBeInTheDocument()
  expect(screen.getByText('本订单应付：¥60')).toBeInTheDocument()
  await userEvent.type(screen.getByLabelText('付款人姓名或备注'), '微信付款-Kyrie')
  await userEvent.type(screen.getByLabelText('实际付款时间'), '2026-08-17T10:30')
  await userEvent.click(screen.getByRole('button', { name: '我已付款，提交人工核对' }))
  expect(membershipApi.claimOrder).toHaveBeenCalledWith('KTB-20260817-ABCD1234', expect.objectContaining({ paymentMethod: 'wechat', payerHint: '微信付款-Kyrie', paidAtClaimed: expect.stringContaining('2026-08-17') }))
  expect(await screen.findByRole('heading', { name: '付款信息已提交' })).toBeInTheDocument()
})

it('restores a pending order after refresh instead of creating another one', async () => {
  const pending = { ...order, amountCny: 59, status: 'pending_review' as const, paymentMethod: 'alipay' as const, payerHint: '支付宝 7788', paidAtClaimed: '2026-08-17T10:30:00.000Z' }
  const membershipApi = api({ getOwnOrders: vi.fn().mockResolvedValue([pending]) })
  render(<MemoryRouter initialEntries={['/checkout/monthly']}><MembershipProvider api={membershipApi}><Routes><Route path="/checkout/:plan" element={<CheckoutPage />} /></Routes></MembershipProvider></MemoryRouter>)

  expect(await screen.findByRole('heading', { name: '付款信息已提交' })).toBeInTheDocument()
  expect(screen.getByText(/KTB-20260817-ABCD1234/)).toBeInTheDocument()
  expect(membershipApi.createOrder).not.toHaveBeenCalled()
})
