import type { DocumentLanguage } from '../domain/documents'
import { safeExportFilenameBase } from './exportFilename'

export interface PdfWriter {
  addPage(): void
  addImage(data: string, format: 'PNG', x: number, y: number, width: number, height: number): void
  save(filename: string): void
}

export interface PdfExportAdapters {
  waitForFonts(): Promise<void>
  capture(element: HTMLElement): Promise<HTMLCanvasElement>
  paginate(canvas: HTMLCanvasElement, element: HTMLElement): HTMLCanvasElement[]
  addPageNumber(canvas: HTMLCanvasElement, pageNumber: number, totalPages: number, language: DocumentLanguage): void
  createDocument(): PdfWriter
}

export interface PdfImagePlacement {
  x: number
  y: number
  width: number
  height: number
}

export interface CanvasSlicePlan {
  sourceY: number
  sourceHeight: number
  pageHeight: number
  pageTopPadding: number
}

interface ContinuationHeader {
  title: string
  documentNumber: string
  issueDate: string
  language: DocumentLanguage
}

const MAX_SINGLE_PAGE_OVERFLOW_RATIO = 1.03

export function getCanvasSlicePlan(
  canvas: Pick<HTMLCanvasElement, 'width' | 'height'>,
  safeBreakpoints: number[] = [],
  continuationHeaderHeight = 0,
): CanvasSlicePlan[] {
  const sourceWidth = Number.isFinite(canvas.width) && canvas.width > 0 ? canvas.width : 210
  const rawSourceHeight = Number.isFinite(canvas.height) && canvas.height > 0 ? canvas.height : 297
  const pageHeight = Math.round(sourceWidth * (297 / 210))
  const rawBreakpoints = [...new Set(safeBreakpoints)]
    .filter((point) => Number.isFinite(point) && point > 0 && point < rawSourceHeight)
    .sort((a, b) => a - b)
  const lastBreakpoint = rawBreakpoints.at(-1)
  const hasSmallBlankTail = lastBreakpoint !== undefined
    && rawSourceHeight > pageHeight * MAX_SINGLE_PAGE_OVERFLOW_RATIO
    && rawSourceHeight - lastBreakpoint <= pageHeight * 0.08
  const sourceHeight = hasSmallBlankTail ? lastBreakpoint : rawSourceHeight
  if (sourceHeight <= pageHeight * MAX_SINGLE_PAGE_OVERFLOW_RATIO) {
    return [{ sourceY: 0, sourceHeight, pageHeight: sourceHeight, pageTopPadding: 0 }]
  }
  const breakpoints = rawBreakpoints.filter((point) => point < sourceHeight)
  const slices: CanvasSlicePlan[] = []
  let sourceY = 0
  while (true) {
    const pageTopPadding = slices.length === 0 ? 0 : continuationHeaderHeight
    const contentCapacity = pageHeight - pageTopPadding
    if (sourceHeight - sourceY <= contentCapacity * MAX_SINGLE_PAGE_OVERFLOW_RATIO) break
    const target = sourceY + contentCapacity
    const minimum = sourceY + contentCapacity * 0.35
    const maximum = Math.min(sourceHeight, sourceY + contentCapacity * MAX_SINGLE_PAGE_OVERFLOW_RATIO)
    const candidates = breakpoints.filter((point) => point >= minimum && point <= maximum)
    const beforeTarget = candidates.filter((point) => point <= target)
    const cut = beforeTarget.at(-1) ?? candidates[0]
    if (cut === undefined) throw new Error('存在无法安全分页的超长内容块，请缩短该字段后重试')
    slices.push({ sourceY, sourceHeight: cut - sourceY, pageHeight, pageTopPadding })
    sourceY = cut
  }
  slices.push({
    sourceY,
    sourceHeight: sourceHeight - sourceY,
    pageHeight,
    pageTopPadding: slices.length === 0 ? 0 : continuationHeaderHeight,
  })
  return slices
}

