import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProtectedFeature } from '../../App'
import { MembershipProvider } from './MembershipContext'
import type { MembershipApi, MembershipSnapshot } from './types'
import { PRICING_SUMMARY } from './staticConfig'

function api(snapshot: MembershipSnapshot): MembershipApi {
  return { me: vi.fn().mockResolvedValue(snapshot), login: vi.fn(), register: vi.fn(), logout: vi.fn(), changePassword: vi.fn(), getPlans: vi.fn(), createOrder: vi.fn(), claimOrder: vi.fn(), getOwnOrders: vi.fn() }
}

const baseEntitlement = { plan: null, expiresAt: null, trialEndsAt: null }

it('asks anonymous visitors to register instead of showing an expired paywall', async () => {
  render(<MemoryRouter><MembershipProvider api={api({ user: null, entitlement: { ...baseEntitlement, phase: 'anonymous', hasAccess: false } })}><ProtectedFeature><p>私密工具</p></ProtectedFeature></MembershipProvider></MemoryRouter>)
  expect(await screen.findByRole('heading', { name: `登录后开启 ${PRICING_SUMMARY.trialDays} 天完整试用` })).toBeInTheDocument()
  expect(screen.queryByText('私密工具')).not.toBeInTheDocument()
})

it('never opens paid tools while membership verification is unavailable', async () => {
  render(<MemoryRouter><MembershipProvider api={api({ user: null, entitlement: { ...baseEntitlement, phase: 'unavailable', hasAccess: false } })}><ProtectedFeature><p>私密工具</p></ProtectedFeature></MembershipProvider></MemoryRouter>)
  expect(await screen.findByRole('heading', { name: '暂时无法验证会员状态' })).toBeInTheDocument()
  expect(screen.queryByText('私密工具')).not.toBeInTheDocument()
})
