import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from './HomePage'

it('clearly separates local document data from server account data', () => {
  render(<MemoryRouter><HomePage /></MemoryRouter>)
  expect(screen.getByText('单据内容仍在本地处理，不上传云端')).toBeInTheDocument()
  expect(screen.getByText('账号、会员状态与付款申请保存在服务器')).toBeInTheDocument()
})
