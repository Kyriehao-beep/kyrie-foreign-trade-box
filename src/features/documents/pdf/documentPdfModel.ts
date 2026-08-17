import { createLineItem, type DocumentDraft, type LineItem } from '../../../domain/documents'
import {
  getDocumentExportDefinition,
  type DocumentExportDefinition,
  type ExportColumnKey,
  type ExportFooterKind,
} from '../export/documentExportModel'

export interface PdfPageModel {
  draft: DocumentDraft
  definition: DocumentExportDefinition
  items: LineItem[]
  pageNumber: number
  totalPages: number
  continuation: boolean
  showSummary: boolean
  showFooter: boolean
}

const FIRST_PAGE_CAPACITY = 8
const CONTINUATION_PAGE_CAPACITY = 13
const SUMMARY_UNITS = 1
const FOOTER_UNITS: Record<ExportFooterKind, number> = {
  quotationTerms: 3,
  bankInformation: 6,
  signatures: 5,
  customsPayment: 4,
  packingTotals: 3,
  customsDeclaration: 4,
}

const PDF_COLUMN_WEIGHTS: Record<ExportColumnKey, number> = {
  description: 20,
  specification: 14,
  quantity: 10,
  unit: 8,
  unitPrice: 12,
  amount: 14,
  cartons: 9,
  netWeight: 11,
  grossWeight: 11,
  volume: 11,
  hsCode: 15,
  declarationElements: 24,
}

export function getPdfColumnWidths(keys: ExportColumnKey[]): number[] {
  const totalWeight = keys.reduce((sum, key) => sum + PDF_COLUMN_WEIGHTS[key], 0)
  return keys.map((key) => (PDF_COLUMN_WEIGHTS[key] / totalWeight) * 95)
}

export function estimatePdfRowUnits(item: LineItem, definition: DocumentExportDefinition): number {
  const descriptionLines = Math.ceil(`${item.name} ${item.specification}`.trim().length / 36)
  const declarationLines = definition.columns.some((column) => column.key === 'declarationElements')
    ? Math.ceil(item.declarationElements.length / 24)
    : 0
  return Math.min(5, Math.max(1, descriptionLines, declarationLines))
}

export function buildPdfPageModels(draft: DocumentDraft): PdfPageModel[] {
  const definition = getDocumentExportDefinition(draft.type)
  const sourceItems = draft.items.length > 0 ? draft.items : [createLineItem()]
  const packed: LineItem[][] = [[]]
  let usedUnits = 0

  for (const item of sourceItems) {
    const rowUnits = estimatePdfRowUnits(item, definition)
    const capacity = (packed.length === 1 ? FIRST_PAGE_CAPACITY : CONTINUATION_PAGE_CAPACITY) - SUMMARY_UNITS
    if (packed.at(-1)!.length > 0 && usedUnits + rowUnits > capacity) {
      packed.push([])
      usedUnits = 0
    }
    packed.at(-1)!.push(item)
    usedUnits += rowUnits
  }

  const lastCapacity = packed.length === 1 ? FIRST_PAGE_CAPACITY : CONTINUATION_PAGE_CAPACITY
  if (usedUnits + SUMMARY_UNITS + FOOTER_UNITS[definition.footerKind] > lastCapacity) packed.push([])

  const totalPages = packed.length
  let lastProductPage = 0
  packed.forEach((items, index) => {
    if (items.length > 0) lastProductPage = index
  })
  const footerPage = packed.length - 1
  return packed.map((items, index) => ({
    draft,
    definition,
    items,
    pageNumber: index + 1,
    totalPages,
    continuation: index > 0,
    showSummary: index === lastProductPage,
    showFooter: index === footerPage,
  }))
}
