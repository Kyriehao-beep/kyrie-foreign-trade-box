import { createEmptyDraft, createLineItem } from '../../../domain/documents'
import { buildPdfPageModels, getPdfColumnWidths } from './documentPdfModel'

it('keeps a short PI and its summary on one page', () => {
  const draft = createEmptyDraft('PI')
  draft.items = [{ ...createLineItem(), name: '硅胶徽章', quantity: 500, unitPrice: 2.8 }]

  expect(buildPdfPageModels(draft)).toMatchObject([
    { pageNumber: 1, totalPages: 1, continuation: false, showSummary: true, showFooter: true },
  ])
})

it('moves complete customs rows to continuation pages', () => {
  const draft = createEmptyDraft('CD')
  draft.items = Array.from({ length: 24 }, (_, index) => ({
    ...createLineItem(),
    name: `产品 ${index + 1}`,
    declarationElements: '品牌类型；出口享惠情况；用途；材质；型号',
  }))

  const pages = buildPdfPageModels(draft)

  expect(pages.length).toBeGreaterThan(1)
  expect(pages.flatMap((page) => page.items)).toHaveLength(24)
  expect(pages.filter((page) => page.items.length > 0).at(-1)?.showSummary).toBe(true)
  expect(pages.at(-1)?.showFooter).toBe(true)
})

it('keeps one long product row intact', () => {
  const draft = createEmptyDraft('CD')
  draft.items = [{
    ...createLineItem(),
    name: '超长产品名称'.repeat(12),
    declarationElements: '申报要素'.repeat(30),
  }]

  const pages = buildPdfPageModels(draft)

  expect(pages).toHaveLength(2)
  expect(pages.flatMap((page) => page.items)).toHaveLength(1)
  expect(pages[0].items).toHaveLength(1)
  expect(pages[0].showSummary).toBe(true)
  expect(pages[0].showFooter).toBe(false)
  expect(pages[1].items).toHaveLength(0)
  expect(pages[1].showSummary).toBe(false)
  expect(pages[1].showFooter).toBe(true)
})

it('keeps one placeholder row for an empty draft', () => {
  const draft = createEmptyDraft('QT')
  draft.items = []

  const pages = buildPdfPageModels(draft)

  expect(pages).toHaveLength(1)
  expect(pages[0].items).toHaveLength(1)
})

it('reserves enough width for complete HS codes while keeping the grid within the page', () => {
  const ciWidths = getPdfColumnWidths(['description', 'specification', 'quantity', 'unit', 'unitPrice', 'amount', 'hsCode'])
  const cdWidths = getPdfColumnWidths(['description', 'specification', 'quantity', 'unit', 'hsCode', 'declarationElements'])

  expect(ciWidths.reduce((sum, width) => sum + width, 0)).toBeCloseTo(95, 5)
  expect(cdWidths.reduce((sum, width) => sum + width, 0)).toBeCloseTo(95, 5)
  expect(ciWidths.at(-1)).toBeGreaterThanOrEqual(15)
  expect(cdWidths.at(-2)).toBeGreaterThanOrEqual(15)
})
