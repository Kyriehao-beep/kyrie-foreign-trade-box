import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AdminPage } from './AdminPage'
import type { AdminMemberRow } from '../features/membership/backendAdminApi'

// 站长后台现在走服务端鉴权（backendAdminApi），只有 isBackendEnabled() 为真时才渲染该分支。
const mocks = vi.hoisted(() => ({
  isLoggedIn: vi.fn(),
  login: vi.fn(),
  listMembers: vi.fn(),
  grant: vi.fn(),
  revoke: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('../features/membership/backendAdminApi', () => ({ backendAdminApi: mocks }))

vi.mock('../services/apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/apiClient')>()
  return { ...actual, isBackendEnabled: () => true }
})

const member: AdminMemberRow = {
  username: 'buyer_one',
  plan: 'yearly',
  status: 'active',
  createdAt: '2026-08-17T00:00:00.000Z',
  memberUntil: Date.parse('2027-08-17T00:00:00.000Z'),
  hasAccess: true,
  phase: 'active_yearly',
  orders: 1,
}

function renderAdmin() {
  return render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.isLoggedIn.mockResolvedValue(false)
  mocks.listMembers.mockResolvedValue([member])
  mocks.grant.mockResolvedValue(undefined)
  mocks.revoke.mockResolvedValue(undefined)
})

it('shows the server-side login form when the admin is not signed in', async () => {
  renderAdmin()
  expect(await screen.findByRole('heading', { name: '站长后台登录' })).toBeInTheDocument()
  expect(screen.getByLabelText('站长账号')).toBeInTheDocument()
  expect(screen.getByLabelText('密码')).toBeInTheDocument()
})

it('reports a wrong password instead of granting access', async () => {
  mocks.login.mockResolvedValue(false)
  renderAdmin()
  await userEvent.type(await screen.findByLabelText('站长账号'), 'admin')
  await userEvent.type(screen.getByLabelText('密码'), 'wrong-password')
  await userEvent.click(screen.getByRole('button', { name: '登录' }))

  expect(await screen.findByText('站长账号或密码错误')).toBeInTheDocument()
  expect(mocks.listMembers).not.toHaveBeenCalled()
})

it('lists members and exposes the plan options after signing in', async () => {
  mocks.isLoggedIn.mockResolvedValue(true)
  mocks.login.mockResolvedValue(true)
  renderAdmin()

  expect(await screen.findByRole('heading', { name: '站长后台（服务端）' })).toBeInTheDocument()
  expect(screen.getByText(`会员列表（1）`)).toBeInTheDocument()
  expect(screen.getByText('buyer_one')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '吊销' })).toBeInTheDocument()

  // The plan dropdown is driven by the single source of truth in staticConfig.
  const options = screen.getAllByRole('option').map((option) => option.textContent)
  expect(options).toEqual(['月度会员', '年度会员', '本地买断版'])
})

it('asks for a username before granting a membership', async () => {
  mocks.isLoggedIn.mockResolvedValue(true)
  renderAdmin()
  await userEvent.click(await screen.findByRole('button', { name: '发放' }))

  expect(await screen.findByText('请填写要发放会员的客户用户名')).toBeInTheDocument()
  expect(mocks.grant).not.toHaveBeenCalled()
})

it('grants the selected plan and then revokes it', async () => {
  mocks.isLoggedIn.mockResolvedValue(true)
  renderAdmin()

  await userEvent.type(await screen.findByPlaceholderText('客户用户名'), 'buyer_two')
  await userEvent.click(screen.getByRole('button', { name: '发放' }))
  await screen.findByText('已为 buyer_two 发放 年度会员')
  expect(mocks.grant).toHaveBeenCalledWith({ username: 'buyer_two', plan: 'yearly', days: 365 })

  await userEvent.click(screen.getByRole('button', { name: '吊销' }))
  expect(await screen.findByText('已吊销 buyer_one 的会员')).toBeInTheDocument()
  expect(mocks.revoke).toHaveBeenCalledWith('buyer_one')
})

it('shows a retry message when the member list cannot be loaded', async () => {
  mocks.isLoggedIn.mockResolvedValue(true)
  mocks.listMembers.mockRejectedValue(new Error('network down'))
  renderAdmin()
  expect(await screen.findByText('读取会员列表失败，请重试')).toBeInTheDocument()
})
