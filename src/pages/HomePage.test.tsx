import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from './HomePage'
import { PLANS, PRICING_SUMMARY } from '../features/membership/staticConfig'

it('states where the business data is kept instead of promising vague privacy', () => {
  render(<MemoryRouter><HomePage /></MemoryRouter>)
  expect(screen.getByText('单据与跟单数据默认保存在当前浏览器，本地功能不会主动上传业务资料')).toBeInTheDocument()
  // 不能出现无法兑现的绝对化承诺。
  expect(screen.queryByText(/隐私零风险/)).not.toBeInTheDocument()
})

it('quotes the same prices everywhere as the single source of truth', () => {
  render(<MemoryRouter><HomePage /></MemoryRouter>)
  for (const plan of PLANS) {
    expect(screen.getByText(`¥${plan.amountCny}`)).toBeInTheDocument()
  }
  expect(screen.getAllByText(PRICING_SUMMARY.trial, { exact: false }).length).toBeGreaterThan(0)
  // 买断范围必须讲清楚，不能承诺未来所有功能永久免费。
  expect(screen.getAllByText(PRICING_SUMMARY.lifetimeScope, { exact: false }).length).toBeGreaterThan(0)
  expect(screen.getAllByText(PRICING_SUMMARY.lifetimeExcludes, { exact: false }).length).toBeGreaterThan(0)
  expect(screen.queryByText(/永久免费/)).not.toBeInTheDocument()
  expect(screen.queryByText(/未来所有工具/)).not.toBeInTheDocument()
})

it('does not advertise features that are not shipped yet', () => {
  render(<MemoryRouter><HomePage /></MemoryRouter>)
  expect(screen.queryByText(/开发信生成/)).not.toBeInTheDocument()
  expect(screen.queryByText(/装箱计算/)).not.toBeInTheDocument()
  expect(screen.queryByText(/客户管理/)).not.toBeInTheDocument()
  expect(screen.queryByText(/自动测算 FOB\/CIF 报价/)).not.toBeInTheDocument()
})