export function fitCanvasOnA4(canvas: Pick<HTMLCanvasElement, 'width' | 'height'>): PdfImagePlacement {
  const sourceWidth = Number.isFinite(canvas.width) && canvas.width > 0 ? canvas.width : 210
  const sourceHeight = Number.isFinite(canvas.height) && canvas.height > 0 ? canvas.height : 297
  const scale = Math.min(210 / sourceWidth, 297 / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  return { x: (210 - width) / 2, y: 0, width, height }
}

export async function exportPdfDocument(
  root: HTMLElement,
  filename: string,
  adapters?: PdfExportAdapters,
): Promise<void> {
  const pages = [...root.querySelectorAll<HTMLElement>('[data-pdf-page]')]
  if (pages.length === 0) throw new Error('未找到可导出的单据页面')

  const runtime = adapters ?? await createBrowserPdfAdapters()
  await runtime.waitForFonts()
  const pdf = runtime.createDocument()

  const physicalPages: Array<{ canvas: HTMLCanvasElement; language: DocumentLanguage }> = []
  for (const page of pages) {
    const canvas = await runtime.capture(page)
    const language = readPdfLanguage(page)
    physicalPages.push(...runtime.paginate(canvas, page).map((physicalPage) => ({ canvas: physicalPage, language })))
  }

  physicalPages.forEach(({ canvas, language }, index) => {
    if (index > 0) pdf.addPage()
    runtime.addPageNumber(canvas, index + 1, physicalPages.length, language)
    const placement = fitCanvasOnA4(canvas)
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', placement.x, placement.y, placement.width, placement.height)
  })

  if (physicalPages.length === 0) {
    throw new Error('未生成可导出的单据页面')
  }

  pdf.save(`${safeExportFilenameBase(filename)}.pdf`)
}

async function createBrowserPdfAdapters(): Promise<PdfExportAdapters> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  return {
    async waitForFonts() {
      if ('fonts' in document) {
        await document.fonts.ready
        // Extra wait: fonts.ready may fire before glyphs are rasterized.
        // A short delay + forced reflow ensures text is painted with correct metrics.
        await new Promise((r) => setTimeout(r, 80))
      }
    },
    async capture(element) {
      const hasOverflow = element.scrollHeight > element.clientHeight + 1
      element.classList.add('pdf-page--capture')
      if (hasOverflow) element.classList.add('pdf-page--capture-overflow')

      // Fix: temporarily bring off-screen element into viewport so html2canvas
      // can correctly read computed styles (borders, colors, backgrounds, fonts).
      // Without this, left:-100000px causes html2canvas to produce unstyled output.
      const prevStyle = element.style.cssText
      let restored = false
      try {
        Object.assign(element.style, {
          position: 'absolute',
          left: '0',
          top: '0',
          visibility: 'hidden',
          pointerEvents: 'none',
          zIndex: '-9999',
        })
        // Force layout recalculation so browser resolves all computed styles
        void element.offsetHeight

        if (hasOverflow) await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

        return await html2canvas(element, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          height: hasOverflow ? element.scrollHeight : undefined,
          windowHeight: hasOverflow ? element.scrollHeight : undefined,
        })
      } finally {
        // Always restore original position
        element.style.cssText = prevStyle
        restored = true
        element.classList.remove('pdf-page--capture')
        if (hasOverflow) element.classList.remove('pdf-page--capture-overflow')
      }
    },
    paginate(canvas, element) {
      return createCanvasPageSlices(
        canvas,
        collectSafeCanvasBreakpoints(element, canvas),
        collectContinuationHeader(element),
      )
    },
    addPageNumber: drawCanvasPageNumber,
    createDocument() {
      return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
    },
  }
}

function createCanvasPageSlices(
  canvas: HTMLCanvasElement,
  safeBreakpoints: number[],
  continuationHeader: ContinuationHeader,
): HTMLCanvasElement[] {
  const a4PageHeight = Math.round(canvas.width * (297 / 210))
  const continuationHeaderHeight = Math.round(a4PageHeight * (18 / 297))
  const plan = getCanvasSlicePlan(canvas, safeBreakpoints, continuationHeaderHeight)
  if (plan.length === 1) return [canvas]
  return plan.map((slice) => {
    const page = document.createElement('canvas')
    page.width = canvas.width
    page.height = Math.max(slice.pageHeight, slice.pageTopPadding + slice.sourceHeight)
    const context = page.getContext('2d')
    if (!context) throw new Error('无法创建 PDF 分页画布')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, page.width, page.height)
    context.drawImage(
      canvas,
      0,
      slice.sourceY,
      canvas.width,
      slice.sourceHeight,
      0,
      slice.pageTopPadding,
      canvas.width,
      slice.sourceHeight,
    )
    if (slice.pageTopPadding > 0) {
      drawContinuationHeader(context, page, continuationHeader, slice.pageTopPadding)
    }
    return page
  })
}

function collectContinuationHeader(element: HTMLElement): ContinuationHeader {
  return {
    title: element.dataset.pdfTitle || '--',
    documentNumber: element.dataset.pdfNumber || '--',
    issueDate: element.dataset.pdfDate || '--',
    language: readPdfLanguage(element),
  }
}

