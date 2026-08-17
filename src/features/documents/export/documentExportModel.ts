import type { DocumentLanguage, DocumentType } from '../../../domain/documents'

export type ExportColumnKey =
  | 'description'
  | 'specification'
  | 'quantity'
  | 'unit'
  | 'unitPrice'
  | 'amount'
  | 'cartons'
  | 'netWeight'
  | 'grossWeight'
  | 'volume'
  | 'hsCode'
  | 'declarationElements'

export type ExportFooterKind =
  | 'quotationTerms'
  | 'bankInformation'
  | 'signatures'
  | 'customsPayment'
  | 'packingTotals'
  | 'customsDeclaration'

export interface LocalizedLabel {
  zh: string
  en: string
}

export interface ExportColumnDefinition {
  key: ExportColumnKey
  labels: LocalizedLabel
  align: 'left' | 'center' | 'right'
}

export interface DocumentExportDefinition {
  type: DocumentType
  sheetName: string
  chineseTitle: string
  englishTitle: string
  columns: ExportColumnDefinition[]
  footerKind: ExportFooterKind
}

const COLUMN_DEFINITIONS: Record<ExportColumnKey, ExportColumnDefinition> = {
  description: column('description', '产品名称', 'PRODUCT', 'left'),
  specification: column('specification', '规格', 'SPECIFICATION', 'left'),
  quantity: column('quantity', '数量', 'QTY', 'right'),
  unit: column('unit', '单位', 'UNIT', 'center'),
  unitPrice: column('unitPrice', '单价', 'UNIT PRICE', 'right'),
  amount: column('amount', '金额', 'AMOUNT', 'right'),
  cartons: column('cartons', '箱数', 'CARTONS', 'right'),
  netWeight: column('netWeight', '单件净重', 'UNIT N.W.', 'right'),
  grossWeight: column('grossWeight', '单件毛重', 'UNIT G.W.', 'right'),
  volume: column('volume', '单件体积', 'UNIT CBM', 'right'),
  hsCode: column('hsCode', 'HS 编码', 'HS CODE', 'center'),
  declarationElements: column('declarationElements', '申报要素', 'DECLARATION ELEMENTS', 'left'),
}

export const DOCUMENT_EXPORT_DEFINITIONS: Record<DocumentType, DocumentExportDefinition> = {
  QT: definition('QT', '报价单', 'QUOTATION', ['description', 'specification', 'quantity', 'unit', 'unitPrice', 'amount'], 'quotationTerms'),
  PI: definition('PI', '形式发票', 'PROFORMA INVOICE', ['description', 'specification', 'quantity', 'unit', 'unitPrice', 'amount'], 'bankInformation'),
  SC: definition('SC', '销售合同', 'SALES CONTRACT', ['description', 'specification', 'quantity', 'unit', 'unitPrice', 'amount'], 'signatures'),
  CI: definition('CI', '商业发票', 'COMMERCIAL INVOICE', ['description', 'specification', 'quantity', 'unit', 'unitPrice', 'amount', 'hsCode'], 'customsPayment'),
  PL: definition('PL', '装箱单', 'PACKING LIST', ['description', 'specification', 'quantity', 'unit', 'cartons', 'netWeight', 'grossWeight', 'volume'], 'packingTotals'),
  CD: definition('CD', '报关信息', 'CUSTOMS INFORMATION', ['description', 'specification', 'quantity', 'unit', 'hsCode', 'declarationElements'], 'customsDeclaration'),
}

export function getDocumentExportDefinition(type: DocumentType): DocumentExportDefinition {
  return DOCUMENT_EXPORT_DEFINITIONS[type]
}

export function getDocumentExportTitle(
  definitionValue: DocumentExportDefinition,
  language: DocumentLanguage,
): string {
  if (language === 'zh') return definitionValue.chineseTitle
  if (language === 'en') return definitionValue.englishTitle
  return `${definitionValue.englishTitle} / ${definitionValue.chineseTitle}`
}

export function getExportLabel(label: LocalizedLabel, language: DocumentLanguage): string {
  if (language === 'zh') return label.zh
  if (language === 'en') return label.en
  return `${label.en} / ${label.zh}`
}

export function formatExportValue(
  key: ExportColumnKey,
  value: string | number,
  options: { currency?: string } = {},
): string {
  if (value === '' || value === null || value === undefined) return '--'
  if (typeof value === 'string') return value.trim() || '--'
  if (!Number.isFinite(value)) return '--'

  if (key === 'amount' || key === 'unitPrice') {
    const currency = currencyCode(options.currency)
    return `${currency} ${formatNumber(value, 2, 2)}`
  }
  if (key === 'netWeight' || key === 'grossWeight') return `${formatNumber(value, 2, 2)} KG`
  if (key === 'volume') return `${formatNumber(value, 2, 2)} CBM`
  return formatNumber(value, 0, 2)
}

function column(
  key: ExportColumnKey,
  zh: string,
  en: string,
  align: ExportColumnDefinition['align'],
): ExportColumnDefinition {
  return { key, labels: { zh, en }, align }
}

function definition(
  type: DocumentType,
  chineseTitle: string,
  englishTitle: string,
  columnKeys: ExportColumnKey[],
  footerKind: ExportFooterKind,
): DocumentExportDefinition {
  return {
    type,
    sheetName: chineseTitle,
    chineseTitle,
    englishTitle,
    columns: columnKeys.map((key) => COLUMN_DEFINITIONS[key]),
    footerKind,
  }
}

function currencyCode(currency = 'USD'): string {
  const normalized = currency.trim().toUpperCase()
  const codes: Record<string, string> = {
    美元: 'USD',
    人民币: 'CNY',
    欧元: 'EUR',
    英镑: 'GBP',
    日元: 'JPY',
  }
  return codes[normalized] ?? (normalized || 'USD')
}

function formatNumber(value: number, minimumFractionDigits: number, maximumFractionDigits: number): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits, maximumFractionDigits }).format(value)
}
