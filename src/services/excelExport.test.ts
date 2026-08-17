import type { Workbook } from 'exceljs'
import { expect, it, vi } from 'vitest'
import { createEmptyDraft, type DocumentDraft } from '../domain/documents'
import { exportExcelDocument, type ExcelExportAdapters } from './excelExport'

function createSuccessfulAdapters(download = vi.fn()): ExcelExportAdapters {
  return {
    createWorkbook: () => ({
      xlsx: { writeBuffer: vi.fn().mockResolvedValue(new Uint8Array([1])) },
    } as unknown as Workbook),
    buildWorkbook: vi.fn((_: DocumentDraft, workbook: Workbook) => workbook),
    download,
  }
}

it('downloads one workbook with the document number', async () => {
  const draft = createEmptyDraft('QT')
  draft.documentNumber = 'QT-202608-0295'
  const download = vi.fn()

  await exportExcelDocument(draft, createSuccessfulAdapters(download))

  expect(download).toHaveBeenCalledWith(expect.any(Blob), 'QT-202608-0295.xlsx')
})

it('uses a Chinese fallback filename', async () => {
  const draft = createEmptyDraft('QT')
  draft.documentNumber = '   '
  const download = vi.fn()

  await exportExcelDocument(draft, createSuccessfulAdapters(download))

  expect(download).toHaveBeenCalledWith(expect.any(Blob), '外贸单据.xlsx')
})

it('does not download when workbook serialization fails', async () => {
  const download = vi.fn()
  const adapters = createSuccessfulAdapters(download)
  adapters.createWorkbook = () => ({
    xlsx: { writeBuffer: vi.fn().mockRejectedValue(new Error('write failed')) },
  } as unknown as Workbook)

  await expect(exportExcelDocument(createEmptyDraft('PI'), adapters)).rejects.toThrow('write failed')
  expect(download).not.toHaveBeenCalled()
})

it('sanitizes unsafe characters in Excel filenames', async () => {
  const draft = createEmptyDraft('QT')
  draft.documentNumber = ' QT/2026:*? '
  const download = vi.fn()

  await exportExcelDocument(draft, createSuccessfulAdapters(download))

  expect(download).toHaveBeenCalledWith(expect.any(Blob), 'QT-2026.xlsx')
})
