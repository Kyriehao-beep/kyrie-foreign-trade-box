import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MembershipProvider } from '../features/membership/MembershipContext'
import type { MembershipApi, PaymentOrder } from '../features/membership/types'
import { AdminPage } from './AdminPage'

const mocks = vi.hoisted(() => ({
  users: vi.fn(), orders: vi.fn(), audit: vi.fn(), paymentSettings: vi.fn(),
  confirmOrder: vi.fn(), rejectOrder: vi.fn(), changeUserStatus: vi.fn(), resetPassword: vi.fn(),
  grantEntitlement: vi.fn(), grantDays: vi.fn(), uploadQr: vi.fn(),
}))

vi.mock('../features/membership/adminApi', () => ({ adminApi: mocks }))

const adminSnapshot = {
  user: { id: 'admin-1', username: 'admin_one', displayName: '管理员一', contact: '', role: 'admin' as const, status: 'active' as const, passwordResetRequired: false, createdAt: '2026-08-17T00:00:00.000Z' },
  entitlement: { phase: 'admin' as const, hasAccess: true, plan: null, expiresAt: null, trialEndsAt: null },
}
const user = { id: 'user-1', username: 'buyer_one', displayName: 'buyer_one', contact: 'wx_888', role: 'user' as const, status: 'active' as const, passwordResetRequired: false, createdAt: '2026-08-17T00:00:00.000Z', trialEndsAt: '2026-08-20T00:00:00.000Z', entitlement: { phase: 'trialing' as const, hasAccess: true, plan: null, expiresAt: null, trialEndsAt: '2026-08-20T00:00:00.000Z' } }
const order: PaymentOrder = { orderId: 'KTB-20260817-ABCD1234', userId: 'user-1', username: 'buyer_one', plan: 'yearly', amountCny: 199, paymentMethod: 'alipay', payerHint: '支付宝尾号 7788', paidAtClaimed: '2026-08-17T08:30:00.000Z', status: 'pending_review', createdAt: '2026-08-17T08:00:00.000Z', claimedAt: '2026-08-17T08:31:00.000Z', reviewedAt: null }

function api(): MembershipApi {
  return { me: vi.fn().mockResolvedValue(adminSnapshot), login: vi.fn(), register: vi.fn(), logout: vi.fn(), changePassword: vi.fn(), getPlans: vi.fn(), createOrder: vi.fn(), claimOrder: vi.fn(), getOwnOrders: vi.fn() }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.users.mockResolvedValue([user])
  mocks.orders.mockResolvedValue([order])
  mocks.audit.mockResolvedValue([])
  mocks.paymentSettings.mockResolvedValue({ wechatConfigured: true, alipayConfigured: false, supportContact: 'Kyrie客服' })
  mocks.confirmOrder.mockResolvedValue({})
  mocks.rejectOrder.mockResolvedValue({})
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  vi.spyOn(window, 'prompt').mockReturnValue('未查到对应流水')
})

it('shows complete payment evidence and confirms with a full entitlement summary', async () => {
  render(<MemoryRouter><MembershipProvider api={api()}><AdminPage /></MembershipProvider></MemoryRouter>)

  expect(await screen.findByText('KTB-20260817-ABCD1234')).toBeInTheDocument()
  expect(screen.getAllByText('支付宝').length).toBeGreaterThan(0)
  expect(screen.getAllByText(/2026/).length).toBeGreaterThan(1)
  expect(screen.getByText(/微信已配置 · 支付宝未配置/)).toBeInTheDocument()
  await userEvent.type(screen.getByLabelText('内部备注（仅管理员可见）'), '已核对支付宝账单')
  await userEvent.click(screen.getByRole('button', { name: '确认到账并开通' }))
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('KTB-20260817-ABCD1234'))
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('年度'))
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('支付宝'))
  expect(mocks.confirmOrder).toHaveBeenCalledWith(order.orderId, '已核对支付宝账单')
})

it('provides search, status filters and all manual grant options', async () => {
  render(<MemoryRouter><MembershipProvider api={api()}><AdminPage /></MembershipProvider></MemoryRouter>)
  expect(await screen.findByLabelText('搜索用户')).toBeInTheDocument()
  expect(screen.getByLabelText('账号状态')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '开通月度' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '开通年度' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '开通永久' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '按天延长' })).toBeInTheDocument()
  expect(screen.getByText(/注册时间：/)).toBeInTheDocument()
  expect(screen.getByText(/试用截止：/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '标记信息不匹配' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '拒绝申请' })).toBeInTheDocument()
})

it('sends and later displays an administrator-only rejection note', async () => {
  const rendered = render(<MemoryRouter><MembershipProvider api={api()}><AdminPage /></MembershipProvider></MemoryRouter>)
  await userEvent.type(await screen.findByLabelText('内部备注（仅管理员可见）'), '内部核对记录')
  await userEvent.click(screen.getByRole('button', { name: '拒绝申请' }))
  await waitFor(() => expect(mocks.rejectOrder).toHaveBeenCalledWith(order.orderId, '未查到对应流水', '内部核对记录'))

  rendered.unmount()
  mocks.orders.mockResolvedValue([{ ...order, status: 'rejected', adminNote: '内部核对记录' }])
  render(<MemoryRouter><MembershipProvider api={api()}><AdminPage /></MembershipProvider></MemoryRouter>)
  expect(await screen.findByText('已保存的内部备注')).toBeInTheDocument()
  expect(screen.getByText('内部核对记录')).toBeInTheDocument()
})

it('explains that a signed-in normal user has no admin access', async () => {
  const normalApi = api()
  normalApi.me = vi.fn().mockResolvedValue({ ...adminSnapshot, user: { ...adminSnapshot.user, role: 'user' as const } })
  render(<MemoryRouter><MembershipProvider api={normalApi}><AdminPage /></MembershipProvider></MemoryRouter>)
  expect(await screen.findByRole('heading', { name: '无权访问管理员后台' })).toBeInTheDocument()
})
