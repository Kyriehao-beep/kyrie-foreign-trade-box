import { calculateTotals, createEmptyDraft, DOCUMENT_TYPES, type LineItem } from './documents'

it('supports all six foreign-trade document types', () => {
  expect(DOCUMENT_TYPES.map((item) => item.code)).toEqual(['QT', 'PI', 'SC', 'CI', 'PL', 'CD'])
})

it('creates independent drafts with Chinese defaults', () => {
  const quotation = createEmptyDraft('QT')
  const packingList = createEmptyDraft('PL')

  expect(quotation.type).toBe('QT')
  expect(packingList.type).toBe('PL')
  expect(quotation.documentNumber).toMatch(/^QT-/)
  expect(quotation.items[0].id).not.toBe(packingList.items[0].id)
  expect(quotation.trade.currency).toBe('美元')
})

it('calculates money and shipment totals without floating-point noise', () => {
  const item = {
    quantity: 3,
    unitPrice: 12.5,
    netWeight: 2,
    grossWeight: 2.4,
    volume: 0.03,
    cartons: 2,
  } as LineItem

  expect(calculateTotals([item])).toEqual({
    amount: 37.5,
    quantity: 3,
    cartons: 2,
    netWeight: 6,
    grossWeight: 7.2,
    volume: 0.09,
  })
})
