export type DocumentType = 'QT' | 'PI' | 'SC' | 'CI' | 'PL' | 'CD'
export type DocumentLanguage = 'zh' | 'en' | 'bilingual'
export type DocumentLayout = 'modern' | 'classic' | 'minimal'

export interface DocumentTypeOption {
  code: DocumentType
  name: string
  fullName: string
  description: string
}

export interface Party {
  companyName: string
  address: string
  contact: string
  phone: string
  email: string
  taxId: string
  country: string
}

export interface PartyTemplate extends Party {
  id: string
  name: string
  kind: 'seller' | 'buyer'
}

export interface LineItem {
  id: string
  name: string
  specification: string
  quantity: number
  unit: string
  unitPrice: number
  cartons: number
  netWeight: number
  grossWeight: number
  volume: number
  hsCode: string
  declarationElements: string
}

export interface TradeTerms {
  country: string
  incoterm: string
  paymentTerm: string
  currency: string
  deliveryTime: string
  portOfLoading: string
  portOfDestination: string
  validity: string
}

export interface SettlementCustoms {
  bankName: string
  accountName: string
  accountNumber: string
  bankAddress: string
  swift: string
  transportMode: string
  customsPort: string
  marks: string
}

export interface DocumentDraft {
  version: 1
  type: DocumentType
  documentNumber: string
  issueDate: string
  seller: Party
  buyer: Party
  items: LineItem[]
  trade: TradeTerms
  settlement: SettlementCustoms
  notes: string
  language: DocumentLanguage
  layout: DocumentLayout
  updatedAt: string
  reviewFields: string[]
  logo: string
}

export interface DocumentTotals {
  amount: number
  quantity: number
  cartons: number
  netWeight: number
  grossWeight: number
  volume: number
}

export const DOCUMENT_TYPES: DocumentTypeOption[] = [
  { code: 'QT', name: '报价单', fullName: '报价单（QT）', description: '整理产品价格、有效期与贸易条款' },
  { code: 'PI', name: '形式发票', fullName: '形式发票（PI）', description: '确认订单、付款方式与收款信息' },
  { code: 'SC', name: '销售合同', fullName: '销售合同（SC）', description: '约定交付责任与正式销售条款' },
  { code: 'CI', name: '商业发票', fullName: '商业发票（CI）', description: '用于收款、出口和清关核对' },
  { code: 'PL', name: '装箱单', fullName: '装箱单（PL）', description: '汇总箱数、重量、体积与唛头' },
  { code: 'CD', name: '报关信息', fullName: '报关信息／报关单（CD）', description: '集中维护申报与运输资料' },
]

const emptyParty = (): Party => ({
  companyName: '',
  address: '',
  contact: '',
  phone: '',
  email: '',
  taxId: '',
  country: '',
})

export function createLineItem(): LineItem {
  return {
    id: createId(),
    name: '',
    specification: '',
    quantity: 0,
    unit: '件',
    unitPrice: 0,
    cartons: 0,
    netWeight: 0,
    grossWeight: 0,
    volume: 0,
    hsCode: '',
    declarationElements: '',
  }
}

export function createEmptyDraft(type: DocumentType): DocumentDraft {
  const now = new Date()
  const datePart = now.toISOString().slice(0, 10).replaceAll('-', '')

  return {
    version: 1,
    type,
    documentNumber: `${type}-${datePart}-001`,
    issueDate: now.toISOString().slice(0, 10),
    seller: emptyParty(),
    buyer: emptyParty(),
    items: [createLineItem()],
    trade: {
      country: '',
      incoterm: 'FOB 深圳',
      paymentTerm: '见提单副本付清',
      currency: '美元',
      deliveryTime: '收到定金后 25 天',
      portOfLoading: '深圳',
      portOfDestination: '',
      validity: '报价有效期 15 天',
    },
    settlement: {
      bankName: '',
      accountName: '',
      accountNumber: '',
      bankAddress: '',
      swift: '',
      transportMode: '海运',
      customsPort: '深圳海关',
      marks: '无唛头',
    },
    notes: '请在确认订单前核对全部资料。',
    language: 'zh',
    layout: 'modern',
    updatedAt: now.toISOString(),
    reviewFields: [],
    logo: '',
  }
}

export function calculateLineAmount(item: Pick<LineItem, 'quantity' | 'unitPrice'>): number {
  return round(item.quantity * item.unitPrice)
}

export function calculateTotals(items: LineItem[]): DocumentTotals {
  const totals = items.reduce<DocumentTotals>(
    (result, item) => ({
      amount: result.amount + calculateLineAmount(item),
      quantity: result.quantity + numberOrZero(item.quantity),
      cartons: result.cartons + numberOrZero(item.cartons),
      netWeight: result.netWeight + numberOrZero(item.netWeight) * numberOrZero(item.quantity),
      grossWeight: result.grossWeight + numberOrZero(item.grossWeight) * numberOrZero(item.quantity),
      volume: result.volume + numberOrZero(item.volume) * numberOrZero(item.quantity),
    }),
    { amount: 0, quantity: 0, cartons: 0, netWeight: 0, grossWeight: 0, volume: 0 },
  )

  return {
    amount: round(totals.amount),
    quantity: round(totals.quantity),
    cartons: round(totals.cartons),
    netWeight: round(totals.netWeight),
    grossWeight: round(totals.grossWeight),
    volume: round(totals.volume),
  }
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function numberOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
