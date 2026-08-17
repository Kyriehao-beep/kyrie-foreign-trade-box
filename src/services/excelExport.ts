import type { Workbook } from 'exceljs'
import type { DocumentDraft } from '../domain/documents'
import { buildExcelWorkbook } from '../features/documents/excel/buildExcelWorkbook'
import { safeExportFilenameBase } from './exportFilename'

export interface ExcelExportAdapters {
  createWorkbook(): Workbook
  buildWorkbook(draft: DocumentDraft, workbook: Workbook): Workbook
  download(blob: Blob, filename: string): void
}

export async function exportExcelDocument(
  draft: DocumentDraft,
  adapters?: ExcelExportAdapters,
): Promise<void> {
  const runtime = adapters ?? await createBrowserExcelAdapters()
  const workbook = runtime.buildWorkbook(draft, runtime.createWorkbook())
  const bytes = await workbook.xlsx.writeBuffer()
  const blob = new Blob([bytes as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  runtime.download(blob, `${safeExportFilenameBase(draft.documentNumber)}.xlsx`)
}

async function createBrowserExcelAdapters(): Promise<ExcelExportAdapters> {
  const { Workbook } = await import('exceljs')
  return {
    createWorkbook: () => new Workbook(),
    buildWorkbook: buildExcelWorkbook,
    download(blob, filename) {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      try {
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
      } finally {
        link.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
      }
    },
  }
}