function readPdfLanguage(element: HTMLElement): DocumentLanguage {
  const language = element.dataset.pdfLanguage
  return language === 'en' || language === 'bilingual' ? language : 'zh'
}

function collectSafeCanvasBreakpoints(element: HTMLElement, canvas: HTMLCanvasElement): number[] {
  const rootTop = element.getBoundingClientRect().top
  const scale = canvas.width / Math.max(1, element.scrollWidth)
  const nodes = element.querySelectorAll<HTMLElement>([
    '.pdf-page__brand',
    '.pdf-page__heading',
    '.pdf-page__parties',
    '.pdf-page__party-card > *',
    '.pdf-page__table',
    '.pdf-page__table thead',
    '.pdf-page__table-row',
    '.pdf-page__summary',
    '.pdf-page__terms > h2',
    '.pdf-page__terms dl > div',
    '.pdf-page__signatures > *',
  ].join(','))
  const points: number[] = []
  nodes.forEach((node) => {
    const bounds = node.getBoundingClientRect()
    const isSummary = node.classList.contains('pdf-page__summary')
    const isLastProductRow = node.classList.contains('pdf-page__table-row')
      && node.parentElement?.lastElementChild === node
      && element.querySelector('.pdf-page__summary') !== null
    if (!isSummary) points.push(Math.round((bounds.top - rootTop) * scale))
    if (!isLastProductRow) points.push(Math.round((bounds.bottom - rootTop) * scale))
  })
  return points
}

export function formatPdfPageNumber(
  pageNumber: number,
  totalPages: number,
  language: DocumentLanguage,
): string {
  if (language === 'en') return `Page ${pageNumber} of ${totalPages}`
  if (language === 'bilingual') return `第 ${pageNumber} 页 / 共 ${totalPages} 页 · Page ${pageNumber} of ${totalPages}`
  return `第 ${pageNumber} 页 / 共 ${totalPages} 页`
}

function drawCanvasPageNumber(
  canvas: HTMLCanvasElement,
  pageNumber: number,
  totalPages: number,
  language: DocumentLanguage,
): void {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('无法绘制 PDF 页码')
  const fontSize = Math.max(14, Math.round(canvas.width * 0.011))
  context.save()
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.globalAlpha = 1
  context.globalCompositeOperation = 'source-over'
  context.fillStyle = '#63736d'
  context.font = `${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
  context.textAlign = 'right'
  context.textBaseline = 'bottom'
  context.fillText(
    formatPdfPageNumber(pageNumber, totalPages, language),
    canvas.width * (1 - 12 / 210),
    canvas.height * (1 - 7 / 297),
  )
  context.restore()
}

function drawContinuationHeader(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  header: ContinuationHeader,
  headerHeight: number,
): void {
  const left = canvas.width * (12 / 210)
  const right = canvas.width * (1 - 12 / 210)
  const titleSize = Math.max(18, Math.round(canvas.width * 0.015))
  const metaSize = Math.max(12, Math.round(canvas.width * 0.009))
  const continuation = header.language === 'en'
    ? 'CONTINUED'
    : header.language === 'bilingual' ? '续页 / CONTINUED' : '续页'
  const metadata = header.language === 'en'
    ? `NO. ${header.documentNumber} · DATE ${header.issueDate}`
    : header.language === 'bilingual'
      ? `单据编号 / NO. ${header.documentNumber} · 日期 / DATE ${header.issueDate}`
      : `单据编号 ${header.documentNumber} · 日期 ${header.issueDate}`

  context.save()
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.globalAlpha = 1
  context.globalCompositeOperation = 'source-over'
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, headerHeight)
  context.fillStyle = '#124e41'
  context.font = `700 ${titleSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.fillText(header.title, left, headerHeight * 0.38)
  context.fillStyle = '#63736d'
  context.font = `${metaSize}px "Microsoft YaHei", "PingFang SC", sans-serif`
  context.fillText(continuation, left, headerHeight * 0.72)
  context.textAlign = 'right'
  context.fillText(metadata, right, headerHeight * 0.55)
  context.strokeStyle = '#176b57'
  context.lineWidth = Math.max(2, canvas.width * 0.0015)
  context.beginPath()
  context.moveTo(left, headerHeight - context.lineWidth)
  context.lineTo(right, headerHeight - context.lineWidth)
  context.stroke()
  context.restore()
}
