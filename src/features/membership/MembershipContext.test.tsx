import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MembershipProvider, useMembership } from './MembershipContext'
import type { MembershipApi, MembershipSnapshot } from './types'

const trialSnapshot: MembershipSnapshot = {
  user: {
    id: 'user-1',
    username: 'KyrieUser',
    displayName: 'KyrieUser',
    contact: 'kyrie_wechat',
    role: 'user',
    status: 'active',
    passwordResetRequired: false,
    createdAt: '2026-08-17T00:00:00.000Z',
  },
  entitlement: {
    phase: 'trialing',
    hasAccess: true,
    plan: null,
    expiresAt: null,
    trialEndsAt: '2026-08-20T00:00:00.000Z',
  },
}

function createApi(overrides: Partial<MembershipApi> = {}): MembershipApi {
  return {
    me: vi.fn().mockResolvedValue(trialSnapshot),
    logout: vi.fn().mockResolvedValue(undefined),
    login: vi.fn(),
    register: vi.fn(),
    changePassword: vi.fn(),
    getPlans: vi.fn(),
    createOrder: vi.fn(),
    claimOrder: vi.fn(),
    getOwnOrders: vi.fn(),
    ...overrides,
  }
}

function Probe() {
  const { snapshot, loading, error, refresh, logout, login } = useMembership()
  return (
    <div>
      <p>状态：{loading ? '载入中' : snapshot.entitlement.phase}</p>
      <p>错误：{error || '无'}</p>
      <p>用户：{snapshot.user?.username || '未登录'}</p>
      <button type="button" onClick={() => void refresh()}>重新验证</button>
      <button type="button" onClick={() => void login({ username: 'KyrieUser', password: 'safe-password' })}>登录</button>
      <button type="button" onClick={() => void logout()}>退出登录</button>
    </div>
  )
}

beforeEach(() => window.localStorage.clear())

it('loads the server trial without creating local membership keys', async () => {
  render(<MembershipProvider api={createApi()}><Probe /></MembershipProvider>)

  expect(screen.getByText('状态：载入中')).toBeInTheDocument()
  expect(await screen.findByText('状态：trialing')).toBeInTheDocument()
  expect(screen.getByText('用户：KyrieUser')).toBeInTheDocument()
  expect(window.localStorage.length).toBe(0)
})

it('treats an account API failure as unavailable instead of expired', async () => {
  render(<MembershipProvider api={createApi({ me: vi.fn().mockRejectedValue(new Error('offline')) })}><Probe /></MembershipProvider>)

  expect(await screen.findByText('状态：unavailable')).toBeInTheDocument()
  expect(screen.getByText('错误：暂时无法验证会员状态，请检查网络后重试')).toBeInTheDocument()
  expect(screen.queryByText('状态：expired')).not.toBeInTheDocument()
})

it('supports retrying a failed membership check', async () => {
  const me = vi.fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(trialSnapshot)
  render(<MembershipProvider api={createApi({ me })}><Probe /></MembershipProvider>)
  await screen.findByText('状态：unavailable')

  await userEvent.click(screen.getByRole('button', { name: '重新验证' }))

  expect(await screen.findByText('状态：trialing')).toBeInTheDocument()
  expect(me).toHaveBeenCalledTimes(2)
})

it('clears the account snapshot after server logout', async () => {
  const api = createApi()
  render(<MembershipProvider api={api}><Probe /></MembershipProvider>)
  await screen.findByText('用户：KyrieUser')

  await userEvent.click(screen.getByRole('button', { name: '退出登录' }))

  await waitFor(() => expect(screen.getByText('状态：anonymous')).toBeInTheDocument())
  expect(api.logout).toHaveBeenCalledOnce()
})

it('does not let a stale initial check overwrite a completed login', async () => {
  let resolveInitialCheck: ((value: MembershipSnapshot) => void) | undefined
  const initialCheck = new Promise<MembershipSnapshot>((resolve) => { resolveInitialCheck = resolve })
  const anonymous: MembershipSnapshot = {
    user: null,
    entitlement: { phase: 'anonymous', hasAccess: false, plan: null, expiresAt: null, trialEndsAt: null },
  }
  const api = createApi({
    me: vi.fn().mockReturnValue(initialCheck),
    login: vi.fn().mockResolvedValue(trialSnapshot),
  })
  render(<MembershipProvider api={api}><Probe /></MembershipProvider>)

  await userEvent.click(screen.getByRole('button', { name: '登录' }))
  expect(await screen.findByText('用户：KyrieUser')).toBeInTheDocument()

  resolveInitialCheck?.(anonymous)
  await waitFor(() => expect(screen.getByText('用户：KyrieUser')).toBeInTheDocument())
  expect(screen.queryByText('用户：未登录')).not.toBeInTheDocument()
})
