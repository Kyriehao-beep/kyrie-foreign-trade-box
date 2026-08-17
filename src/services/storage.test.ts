import { createEmptyDraft } from '../domain/documents'
import { clearDraft, loadDraft, saveDraft, storageKeys } from './storage'

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
}

it('isolates drafts by document type', () => {
  const storage = createMemoryStorage()
  const quotation = { ...createEmptyDraft('QT'), notes: '报价草稿' }
  const packingList = { ...createEmptyDraft('PL'), notes: '装箱草稿' }

  saveDraft(quotation, storage)
  saveDraft(packingList, storage)

  expect(loadDraft('QT', storage).value?.notes).toBe('报价草稿')
  expect(loadDraft('PL', storage).value?.notes).toBe('装箱草稿')
  expect(storageKeys.draft('QT')).not.toBe(storageKeys.draft('PL'))
})

it('clears only the selected draft', () => {
  const storage = createMemoryStorage()
  saveDraft(createEmptyDraft('QT'), storage)
  saveDraft(createEmptyDraft('PI'), storage)

  clearDraft('QT', storage)

  expect(loadDraft('QT', storage).value).toBeNull()
  expect(loadDraft('PI', storage).value?.type).toBe('PI')
})

it('returns a recoverable result when browser storage is unavailable', () => {
  const storage = createMemoryStorage()
  storage.setItem = () => {
    throw new Error('blocked')
  }

  expect(saveDraft(createEmptyDraft('CI'), storage)).toEqual({ ok: false, error: '当前浏览器无法保存草稿' })
})
