import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'

it('renders the Chinese product navigation', async () => {
  vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: '请先登录' }), { status: 401, headers: { 'content-type': 'application/json' } }))
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )

  expect(screen.getAllByText('Kyrie的外贸盒子').length).toBeGreaterThan(0)
  expect(screen.getByRole('link', { name: '首页' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '外贸单据中心' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '贸商工具箱' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '会员中心' })).toBeInTheDocument()
  await screen.findByText('登录后可开启 15 天完整试用')
})
