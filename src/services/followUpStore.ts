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

// —— 优先级（重要程度）：红 / 橙 / 绿 ——
export type FollowUpPriority = 'high' | 'medium' | 'low'
export const PRIORITY_ORDER: FollowUpPriority[] = ['high', 'medium', 'low']
export const PRIORITY_LABELS: Record<FollowUpPriority, string> = { high: '高', medium: '中', low: '低' }
export const PRIORITY_DOT: Record<FollowUpPriority, string> = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-emerald-500' }
export const PRIORITY_STYLES: Record<FollowUpPriority, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-emerald-100 text-emerald-700',
}

// —— 紧急度（按「下次跟进日期」自动推算）——
export type Urgency = 'overdue' | 'today' | 'soon' | 'normal' | 'none'
export const URGENCY_LABELS: Record<Urgency, string> = {
  overdue: '已逾期',
  today: '今天跟进',
  soon: '即将到期',
  normal: '跟进中',
  none: '未排期',
}
export const URGENCY_STYLES: Record<Urgency, string> = {
  overdue: 'bg-red-100 text-red-700',
  today: 'bg-orange-100 text-orange-700',
  soon: 'bg-amber-100 text-amber-700',
  normal: 'bg-slate-100 text-slate-500',
  none: 'bg-slate-100 text-slate-400',
}
export function getUrgency(record: FollowUpRecord, now: Date = new Date()): Urgency {
  if (!record.nextFollowUpAt) return 'none'
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const due = new Date(`${record.nextFollowUpAt}T23:59:59`); due.setHours(0, 0, 0, 0)
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  if (diff <= 2) return 'soon'
  return 'normal'
}

// —— 跟进时间线 ——
export type ActivityKind = 'note' | 'contact' | 'stage' | 'system'
export interface FollowUpActivity {
  id: string
  at: string
  kind: ActivityKind
  text: string
  suggestion?: string
}

// —— 业务员跟进剧本（按阶段给出建议动作 / 间隔 / 话术）——
export interface StagePlaybook {
  goal: string
  nextAction: string
  intervalDays: number
  script: string
}
export const STAGE_PLAYBOOK: Record<FollowUpStage, StagePlaybook> = {
  inquiry: {
    goal: '确认需求、拿到反馈，推进到报价',
    nextAction: '主动询问是否收到报价、有无疑问或补充需求',
    intervalDays: 3,
    script: 'Hi {name}，想跟您确认下之前的报价是否已收到？如有任何疑问、需要调整规格或数量，随时告诉我，我帮您重新核算。',
  },
  quoted: {
    goal: '消除顾虑、促成确认下单',
    nextAction: '3-5 天后询问是否需打样 / 放宽 MOQ / 特殊交期',
    intervalDays: 4,
    script: 'Hi {name}，关于报价单还想跟您确认：是否需要先打样看看品质？MOQ 或交期上有特别要求的话，我这边可以帮您争取。',
  },
  ordered: {
    goal: '保证交付，并挖增量（追加订单 / 新项目）',
    nextAction: '同步生产进度，主动问是否需追加订单、有无新项目',
    intervalDays: 7,
    script: 'Hi {name}，订单已在生产中，预计 {date} 出货。顺便想了解下，这次还有没有其他产品线或新项目也在计划里？一起安排能省运费、也更快交期。',
  },
  shipped: {
    goal: '稳住体验、索取反馈与转介绍',
    nextAction: '发货后提供提单 / 跟踪号，收货后问体验',
    intervalDays: 5,
    script: 'Hi {name}，货已发出，提单 / 跟踪号：{tracking}。预计 {eta} 到达，到时方便的话告诉我收货体验，也欢迎给我们反馈或转介绍同事~',
  },
  paid: {
    goal: '催收回款、维护复购',
    nextAction: '提醒账期 / 催尾款，并问下一批复购计划',
    intervalDays: 14,
    script: 'Hi {name}，这笔尾款按约定应在 {date} 前结清，方便时麻烦安排一下。另外下一批补货大概什么时候启动？我提前帮您排产。',
  },
}
export function getSuggestion(record: FollowUpRecord): { nextAction: string; intervalDays: number; script: string } {
  const pb = STAGE_PLAYBOOK[record.stage]
  const name = record.buyer.companyName || '客户'
  return { nextAction: pb.nextAction, intervalDays: pb.intervalDays, script: pb.script.replace(/\{name\}/g, name) }
}
export function suggestNextDate(intervalDays: number, from: Date = new Date()): string {
  const d = new Date(from); d.setDate(d.getDate() + intervalDays)
  return d.toISOString().slice(0, 10)
}

export interface FollowUpRecord {
  id: string
  buyer: Partial<Party>
  productSummary: string
  amount: number
  currency: string
  incoterm: string
  stage: FollowUpStage
  priority: FollowUpPriority
  nextFollowUpAt: string
  activities: FollowUpActivity[]
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

type UpsertInput = Omit<FollowUpRecord, 'id' | 'createdAt' | 'updatedAt' | 'activities' | 'priority' | 'nextFollowUpAt'> & {
  id?: string
  createdAt?: string
  updatedAt?: string
  activities?: FollowUpActivity[]
  priority?: FollowUpPriority
  nextFollowUpAt?: string
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
    priority: input.priority || 'medium',
    nextFollowUpAt: input.nextFollowUpAt || '',
    activities: input.activities || [],
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
  dueToday: number
  overdue: number
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
    dueToday: records.filter((record) => {
      const u = getUrgency(record)
      return u === 'overdue' || u === 'today'
    }).length,
    overdue: records.filter((record) => getUrgency(record) === 'overdue').length,
  }
}

/** 从单据草稿一键建档/更新（出向联动）。 */
export function upsertFromDraft(draft: DocumentDraft): FollowUpRecord {
  const now = new Date().toISOString()
  const docNo = draft.documentNumber || '未编号'
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
    priority: 'medium',
    nextFollowUpAt: suggestNextDate(3),
    activities: [
      {
        id: `act_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        at: now,
        kind: 'system',
        text: `由${draft.type}单据建档（${docNo}）`,
      },
    ],
    sourceDocType: draft.type,
    sourceDocNumber: docNo,
    notes: `来自${draft.type}单据（${docNo}）`,
  })
}

/** 追加一条跟进记录（时间线），可顺带更新「下次跟进日期」。 */
export function logFollowUpActivity(
  id: string,
  activity: { kind: ActivityKind; text: string; suggestion?: string },
  nextFollowUpAt?: string,
  storage = browserStorage(),
): FollowUpRecord | undefined {
  const all = loadFollowUps(storage)
  const index = all.findIndex((record) => record.id === id)
  if (index < 0) return undefined
  const now = new Date().toISOString()
  const entry: FollowUpActivity = {
    id: `act_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    at: now,
    ...activity,
  }
  const updated: FollowUpRecord = {
    ...all[index],
    activities: [...(all[index].activities || []), entry],
    nextFollowUpAt: nextFollowUpAt ?? all[index].nextFollowUpAt,
    updatedAt: now,
  }
  all[index] = updated
  saveFollowUps(all, storage)
  return updated
}
