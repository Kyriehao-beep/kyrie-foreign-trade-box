import { expect, it, vi } from 'vitest'
import {
  exportPdfDocument,
  fitCanvasOnA4,
  formatPdfPageNumber,
  getCanvasSlicePlan,
  type PdfExportAdapters,
} from './pdfExport'

it('splits materially over-height captures only at semantic safe boundaries', () => {
  expect(getCanvasSlicePlan({ width: 210, height: 420 }, [260], 30)).toEqual([
    { sourceY: 0, sourceHeight: 260, pageHeight: 297, pageTopPadding: 0 },
    { sourceY: 260, sourceHeight: 160, pageHeight: 297, pageTopPadding: 30 },
  ])
})

it('refuses to cut through one indivisible oversized content block', () => {
  expect(() => getCanvasSlicePlan({ width: 210, height: 420 }, []))
    .toThrow('存在无法安全分页的超长内容块')
})

it('keeps a safe breakpoint up to three percent past A4 without cropping it', () => {
  expect(getCanvasSlicePlan({ width: 210, height: 420 }, [300], 30)[0]).toEqual({
    sourceY: 0,
    sourceHeight: 300,
    pageHeight: 297,
    pageTopPadding: 0,
  })
  expect(fitCanvasOnA4({ width: 210, height: 300 })).toMatchObject({ height: 297 })
})

it('trims a small blank capture tail after the final semantic block', () => {
  expect(getCanvasSlicePlan({ width: 210, height: 360 }, [260, 345], 30)).toEqual([
    { sourceY: 0, sourceHeight: 260, pageHeight: 297, pageTopPadding: 0 },
    { sourceY: 260, sourceHeight: 85, pageHeight: 297, pageTopPadding: 30 },
  ])
})

it.each([
  ['zh', '第 2 页 / 共 3 页'],
  ['en', 'Page 2 of 3'],
  ['bilingual', '第 2 页 / 共 3 页 · Page 2 of 3'],
] as const)('formats %s physical page numbers', (language, expected) => {
  expect(formatPdfPageNumber(2, 3, language)).toBe(expected)
})

it('captures every page in order and saves the document number', async () => {
  const root = document.createElement('div')
  root.innerHTML = '<article data-pdf-page data-pdf-language="en"></article><article data-pdf-page data-pdf-language="en"></article>'
  const addPage = vi.fn()
  const addImage = vi.fn()
  const save = vi.fn()
  const adapters: PdfExportAdapters = {
    waitForFonts: vi.fn().mockResolvedValue(undefined),
    capture: vi.fn().mockResolvedValue({ toDataURL: () => 'data:image/png;base64,page' } as HTMLCanvasElement),
    paginate: vi.fn((canvas) => [canvas]),
    addPageNumber: vi.fn(),
    createDocument: () => ({ addPage, addImage, save }),
  }

  await exportPdfDocument(root, 'PI-202608-6369', adapters)

  expect(adapters.capture).toHaveBeenCalledTimes(2)
  expect(adapters.paginate).toHaveBeenCalledTimes(2)
  expect(adapters.addPageNumber).toHaveBeenNthCalledWith(1, expect.anything(), 1, 2, 'en')
  expect(adapters.addPageNumber).toHaveBeenNthCalledWith(2, expect.anything(), 2, 2, 'en')
  expect(addPage).toHaveBeenCalledTimes(1)
  expect(addImage).toHaveBeenCalledTimes(2)
  expect(save).toHaveBeenCalledWith('PI-202608-6369.pdf')
})

it('rejects an empty export surface', async () => {
  await expect(exportPdfDocument(document.createElement('div'), 'PI-001'))
    .rejects.toThrow('未找到可导出的单据页面')
})

it('uses a Chinese fallback filename', async () => {
  const root = document.createElement('div')
  root.innerHTML = '<article data-pdf-page></article>'
  const save = vi.fn()
  await exportPdfDocument(root, ' ', {
    waitForFonts: vi.fn().mockResolvedValue(undefined),
    capture: vi.fn().mockResolvedValue({ toDataURL: () => 'data:image/png;base64,page' } as HTMLCanvasElement),
    paginate: vi.fn((canvas) => [canvas]),
    addPageNumber: vi.fn(),
    createDocument: () => ({ addPage: vi.fn(), addImage: vi.fn(), save }),
  })
  expect(save).toHaveBeenCalledWith('外贸单据.pdf')
})

it('sanitizes unsafe characters in PDF filenames', async () => {
  const root = document.createElement('div')
  root.innerHTML = '<article data-pdf-page></article>'
  const save = vi.fn()
  await exportPdfDocument(root, ' QT/2026:*? ', {
    waitForFonts: vi.fn().mockResolvedValue(undefined),
    capture: vi.fn().mockResolvedValue({ width: 210, height: 297, toDataURL: () => 'data:image/png;base64,page' } as HTMLCanvasElement),
    paginate: vi.fn((canvas) => [canvas]),
    addPageNumber: vi.fn(),
    createDocument: () => ({ addPage: vi.fn(), addImage: vi.fn(), save }),
  })
  expect(save).toHaveBeenCalledWith('QT-2026.pdf')
})

it('adds physical PDF pages returned by the overflow paginator', async () => {
  const root = document.createElement('div')
  root.innerHTML = '<article data-pdf-page></article>'
  const addPage = vi.fn()
  const addImage = vi.fn()
  const segment = { width: 210, height: 297, toDataURL: () => 'data:image/png;base64,page' } as HTMLCanvasElement

  await exportPdfDocument(root, 'PI-001', {
    waitForFonts: vi.fn().mockResolvedValue(undefined),
    capture: vi.fn().mockResolvedValue(segment),
    paginate: vi.fn().mockReturnValue([segment, segment]),
    addPageNumber: vi.fn(),
    createDocument: () => ({ addPage, addImage, save: vi.fn() }),
  })

  expect(addPage).toHaveBeenCalledTimes(1)
  expect(addImage).toHaveBeenCalledTimes(2)
  expect(addImage).toHaveBeenNthCalledWith(1, expect.any(String), 'PNG', 0, 0, 210, 297)
})
