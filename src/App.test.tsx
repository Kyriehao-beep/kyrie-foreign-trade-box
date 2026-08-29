import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'
import { PRICING_SUMMARY } from './features/membership/staticConfig'

it('renders the Chinese marketing navigation on the home page', async () => {
  vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: '请先登录' }), { status: 401, headers: { 'content-type': 'application/json' } }))
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )

  expect(screen.getAllByText('Kyrie的外贸盒子').length).toBeGreaterThan(0)
  // 首页使用轻量营销导航（顶部），不再内嵌工作台侧栏。
  expect(screen.getByRole('link', { name: '首页' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '工具' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '会员方案' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '关于 & 定制' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '联系站长' })).toBeInTheDocument()
  // 首页在试用期内完整开放，不应直接弹出付费墙。
  expect((await screen.findAllByText(PRICING_SUMMARY.trial, { exact: false })).length).toBeGreaterThan(0)
  expect(screen.queryByText('免费试用已结束')).not.toBeInTheDocument()
})
