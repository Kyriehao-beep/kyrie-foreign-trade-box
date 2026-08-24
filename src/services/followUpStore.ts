// 跟单助手（业务员的轻量客户/交易看板）本地数据层。
// 纯浏览器 localStorage，零后端、零运维，贴合「体量小、不懂技术」的约束。
// 跟单记录与单据制作共用同一份买方信息，实现「做单即建档、建档即能回做单」。

import type { DocumentDraft, DocumentType, LineItem, Party } from '../domain/documents'

export type FollowUpStage = 'inquiry' | 'quoted' | 'ordered' | 'shipped' | 'paid'

export const STAGE_LABELS: Record<FollowUpStage, string> = {
  inquiry: '洽谈',
  quoted: '已报价',
  ordered: '已下单',
  shipped: '出货',
  paid: '收款',
}

export const STAGE_ORDER: FollowUpStage[] = ['inquiry', 'quoted', 'ordered', 'shipped', 'paid']

export const STAGE_STYLES: Record<FollowUpStage, string> = {
  inquiry: 'bg-slate-100 text-slate-600',
  quoted: 'bg-amber-100 text-amber-700',
  ordered: 'bg-sky-100 text-sky-700',
  shipped: 'bg-violet-100 text-violet-700',
  paid: 'bg-emerald-100 text-emerald-700',
}

export interface FollowUpRecord {
  id: string
  buyer: Partial<Party>
  productSummary: string
  amount: number
  currency: string
  incoterm: string
  stage: FollowUpStage
  sourceDocType?: DocumentType
  sourceDocNumber?: string
  notes: string
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'ktb_followup:v1'

function browserStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

/** 把产品行压缩成一行可读摘要，例如「硅胶徽章 ×500个，热熔胶 ×200套 等3项」。 */
export function summarizeItems(items: LineItem[]): string {
  const named = items.filter((item) => item.name.trim())
  if (!named.length) return ''
  const head = named
    .slice(0, 3)
    .map((item) => `${item.name.trim()}${item.quantity ? ` ×${item.quantity}${item.unit || ''}` : ''}`)
    .join('，')
  return named.length > 3 ? `${head} 等${named.length}项` : head
}

/** 按「数量 × 单价」汇总金额（与单据预览口径一致）。 */
export function calcAmount(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)
}

export function loadFollowUps(storage = browserStorage()): FollowUpRecord[] {
  if (!storage) return []
  try {
    const raw = storage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as FollowUpRecord[]) : []
  } catch {
    return []
  }
}

export function saveFollowUps(records: FollowUpRecord[], storage = browserStorage()): boolean {
  if (!storage) return false
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(records))
    return true
  } catch {
    return false
  }
}

export function getFollowUp(id: string, storage = browserStorage()): FollowUpRecord | undefined {
  return loadFollowUps(storage).find((record) => record.id === id)
}

function genId(): string {
  return `fu_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

type UpsertInput = Omit<FollowUpRecord, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * 新建或更新一条跟单。
 * - 指定 id → 更新该条；
 * - 未指定 id 但买方公司名已存在 → 合并到已有记录（避免重复建档）；
 * - 否则新建并置顶。
 */
export function upsertFollowUp(input: UpsertInput, storage = browserStorage()): FollowUpRecord {
  const all = loadFollowUps(storage)
  const now = new Date().toISOString()

  if (input.id) {
    const index = all.findIndex((record) => record.id === input.id)
    if (index >= 0) {
      const merged: FollowUpRecord = {
        ...all[index],
        ...input,
        id: input.id,
        createdAt: all[index].createdAt,
        updatedAt: now,
        buyer: { ...all[index].buyer, ...input.buyer },
      }
      all[index] = merged
      saveFollowUps(all, storage)
      return merged
    }
  }

  const name = (input.buyer.companyName || '').trim().toLowerCase()
  if (name) {
    const existing = all.find((record) => (record.buyer.companyName || '').trim().toLowerCase() === name)
    if (existing) {
      const merged: FollowUpRecord = {
        ...existing,
        ...input,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: now,
        buyer: { ...existing.buyer, ...input.buyer },
      }
      const index = all.findIndex((record) => record.id === existing.id)
      all[index] = merged
      saveFollowUps(all, storage)
      return merged
    }
  }

  const created: FollowUpRecord = {
    id: genId(),
    buyer: input.buyer,
    productSummary: input.productSummary || '',
    amount: input.amount || 0,
    currency: input.currency || '美元',
    incoterm: input.incoterm || '',
    stage: input.stage || 'inquiry',
    sourceDocType: input.sourceDocType,
    sourceDocNumber: input.sourceDocNumber,
    notes: input.notes || '',
    createdAt: now,
    updatedAt: now,
  }
  all.unshift(created)
  saveFollowUps(all, storage)
  return created
}

export function deleteFollowUp(id: string, storage = browserStorage()): boolean {
  const all = loadFollowUps(storage).filter((record) => record.id !== id)
  return saveFollowUps(all, storage)
}

export interface FollowUpStats {
  total: number
  thisMonthNew: number
  inProgress: number
  closed: number
  closedAmount: number
}

const CLOSED: FollowUpStage[] = ['ordered', 'shipped', 'paid']
const IN_PROGRESS: FollowUpStage[] = ['inquiry', 'quoted']

export function computeStats(records: FollowUpRecord[] = loadFollowUps()): FollowUpStats {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  return {
    total: records.length,
    thisMonthNew: records.filter((record) => new Date(record.createdAt).getTime() >= monthStart).length,
    inProgress: records.filter((record) => IN_PROGRESS.includes(record.stage)).length,
    closed: records.filter((record) => CLOSED.includes(record.stage)).length,
    closedAmount: records
      .filter((record) => CLOSED.includes(record.stage))
      .reduce((sum, record) => sum + (Number(record.amount) || 0), 0),
  }
}

/** 从单据草稿一键建档/更新（出向联动）。 */
export function upsertFromDraft(draft: DocumentDraft): FollowUpRecord {
  return upsertFollowUp({
    buyer: {
      companyName: draft.buyer.companyName,
      country: draft.buyer.country,
      contact: draft.buyer.contact,
      phone: draft.buyer.phone,
      email: draft.buyer.email,
    },
    productSummary: summarizeItems(draft.items),
    amount: calcAmount(draft.items),
    currency: draft.trade.currency || '美元',
    incoterm: draft.trade.incoterm,
    stage: 'quoted',
    sourceDocType: draft.type,
    sourceDocNumber: draft.documentNumber,
    notes: `来自${draft.type}单据（${draft.documentNumber || '未编号'}）`,
  })
}
