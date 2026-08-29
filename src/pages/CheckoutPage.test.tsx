import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MembershipProvider } from '../features/membership/MembershipContext'
import type { MembershipApi } from '../features/membership/types'
import { CONTACT_TIP, PLANS, WECHAT_ID } from '../features/membership/staticConfig'
import { CheckoutPage } from './CheckoutPage'

const snapshot = {
  user: { id: 'u1', username: 'kyrie', displayName: 'kyrie', contact: 'wx', role: 'user' as const, status: 'active' as const, passwordResetRequired: false, createdAt: '2026-08-17T00:00:00.000Z' },
  entitlement: { phase: 'trialing' as const, hasAccess: true, plan: null, expiresAt: null, trialEndsAt: '2026-08-20T00:00:00.000Z' },
}

function api(): MembershipApi {
  return { me: vi.fn().mockResolvedValue(snapshot), login: vi.fn(), register: vi.fn(), logout: vi.fn(), changePassword: vi.fn(), getPlans: vi.fn().mockResolvedValue(PLANS), createOrder: vi.fn(), claimOrder: vi.fn(), getOwnOrders: vi.fn().mockResolvedValue([]) }
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MembershipProvider api={api()}>
        <Routes>
          <Route path="/checkout/:plan" element={<CheckoutPage />} />
          <Route path="/membership" element={<p>会员方案页</p>} />
        </Routes>
      </MembershipProvider>
    </MemoryRouter>,
  )
}

it('shows the plan price and the WeChat payment QR as the default step', async () => {
  renderAt('/checkout/monthly')
  const monthly = PLANS.find((p) => p.id === 'monthly')!

  expect(await screen.findByRole('heading', { name: `开通${monthly.name}` })).toBeInTheDocument()
  expect(screen.getByText(`¥${monthly.amountCny}`)).toBeInTheDocument()
  expect(screen.getByAltText('微信收款码')).toBeInTheDocument()
  expect(screen.getByText(CONTACT_TIP)).toBeInTheDocument()
})

it('falls back to a manual note when the buyer picks Alipay', async () => {
  renderAt('/checkout/yearly')

  await userEvent.click(await screen.findByRole('button', { name: '支付宝' }))
  expect(await screen.findByText(/暂仅支持微信收款/)).toBeInTheDocument()
  expect(screen.getAllByText(WECHAT_ID).length).toBeGreaterThan(0)
  expect(screen.queryByAltText('微信收款码')).not.toBeInTheDocument()
})

it('points the buyer at the unlock-code page after paying', async () => {
  renderAt('/checkout/lifetime')
  expect(await screen.findByRole('link', { name: '我已付款，去输入解锁码' })).toHaveAttribute('href', '/unlock')
})

it('redirects an unknown plan back to the membership page', async () => {
  renderAt('/checkout/not-a-plan')
  expect(await screen.findByText('会员方案页')).toBeInTheDocument()
})
