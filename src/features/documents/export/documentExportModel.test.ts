import { describe, expect, it } from 'vitest'
import {
  formatExportValue,
  getDocumentExportDefinition,
  getDocumentExportTitle,
  getExportLabel,
} from './documentExportModel'

describe('getDocumentExportDefinition', () => {
  it.each([
    ['QT', 'QUOTATION', ['description', 'specification', 'quantity', 'unit', 'unitPrice', 'amount'], 'quotationTerms'],
    ['PI', 'PROFORMA INVOICE', ['description', 'specification', 'quantity', 'unit', 'unitPrice', 'amount'], 'bankInformation'],
    ['SC', 'SALES CONTRACT', ['description', 'specification', 'quantity', 'unit', 'unitPrice', 'amount'], 'signatures'],
    ['CI', 'COMMERCIAL INVOICE', ['description', 'specification', 'quantity', 'unit', 'unitPrice', 'amount', 'hsCode'], 'customsPayment'],
    ['PL', 'PACKING LIST', ['description', 'specification', 'quantity', 'unit', 'cartons', 'netWeight', 'grossWeight', 'volume'], 'packingTotals'],
    ['CD', 'CUSTOMS INFORMATION', ['description', 'specification', 'quantity', 'unit', 'hsCode', 'declarationElements'], 'customsDeclaration'],
  ] as const)('maps %s to the required export definition', (type, englishTitle, columns, footerKind) => {
    const definition = getDocumentExportDefinition(type)
    expect(definition.englishTitle).toBe(englishTitle)
    expect(definition.columns.map((column) => column.key)).toEqual(columns)
    expect(definition.footerKind).toBe(footerKind)
  })
})

it('formats all three document language modes', () => {
  const definition = getDocumentExportDefinition('PI')
  expect(getDocumentExportTitle(definition, 'zh')).toBe('形式发票')
  expect(getDocumentExportTitle(definition, 'en')).toBe('PROFORMA INVOICE')
  expect(getDocumentExportTitle(definition, 'bilingual')).toBe('PROFORMA INVOICE / 形式发票')
  expect(getExportLabel({ zh: '数量', en: 'QTY' }, 'bilingual')).toBe('QTY / 数量')
})

it('formats money, measurements, counts, and empty values', () => {
  expect(formatExportValue('amount', 1400, { currency: 'USD' })).toBe('USD 1,400.00')
  expect(formatExportValue('grossWeight', 18.5)).toBe('18.50 KG')
  expect(formatExportValue('volume', 0.84)).toBe('0.84 CBM')
  expect(formatExportValue('quantity', 500)).toBe('500')
  expect(formatExportValue('hsCode', '')).toBe('--')
})
