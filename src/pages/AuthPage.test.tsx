import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MembershipProvider } from '../features/membership/MembershipContext'
import type { MembershipApi } from '../features/membership/types'
import { PRICING_SUMMARY, WECHAT_ID } from '../features/membership/staticConfig'
import { AuthPage } from './AuthPage'

afterEach(() => vi.restoreAllMocks())

const anonymous = { user: null, entitlement: { phase: 'anonymous' as const, hasAccess: false, plan: null, expiresAt: null, trialEndsAt: null } }
const trial = {
  user: { id: 'u1', username: 'kyrie_user', displayName: 'kyrie_user', contact: 'wx-kyrie', role: 'user' as const, status: 'active' as const, passwordResetRequired: false, createdAt: '2026-08-17T00:00:00.000Z' },
  entitlement: { phase: 'trialing' as const, hasAccess: true, plan: null, expiresAt: null, trialEndsAt: '2026-08-20T00:00:00.000Z' },
}

function api(): MembershipApi {
  return {
    me: vi.fn().mockResolvedValue(anonymous),
    login: vi.fn().mockResolvedValue(trial),
    register: vi.fn().mockResolvedValue(trial),
    logout: vi.fn().mockResolvedValue(undefined),
    changePassword: vi.fn().mockResolvedValue(trial),
    getPlans: vi.fn().mockResolvedValue([]),
    createOrder: vi.fn(), claimOrder: vi.fn(), getOwnOrders: vi.fn(),
  }
}

it('registers with a contact field and explains the server trial', async () => {
  const membershipApi = api()
  render(<MemoryRouter><MembershipProvider api={membershipApi}><AuthPage /></MembershipProvider></MemoryRouter>)
  await screen.findByRole('button', { name: '注册并开始试用' })

  await userEvent.type(screen.getByLabelText('用户名'), 'kyrie_user')
  await userEvent.type(screen.getByLabelText('密码'), 'password88')
  await userEvent.type(screen.getByLabelText('联系方式'), 'wx-kyrie')
  await userEvent.click(screen.getByRole('button', { name: '注册并开始试用' }))

  expect(membershipApi.register).toHaveBeenCalledWith({ username: 'kyrie_user', password: 'password88', contact: 'wx-kyrie' })
  expect(await screen.findByText(`注册成功，${PRICING_SUMMARY.trialDays} 天完整试用已开启`)).toBeInTheDocument()
})

it('switches to login without asking for contact information', async () => {
  render(<MemoryRouter><MembershipProvider api={api()}><AuthPage /></MembershipProvider></MemoryRouter>)
  await screen.findByRole('button', { name: '我已有账号' })
  await userEvent.click(screen.getByRole('button', { name: '我已有账号' }))

  expect(screen.queryByLabelText('联系方式')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument()
  // 登录态下给出人工找回密码的出口，联系人取自 staticConfig。
  expect(await screen.findByText(`忘记密码？请联系人工客服：${WECHAT_ID}。`)).toBeInTheDocument()
})
