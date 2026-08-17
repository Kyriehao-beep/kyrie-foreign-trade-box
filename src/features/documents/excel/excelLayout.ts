import type { DocumentDraft, DocumentType } from '../../../domain/documents'
import {
  getDocumentExportDefinition,
  type ExportColumnKey,
  type ExportFooterKind,
} from '../export/documentExportModel'

export interface ExcelTableColumn {
  key: ExportColumnKey | 'sequence'
  startColumn: number
  endColumn: number
  width: number
  numberFormat?: string
}

export interface ExcelFormulaPlan {
  itemAmounts: string[]
  amountTotal?: string
  quantityTotal: string
  cartonsTotal?: string
  netWeightTotal?: string
  grossWeightTotal?: string
  volumeTotal?: string
}

export interface ExcelDocumentLayout {
  sheetName: string
  titleRow: number
  partyHeaderRow: number
  tableHeaderRow: number
  firstItemRow: number
  lastItemRow: number
  summaryRow: number
  footerStartRow: number
  lastContentRow: number
  printArea: string
  footerKind: ExportFooterKind
  tableColumns: ExcelTableColumn[]
  formulas: ExcelFormulaPlan
}

export interface ExcelWrappedField {
  text: string
  charactersPerLine: number
}

export function estimateExcelRowHeight(fields: ExcelWrappedField[], minimumHeight = 24): number {
  const lines = fields.reduce((maximum, field) => {
    const explicitLines = `${field.text || '--'}`.split(/\r?\n/)
    const wrappedLines = explicitLines.reduce(
      (sum, line) => sum + Math.max(1, Math.ceil(line.length / Math.max(1, field.charactersPerLine))),
      0,
    )
    return Math.max(maximum, wrappedLines)
  }, 1)
  return Math.max(minimumHeight, 8 + lines * 14)
}

const TABLE_COLUMNS: Record<DocumentType, ExcelTableColumn[]> = {
  QT: commercialColumns(),
  PI: commercialColumns(),
  SC: commercialColumns(),
  CI: [
    gridColumn('sequence', 1, 1, 5),
    gridColumn('description', 2, 3, 14),
    gridColumn('specification', 4, 4, 12),
    gridColumn('quantity', 5, 5, 10, '#,##0.##'),
    gridColumn('unit', 6, 6, 8),
    gridColumn('unitPrice', 7, 7, 12, '#,##0.00'),
    gridColumn('amount', 8, 8, 13, '#,##0.00'),
    gridColumn('hsCode', 9, 10, 13),
  ],
  PL: [
    gridColumn('sequence', 1, 1, 5),
    gridColumn('description', 2, 3, 14),
    gridColumn('specification', 4, 4, 11),
    gridColumn('quantity', 5, 5, 9, '#,##0.##'),
    gridColumn('unit', 6, 6, 7),
    gridColumn('cartons', 7, 7, 8, '#,##0.##'),
    gridColumn('netWeight', 8, 8, 10, '#,##0.00'),
    gridColumn('grossWeight', 9, 9, 10, '#,##0.00'),
    gridColumn('volume', 10, 10, 10, '#,##0.00'),
  ],
  CD: [
    gridColumn('sequence', 1, 1, 5),
    gridColumn('description', 2, 3, 13),
    gridColumn('specification', 4, 4, 11),
    gridColumn('quantity', 5, 5, 9, '#,##0.##'),
    gridColumn('unit', 6, 6, 7),
    gridColumn('hsCode', 7, 8, 12),
    gridColumn('declarationElements', 9, 10, 18),
  ],
}

export function buildExcelDocumentLayout(draft: DocumentDraft): ExcelDocumentLayout {
  const definition = getDocumentExportDefinition(draft.type)
  const tableHeaderRow = 10
  const firstItemRow = tableHeaderRow + 1
  const itemCount = Math.max(1, draft.items.length)
  const lastItemRow = firstItemRow + itemCount - 1
  const summaryRow = lastItemRow + 1
  const footerStartRow = summaryRow + 2
  const lastContentRow = footerStartRow + footerDataRows(definition.footerKind)
  const amountRange = amountCoordinates(draft.type, firstItemRow, lastItemRow)
  const quantityColumn = draft.type === 'QT' || draft.type === 'PI' || draft.type === 'SC' ? 'F' : 'E'

  return {
    sheetName: definition.sheetName,
    titleRow: 2,
    partyHeaderRow: 5,
    tableHeaderRow,
    firstItemRow,
    lastItemRow,
    summaryRow,
    footerStartRow,
    lastContentRow,
    printArea: `A1:J${lastContentRow}`,
    footerKind: definition.footerKind,
    tableColumns: TABLE_COLUMNS[draft.type],
    formulas: {
      itemAmounts: amountRange?.itemFormulas ?? [],
      amountTotal: amountRange?.totalFormula,
      quantityTotal: `SUM(${quantityColumn}${firstItemRow}:${quantityColumn}${lastItemRow})`,
      cartonsTotal: draft.type === 'PL' ? `SUM(G${firstItemRow}:G${lastItemRow})` : undefined,
      netWeightTotal: draft.type === 'PL' ? `SUMPRODUCT(E${firstItemRow}:E${lastItemRow},H${firstItemRow}:H${lastItemRow})` : undefined,
      grossWeightTotal: draft.type === 'PL' ? `SUMPRODUCT(E${firstItemRow}:E${lastItemRow},I${firstItemRow}:I${lastItemRow})` : undefined,
      volumeTotal: draft.type === 'PL' ? `SUMPRODUCT(E${firstItemRow}:E${lastItemRow},J${firstItemRow}:J${lastItemRow})` : undefined,
    },
  }
}

function commercialColumns(): ExcelTableColumn[] {
  return [
    gridColumn('sequence', 1, 1, 5),
    gridColumn('description', 2, 3, 15),
    gridColumn('specification', 4, 5, 13),
    gridColumn('quantity', 6, 6, 10, '#,##0.##'),
    gridColumn('unit', 7, 7, 8),
    gridColumn('unitPrice', 8, 8, 12, '#,##0.00'),
    gridColumn('amount', 9, 10, 14, '#,##0.00'),
  ]
}

function gridColumn(
  key: ExcelTableColumn['key'],
  startColumn: number,
  endColumn: number,
  width: number,
  numberFormat?: string,
): ExcelTableColumn {
  return { key, startColumn, endColumn, width, numberFormat }
}

function amountCoordinates(type: DocumentType, firstRow: number, lastRow: number): {
  itemFormulas: string[]
  totalFormula: string
} | undefined {
  if (type === 'PL' || type === 'CD') return undefined
  const quantityColumn = type === 'CI' ? 'E' : 'F'
  const unitPriceColumn = type === 'CI' ? 'G' : 'H'
  const amountColumn = type === 'CI' ? 'H' : 'I'
  return {
    itemFormulas: Array.from(
      { length: lastRow - firstRow + 1 },
      (_, index) => `${quantityColumn}${firstRow + index}*${unitPriceColumn}${firstRow + index}`,
    ),
    totalFormula: `SUM(${amountColumn}${firstRow}:${amountColumn}${lastRow})`,
  }
}

function footerDataRows(kind: ExportFooterKind): number {
  const rows: Record<ExportFooterKind, number> = {
    quotationTerms: 5,
    bankInformation: 10,
    signatures: 8,
    customsPayment: 9,
    packingTotals: 3,
    customsDeclaration: 5,
  }
  return rows[kind]
}
