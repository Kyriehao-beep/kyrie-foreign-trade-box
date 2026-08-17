import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { exportExcelDocument } from '../../services/excelExport'
import { exportPdfDocument } from '../../services/pdfExport'
import { DocumentWorkspace } from './DocumentWorkspace'

vi.mock('../../services/pdfExport', () => ({ exportPdfDocument: vi.fn() }))
vi.mock('../../services/excelExport', () => ({ exportExcelDocument: vi.fn() }))

beforeEach(() => {
  window.localStorage.clear()
  vi.clearAllMocks()
})

it('offers all six document types and updates the live preview', async () => {
  const user = userEvent.setup()
  render(<DocumentWorkspace />)

  expect(screen.getByRole('button', { name: '报价单（QT）' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '形式发票（PI）' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '销售合同（SC）' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '商业发票（CI）' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '装箱单（PL）' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '报关信息／报关单（CD）' })).toBeInTheDocument()

  await user.type(screen.getByLabelText('买方公司名称'), '北辰户外用品有限公司')
  expect(screen.getByTestId('document-preview')).toHaveTextContent('北辰户外用品有限公司')
})

it('disables only PDF export while generating', async () => {
  let resolveExport!: () => void
  const pending = new Promise<void>((resolve) => { resolveExport = resolve })
  vi.mocked(exportPdfDocument).mockReturnValueOnce(pending)
  const user = userEvent.setup()
  render(<DocumentWorkspace />)

  await user.click(screen.getByRole('button', { name: '导出 PDF' }))

  expect(screen.getByRole('button', { name: '正在生成 PDF…' })).toBeDisabled()
  expect(screen.getByRole('button', { name: '导出 Excel' })).toBeEnabled()
  resolveExport()
  expect(await screen.findByText('PDF 已导出')).toBeInTheDocument()
})

it('reports Excel success and restores the button', async () => {
  vi.mocked(exportExcelDocument).mockResolvedValueOnce(undefined)
  const user = userEvent.setup()
  render(<DocumentWorkspace />)

  await user.click(screen.getByRole('button', { name: '导出 Excel' }))

  expect(await screen.findByText('Excel 已导出')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '导出 Excel' })).toBeEnabled()
})

it('reports Excel failure without changing the draft', async () => {
  vi.mocked(exportExcelDocument).mockRejectedValueOnce(new Error('write failed'))
  const user = userEvent.setup()
  render(<DocumentWorkspace />)

  await user.type(screen.getByLabelText('买方公司名称'), '北辰户外用品有限公司')
  await user.click(screen.getByRole('button', { name: '导出 Excel' }))

  expect(await screen.findByText('Excel 生成失败，请检查内容后重试')).toBeInTheDocument()
  expect(screen.getByLabelText('买方公司名称')).toHaveValue('北辰户外用品有限公司')
})
