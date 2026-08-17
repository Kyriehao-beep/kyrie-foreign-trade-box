import type { DocumentDraft, DocumentType, PartyTemplate } from '../domain/documents'

const PREFIX = 'kyrie-trade-box:v1'

export const storageKeys = {
  draft: (type: DocumentType) => `${PREFIX}:draft:${type}`,
  partyTemplates: `${PREFIX}:party-templates`,
} as const

export type StorageResult<T> = { ok: true; value: T } | { ok: false; value: T; error: string }
export type StorageWriteResult = { ok: true } | { ok: false; error: string }

function browserStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

export function saveDraft(draft: DocumentDraft, storage = browserStorage()): StorageWriteResult {
  if (!storage) return { ok: false, error: '当前浏览器无法保存草稿' }
  try {
    storage.setItem(storageKeys.draft(draft.type), JSON.stringify(draft))
    return { ok: true }
  } catch {
    return { ok: false, error: '当前浏览器无法保存草稿' }
  }
}

export function loadDraft(type: DocumentType, storage = browserStorage()): StorageResult<DocumentDraft | null> {
  if (!storage) return { ok: false, value: null, error: '当前浏览器无法读取草稿' }
  try {
    const value = storage.getItem(storageKeys.draft(type))
    return { ok: true, value: value ? (JSON.parse(value) as DocumentDraft) : null }
  } catch {
    return { ok: false, value: null, error: '草稿内容无法读取' }
  }
}

export function clearDraft(type: DocumentType, storage = browserStorage()): StorageWriteResult {
  if (!storage) return { ok: false, error: '当前浏览器无法清除草稿' }
  try {
    storage.removeItem(storageKeys.draft(type))
    return { ok: true }
  } catch {
    return { ok: false, error: '当前浏览器无法清除草稿' }
  }
}

export function loadPartyTemplates(storage = browserStorage()): StorageResult<PartyTemplate[]> {
  if (!storage) return { ok: false, value: [], error: '当前浏览器无法读取资料模板' }
  try {
    const value = storage.getItem(storageKeys.partyTemplates)
    return { ok: true, value: value ? (JSON.parse(value) as PartyTemplate[]) : [] }
  } catch {
    return { ok: false, value: [], error: '资料模板无法读取' }
  }
}

export function savePartyTemplate(template: PartyTemplate, storage = browserStorage()): StorageWriteResult {
  if (!storage) return { ok: false, error: '当前浏览器无法保存资料模板' }
  const current = loadPartyTemplates(storage).value.filter((item) => item.id !== template.id)
  try {
    storage.setItem(storageKeys.partyTemplates, JSON.stringify([...current, template]))
    return { ok: true }
  } catch {
    return { ok: false, error: '当前浏览器无法保存资料模板' }
  }
}
