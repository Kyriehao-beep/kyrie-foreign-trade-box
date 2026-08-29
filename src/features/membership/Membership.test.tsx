import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MembershipProvider } from './MembershipContext'
import type { MembershipApi } from './types'
import { MembershipPage } from '../../pages/MembershipPage'
import { PLANS, PRICING_SUMMARY } from './staticConfig'

beforeEach(() => window.localStorage.clear())

const pendingApi: MembershipApi = {
  me: () => new Promise(() => undefined),
  getPlans: () => new Promise(() => undefined),
  login: vi.fn(), register: vi.fn(), logout: vi.fn(), changePassword: vi.fn(), createOrder: vi.fn(), claimOrder: vi.fn(), getOwnOrders: vi.fn(),
}

it('presents the approved paid plans without demo activation controls', () => {
  render(
    <MemoryRouter>
      <MembershipProvider api={pendingApi}>
        <MembershipPage />
      </MembershipProvider>
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: '先完整试用，再决定是否付费' })).toBeInTheDocument()
  // 方案名与价格一律与 staticConfig 对齐，避免页面改价后测试仍写死旧数字。
  for (const plan of PLANS) {
    expect(screen.getByRole('heading', { name: plan.name })).toBeInTheDocument()
    expect(screen.getByText(`¥${plan.amountCny}`)).toBeInTheDocument()
  }
  expect(screen.getAllByText(PRICING_SUMMARY.lifetimeScope, { exact: false }).length).toBeGreaterThan(0)
  expect(screen.getAllByText(PRICING_SUMMARY.lifetimeExcludes, { exact: false }).length).toBeGreaterThan(0)
  expect(screen.getAllByText(PRICING_SUMMARY.noAutoCharge, { exact: false }).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/^管理员席位[一二三]$/)).toHaveLength(3)
  expect(screen.queryByText('演示激活此方案')).not.toBeInTheDocument()
})
