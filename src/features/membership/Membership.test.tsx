import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MembershipProvider } from './MembershipContext'
import type { MembershipApi } from './types'
import { MembershipPage } from '../../pages/MembershipPage'

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
  expect(screen.getByText('月度订阅')).toBeInTheDocument()
  expect(screen.getByText('年度订阅')).toBeInTheDocument()
  expect(screen.getByText('永久买断')).toBeInTheDocument()
  expect(screen.getByText('¥59')).toBeInTheDocument()
  expect(screen.getByText('¥499')).toBeInTheDocument()
  expect(screen.getByText('¥1299')).toBeInTheDocument()
  expect(screen.getAllByText(/^管理员席位[一二三]$/)).toHaveLength(3)
  expect(screen.queryByText('演示激活此方案')).not.toBeInTheDocument()
})
