import { render, screen, within } from '@testing-library/react'
import { createEmptyDraft } from '../../../domain/documents'
import { DocumentPdfExportSurface } from './DocumentPdfTemplate'

it.each([
  ['QT', '报价有效期'],
  ['PI', '银行信息'],
  ['SC', '买方签章'],
  ['CI', '清关与收款资料'],
  ['PL', '总体积'],
  ['CD', '申报要素'],
] as const)('renders the %s PDF-specific section', (type, expectedText) => {
  render(<DocumentPdfExportSurface draft={createEmptyDraft(type)} />)
  expect(screen.getByText(expectedText)).toBeInTheDocument()
})

it('keeps workspace controls outside the A4 page', () => {
  render(<DocumentPdfExportSurface draft={createEmptyDraft('PI')} />)
  const page = screen.getByTestId('pdf-page-1')
  expect(page).toHaveAttribute('data-pdf-page')
  expect(within(page).queryByText('导出 Excel')).not.toBeInTheDocument()
})

it('renders a bilingual title when selected', () => {
  const draft = createEmptyDraft('PI')
  draft.language = 'bilingual'
  render(<DocumentPdfExportSurface draft={draft} />)
  const title = screen.getByText('PROFORMA INVOICE / 形式发票')
  expect(title).toBeInTheDocument()
  expect(title.closest('[data-pdf-page]')).toHaveAttribute('data-pdf-language', 'bilingual')
})

it('exports all reusable party fields and PI shipping details', () => {
  const draft = createEmptyDraft('PI')
  draft.seller.country = '中国'
  draft.seller.taxId = '91440101TEST'
  draft.trade.portOfLoading = '深圳'
  draft.trade.portOfDestination = '洛杉矶'
  draft.settlement.transportMode = '海运'
  draft.settlement.bankAddress = '广州市天河区银行路 88 号'

  render(<DocumentPdfExportSurface draft={draft} />)

  expect(screen.getAllByText(/国家或地区/).length).toBeGreaterThan(0)
  expect(screen.getByText(/91440101TEST/)).toBeInTheDocument()
  expect(screen.getByText('装运港')).toBeInTheDocument()
  expect(screen.getByText('目的港')).toBeInTheDocument()
  expect(screen.getByText('运输方式')).toBeInTheDocument()
  expect(screen.getByText('银行地址')).toBeInTheDocument()
})

it('exports complete CI payment details', () => {
  const draft = createEmptyDraft('CI')
  draft.settlement.accountName = '广州凯瑞进出口有限公司'
  draft.settlement.bankAddress = '广州市天河区银行路 88 号'
  draft.settlement.swift = 'KRYECN22'

  render(<DocumentPdfExportSurface draft={draft} />)

  expect(screen.getByText('账户名称')).toBeInTheDocument()
  expect(screen.getByText('银行地址')).toBeInTheDocument()
  expect(screen.getByText('SWIFT')).toBeInTheDocument()
})
