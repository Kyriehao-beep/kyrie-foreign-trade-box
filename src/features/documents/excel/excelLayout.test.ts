import { createEmptyDraft, createLineItem } from '../../../domain/documents'
import { buildExcelDocumentLayout, estimateExcelRowHeight } from './excelLayout'

it.each([
  ['QT', '报价单', 6, 'quotationTerms'],
  ['PI', '形式发票', 6, 'bankInformation'],
  ['SC', '销售合同', 6, 'signatures'],
  ['CI', '商业发票', 7, 'customsPayment'],
  ['PL', '装箱单', 8, 'packingTotals'],
  ['CD', '报关信息', 6, 'customsDeclaration'],
] as const)('builds the %s single-sheet grid', (type, sheetName, dataColumns, footerKind) => {
  const layout = buildExcelDocumentLayout(createEmptyDraft(type))
  expect(layout.sheetName).toBe(sheetName)
  expect(layout.tableColumns.filter((column) => column.key !== 'sequence')).toHaveLength(dataColumns)
  expect(layout.footerKind).toBe(footerKind)
  expect(layout.printArea).toMatch(/^A1:J\d+$/)
})

it('uses bounded formulas for quotation amount and total', () => {
  const draft = createEmptyDraft('QT')
  draft.items = [createLineItem(), createLineItem()]
  const layout = buildExcelDocumentLayout(draft)
  expect(layout.formulas.itemAmounts).toEqual(['F11*H11', 'F12*H12'])
  expect(layout.formulas.amountTotal).toBe('SUM(I11:I12)')
})

it('uses quantity-weighted packing formulas', () => {
  const layout = buildExcelDocumentLayout(createEmptyDraft('PL'))
  expect(layout.formulas.netWeightTotal).toBe('SUMPRODUCT(E11:E11,H11:H11)')
  expect(layout.formulas.grossWeightTotal).toBe('SUMPRODUCT(E11:E11,I11:I11)')
  expect(layout.formulas.volumeTotal).toBe('SUMPRODUCT(E11:E11,J11:J11)')
})

it('reserves one item row when the draft is empty', () => {
  const draft = createEmptyDraft('PI')
  draft.items = []
  const layout = buildExcelDocumentLayout(draft)
  expect(layout.firstItemRow).toBe(11)
  expect(layout.lastItemRow).toBe(11)
  expect(layout.summaryRow).toBe(12)
})

it('expands Excel rows for long wrapped values', () => {
  expect(estimateExcelRowHeight([{ text: '短内容', charactersPerLine: 20 }], 24)).toBe(24)
  expect(estimateExcelRowHeight([{ text: '很长的申报要素'.repeat(20), charactersPerLine: 20 }], 24)).toBeGreaterThan(60)
})
