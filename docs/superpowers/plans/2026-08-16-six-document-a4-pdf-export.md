# Six-Document A4 PDF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace browser printing with a stable, local-only A4 PDF export for all six foreign-trade document types.

**Architecture:** Build deterministic document definitions and page models from `DocumentDraft`, render isolated A4 React pages in an off-screen export surface, and capture each complete page with `html2canvas` before writing it to `jsPDF`. Keep Excel export independent, preserve the existing live preview, and expose explicit loading, success, and failure states in the document workspace.

**Tech Stack:** React 18, TypeScript, Vite 5, Tailwind CSS, Vitest, Testing Library, `html2canvas@1.4.1`, `jspdf@4.2.1`, Poppler for visual QA

## Global Constraints

- Every user-visible string remains Simplified Chinese; code, identifiers, comments, and commit messages remain English.
- Support exactly `QT`, `PI`, `SC`, `CI`, `PL`, and `CD`.
- Preserve `zh`, `en`, and `bilingual` document language modes.
- Preserve `modern`, `classic`, and `minimal` layout styles.
- Generate A4 portrait pages at 210 mm × 297 mm with 12 mm safe margins.
- Keep PDF generation entirely in the browser; no document data may be uploaded.
- Do not modify Excel export, draft storage, trial/paywall behavior, AI mock parsing, or toolbox features.
- Do not add logo upload, signatures, encryption, email delivery, or server-side PDF generation.
- Product rows, total blocks, term blocks, and signature blocks must never be cut across pages.
- Do not claim completion until all six representative PDFs render without clipping, overlap, browser headers, URLs, or broken Chinese text.

---

## File Structure

- Create `src/features/documents/pdf/documentPdfModel.ts`: document definitions, localized labels, value formatting, row-unit estimation, and deterministic pagination.
- Create `src/features/documents/pdf/documentPdfModel.test.ts`: six-type mapping, language, formatting, and pagination tests.
- Create `src/features/documents/pdf/DocumentPdfTemplate.tsx`: isolated A4 page and export-surface React components.
- Create `src/features/documents/pdf/DocumentPdfTemplate.test.tsx`: render-level assertions for all six types and continuation pages.
- Create `src/features/documents/pdf/document-pdf.css`: fixed physical page geometry, visual variants, table, terms, footer, and off-screen positioning.
- Create `src/services/pdfExport.ts`: DOM capture and jsPDF download orchestration with injectable adapters.
- Create `src/services/pdfExport.test.ts`: multi-page ordering, cleanup, filename, dependency error, and empty-surface tests.
- Modify `src/features/documents/DocumentWorkspace.tsx`: mount export surface, replace print call, and show PDF status.
- Modify `src/features/documents/DocumentWorkspace.test.tsx`: loading, success, and failure UI tests.
- Modify `src/services/export.ts`: remove obsolete `printDocument`; retain workbook behavior unchanged.
- Modify `src/services/export.test.ts`: confirm workbook regression coverage remains intact.
- Modify `package.json`: add the two PDF dependencies without changing existing scripts beyond normal lockfile updates.
- Modify `pnpm-lock.yaml`: lock `html2canvas@1.4.1` and `jspdf@4.2.1` dependency graphs.
- Modify `src/index.css`: remove obsolete browser-print rules after the new export path is active.

---

### Task 1: Define six document PDF configurations

**Files:**
- Create: `src/features/documents/pdf/documentPdfModel.ts`
- Create: `src/features/documents/pdf/documentPdfModel.test.ts`

**Interfaces:**
- Consumes: `DocumentDraft`, `DocumentType`, `DocumentLanguage`, `LineItem`, and `calculateTotals` from `src/domain/documents.ts`.
- Produces: `PDF_DOCUMENT_CONFIGS`, `PdfColumnDefinition`, `PdfDocumentDefinition`, `PdfPageModel`, `getPdfDocumentDefinition()`, `formatPdfValue()`, and `buildPdfPageModels()`.

- [ ] **Step 1: Write a failing configuration test for all six document types**

```ts
import { describe, expect, it } from 'vitest'
import { getPdfDocumentDefinition } from './documentPdfModel'

describe('getPdfDocumentDefinition', () => {
  it.each([
    ['QT', 'QUOTATION', ['description', 'quantityUnit', 'unitPrice', 'amount'], 'quotationTerms'],
    ['PI', 'PROFORMA INVOICE', ['description', 'quantityUnit', 'unitPrice', 'amount'], 'bankInformation'],
    ['SC', 'SALES CONTRACT', ['description', 'quantityUnit', 'unitPrice', 'amount'], 'signatures'],
    ['CI', 'COMMERCIAL INVOICE', ['description', 'quantityUnit', 'unitPrice', 'amount', 'hsCode'], 'customsPayment'],
    ['PL', 'PACKING LIST', ['description', 'quantity', 'cartons', 'netWeight', 'grossWeight', 'volume'], 'packingTotals'],
    ['CD', 'CUSTOMS INFORMATION', ['description', 'quantity', 'hsCode', 'declarationElements'], 'customsDeclaration'],
  ] as const)('maps %s to its PDF definition', (type, englishTitle, columns, footerKind) => {
    const definition = getPdfDocumentDefinition(type)
    expect(definition.englishTitle).toBe(englishTitle)
    expect(definition.columns.map((column) => column.key)).toEqual(columns)
    expect(definition.footerKind).toBe(footerKind)
  })
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm exec vitest --run src/features/documents/pdf/documentPdfModel.test.ts`  
Expected: FAIL because `documentPdfModel.ts` does not exist.

- [ ] **Step 3: Implement the exact public model and type configuration**

```ts
export type PdfColumnKey =
  | 'description'
  | 'quantity'
  | 'quantityUnit'
  | 'unitPrice'
  | 'amount'
  | 'cartons'
  | 'netWeight'
  | 'grossWeight'
  | 'volume'
  | 'hsCode'
  | 'declarationElements'

export type PdfFooterKind =
  | 'quotationTerms'
  | 'bankInformation'
  | 'signatures'
  | 'customsPayment'
  | 'packingTotals'
  | 'customsDeclaration'

export interface PdfColumnDefinition {
  key: PdfColumnKey
  width: number
  align: 'left' | 'right' | 'center'
  labels: { zh: string; en: string }
}

export interface PdfDocumentDefinition {
  type: DocumentType
  chineseTitle: string
  englishTitle: string
  title(language: DocumentLanguage): string
  columns: PdfColumnDefinition[]
  footerKind: PdfFooterKind
}

export interface PdfPageModel {
  draft: DocumentDraft
  definition: PdfDocumentDefinition
  items: LineItem[]
  pageNumber: number
  totalPages: number
  continuation: boolean
  showSummary: boolean
}
```

Implement `PDF_DOCUMENT_CONFIGS` as a `Record<DocumentType, PdfDocumentDefinition>` with the exact mappings asserted by the test, including a `title(language)` method backed by the Chinese and English titles. Column `width` values for each document must total `100`.

- [ ] **Step 4: Add localized title and value-formatting tests**

```ts
it('formats titles for Chinese, English, and bilingual output', () => {
  const definition = getPdfDocumentDefinition('PI')
  expect(definition.title('zh')).toBe('形式发票')
  expect(definition.title('en')).toBe('PROFORMA INVOICE')
  expect(definition.title('bilingual')).toBe('PROFORMA INVOICE / 形式发票')
})

it('formats money, measurements, and empty values consistently', () => {
  expect(formatPdfValue('amount', 1400, { currency: 'USD' })).toBe('USD 1,400.00')
  expect(formatPdfValue('grossWeight', 18.5)).toBe('18.50 KG')
  expect(formatPdfValue('volume', 0.84)).toBe('0.84 CBM')
  expect(formatPdfValue('hsCode', '')).toBe('—')
})
```

- [ ] **Step 5: Implement localized titles and formatters, then run GREEN**

Run: `pnpm exec vitest --run src/features/documents/pdf/documentPdfModel.test.ts`  
Expected: PASS with configuration and formatter tests green.

- [ ] **Step 6: Commit the configuration model**

```bash
git add src/features/documents/pdf/documentPdfModel.ts src/features/documents/pdf/documentPdfModel.test.ts
git commit -m "feat: define six PDF document layouts"
```

---

### Task 2: Implement deterministic row-safe pagination

**Files:**
- Modify: `src/features/documents/pdf/documentPdfModel.ts`
- Modify: `src/features/documents/pdf/documentPdfModel.test.ts`

**Interfaces:**
- Consumes: `PdfDocumentDefinition`, `DocumentDraft`, and `LineItem` from Task 1.
- Produces: `estimatePdfRowUnits(item, definition): number` and `buildPdfPageModels(draft): PdfPageModel[]` for the React renderer.

- [ ] **Step 1: Write failing tests for one-page, continuation, and summary placement**

```ts
import { createEmptyDraft, createLineItem } from '../../../domain/documents'

it('keeps a short PI on one page with its summary', () => {
  const draft = createEmptyDraft('PI')
  draft.items = [{ ...createLineItem(), name: '硅胶徽章', quantity: 500, unitPrice: 2.8 }]
  const pages = buildPdfPageModels(draft)
  expect(pages).toHaveLength(1)
  expect(pages[0]).toMatchObject({ pageNumber: 1, totalPages: 1, continuation: false, showSummary: true })
})

it('moves complete rows to continuation pages and repeats page metadata', () => {
  const draft = createEmptyDraft('CD')
  draft.items = Array.from({ length: 24 }, (_, index) => ({
    ...createLineItem(),
    name: `产品 ${index + 1}`,
    declarationElements: '品牌类型；出口享惠情况；用途；材质；型号',
  }))
  const pages = buildPdfPageModels(draft)
  expect(pages.length).toBeGreaterThan(1)
  expect(pages.flatMap((page) => page.items)).toHaveLength(24)
  expect(pages.at(-1)?.showSummary).toBe(true)
  expect(pages.slice(0, -1).every((page) => !page.showSummary)).toBe(true)
})

it('does not split a long product row across pages', () => {
  const draft = createEmptyDraft('CD')
  draft.items = [{
    ...createLineItem(),
    name: '超长产品名称'.repeat(12),
    declarationElements: '申报要素'.repeat(30),
  }]
  const pages = buildPdfPageModels(draft)
  expect(pages.flatMap((page) => page.items)).toHaveLength(1)
  expect(pages.some((page) => page.items.length === 1)).toBe(true)
})
```

- [ ] **Step 2: Run pagination tests and verify RED**

Run: `pnpm exec vitest --run src/features/documents/pdf/documentPdfModel.test.ts`  
Expected: FAIL because pagination returns no page models or does not reserve the summary block.

- [ ] **Step 3: Implement row-unit estimation and packing**

Use these constants and rules:

```ts
const FIRST_PAGE_CAPACITY = 8
const CONTINUATION_PAGE_CAPACITY = 13
const SUMMARY_UNITS: Record<PdfFooterKind, number> = {
  quotationTerms: 3,
  bankInformation: 3,
  signatures: 5,
  customsPayment: 4,
  packingTotals: 3,
  customsDeclaration: 4,
}

export function estimatePdfRowUnits(item: LineItem, definition: PdfDocumentDefinition): number {
  const descriptionLines = Math.ceil(`${item.name} ${item.specification}`.trim().length / 36)
  const declarationLines = definition.columns.some((column) => column.key === 'declarationElements')
    ? Math.ceil(item.declarationElements.length / 24)
    : 0
  return Math.min(5, Math.max(1, descriptionLines, declarationLines))
}
```

Pack rows in order. Reserve `SUMMARY_UNITS[definition.footerKind]` on the last page; if the summary does not fit, move complete trailing rows to a new continuation page. After packing, map every page to final `pageNumber`, `totalPages`, `continuation`, and `showSummary` values. Preserve at least one placeholder row when `draft.items` is empty.

- [ ] **Step 4: Run focused and domain regression tests**

Run: `pnpm exec vitest --run src/features/documents/pdf/documentPdfModel.test.ts src/domain/documents.test.ts`  
Expected: PASS; all input rows appear exactly once and only the final page has `showSummary: true`.

- [ ] **Step 5: Commit pagination**

```bash
git add src/features/documents/pdf/documentPdfModel.ts src/features/documents/pdf/documentPdfModel.test.ts
git commit -m "feat: paginate PDF document rows"
```

---

### Task 3: Render isolated A4 React pages

**Files:**
- Create: `src/features/documents/pdf/DocumentPdfTemplate.tsx`
- Create: `src/features/documents/pdf/DocumentPdfTemplate.test.tsx`
- Create: `src/features/documents/pdf/document-pdf.css`

**Interfaces:**
- Consumes: `PdfPageModel[]` from `buildPdfPageModels(draft)`.
- Produces: `DocumentPdfExportSurface({ draft }): JSX.Element`, with each A4 page marked by `data-pdf-page` and accessible labels used by tests.

- [ ] **Step 1: Write failing render tests for common and type-specific content**

```tsx
import { render, screen, within } from '@testing-library/react'
import { createEmptyDraft } from '../../../domain/documents'
import { DocumentPdfExportSurface } from './DocumentPdfTemplate'

it.each([
  ['QT', '报价有效期'],
  ['PI', '银行信息'],
  ['SC', '买方签章'],
  ['CI', '清关与收款资料'],
  ['PL', '总体积'],
  ['CD', '申报要素'],
] as const)('renders the %s-specific PDF section', (type, expectedText) => {
  render(<DocumentPdfExportSurface draft={createEmptyDraft(type)} />)
  expect(screen.getByText(expectedText)).toBeInTheDocument()
})

it('renders one physical A4 page without screen workspace chrome', () => {
  render(<DocumentPdfExportSurface draft={createEmptyDraft('PI')} />)
  const page = screen.getByTestId('pdf-page-1')
  expect(page).toHaveAttribute('data-pdf-page')
  expect(within(page).getByText('PROFORMA INVOICE / 形式发票')).toBeInTheDocument()
  expect(within(page).queryByText('导出 Excel')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run render tests and verify RED**

Run: `pnpm exec vitest --run src/features/documents/pdf/DocumentPdfTemplate.test.tsx`  
Expected: FAIL because the export surface component does not exist.

- [ ] **Step 3: Implement the shared export surface and page component**

```tsx
export function DocumentPdfExportSurface({ draft }: { draft: DocumentDraft }) {
  const pages = buildPdfPageModels(draft)
  return (
    <div className="pdf-export-surface" aria-hidden="true" data-testid="pdf-export-surface">
      {pages.map((page) => <DocumentPdfPage key={page.pageNumber} page={page} />)}
    </div>
  )
}

function DocumentPdfPage({ page }: { page: PdfPageModel }) {
  return (
    <article
      className={`pdf-page pdf-page--${page.draft.layout}`}
      data-pdf-page
      data-testid={`pdf-page-${page.pageNumber}`}
    >
      {/* Header, party cards, type-specific table, summary/footer, and page number */}
    </article>
  )
}
```

Implement each visible section with Chinese UI copy and localized document labels from the model. Do not render screen controls inside the PDF tree.

- [ ] **Step 4: Implement fixed physical CSS**

```css
.pdf-export-surface {
  position: fixed;
  left: -100000px;
  top: 0;
  width: 210mm;
  pointer-events: none;
  background: #fff;
}

.pdf-page {
  width: 210mm;
  height: 297mm;
  padding: 12mm;
  overflow: hidden;
  color: #263433;
  background: #fff;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
}

.pdf-page__table-row,
.pdf-page__summary,
.pdf-page__terms,
.pdf-page__signatures {
  break-inside: avoid;
}
```

Add specific column widths from `PdfColumnDefinition.width`, right-align numeric cells, repeat the table header on every page, and render `第 N 页 / 共 M 页` in the footer.

- [ ] **Step 5: Run render and pagination tests**

Run: `pnpm exec vitest --run src/features/documents/pdf/DocumentPdfTemplate.test.tsx src/features/documents/pdf/documentPdfModel.test.ts`  
Expected: PASS for all six type sections, A4 pages, and continuation metadata.

- [ ] **Step 6: Commit the A4 renderer**

```bash
git add src/features/documents/pdf/DocumentPdfTemplate.tsx src/features/documents/pdf/DocumentPdfTemplate.test.tsx src/features/documents/pdf/document-pdf.css
git commit -m "feat: render isolated A4 document pages"
```

---

### Task 4: Generate local PDF files with injectable adapters

**Files:**
- Create: `src/services/pdfExport.ts`
- Create: `src/services/pdfExport.test.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: an `HTMLElement` containing ordered `[data-pdf-page]` children and a document filename.
- Produces: `exportPdfDocument(root, filename, adapters?): Promise<void>`.

- [ ] **Step 1: Install exact browser-only dependencies**

Run: `pnpm add html2canvas@1.4.1 jspdf@4.2.1`  
Expected: `package.json` and `pnpm-lock.yaml` update; no other direct dependency versions change.

- [ ] **Step 2: Write failing orchestration tests with adapters**

```ts
import { expect, it, vi } from 'vitest'
import { exportPdfDocument, type PdfExportAdapters } from './pdfExport'

it('captures every A4 page in order and downloads the document number', async () => {
  const root = document.createElement('div')
  root.innerHTML = '<article data-pdf-page></article><article data-pdf-page></article>'
  const addPage = vi.fn()
  const addImage = vi.fn()
  const save = vi.fn()
  const adapters: PdfExportAdapters = {
    waitForFonts: vi.fn().mockResolvedValue(undefined),
    capture: vi.fn().mockResolvedValue({ toDataURL: () => 'data:image/png;base64,page' } as HTMLCanvasElement),
    createDocument: () => ({ addPage, addImage, save }),
  }
  await exportPdfDocument(root, 'PI-202608-6369', adapters)
  expect(adapters.capture).toHaveBeenCalledTimes(2)
  expect(addPage).toHaveBeenCalledTimes(1)
  expect(addImage).toHaveBeenCalledTimes(2)
  expect(save).toHaveBeenCalledWith('PI-202608-6369.pdf')
})

it('rejects an export surface without A4 pages', async () => {
  await expect(exportPdfDocument(document.createElement('div'), 'PI-001')).rejects.toThrow('未找到可导出的单据页面')
})
```

- [ ] **Step 3: Run service tests and verify RED**

Run: `pnpm exec vitest --run src/services/pdfExport.test.ts`  
Expected: FAIL because `exportPdfDocument` and its adapter contract do not exist.

- [ ] **Step 4: Implement the service and production adapters**

```ts
export interface PdfWriter {
  addPage(): void
  addImage(data: string, format: 'PNG', x: number, y: number, width: number, height: number): void
  save(filename: string): void
}

export interface PdfExportAdapters {
  waitForFonts(): Promise<void>
  capture(element: HTMLElement): Promise<HTMLCanvasElement>
  createDocument(): PdfWriter
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
  for (const [index, page] of pages.entries()) {
    if (index > 0) pdf.addPage()
    const canvas = await runtime.capture(page)
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297)
  }
  pdf.save(`${filename.trim() || '外贸单据'}.pdf`)
}
```

`createBrowserPdfAdapters()` must dynamically import `html2canvas` and `jspdf`, call `html2canvas(page, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false })`, create `new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })`, and wait for `document.fonts.ready` when available.

- [ ] **Step 5: Run service tests and the production build**

Run: `pnpm exec vitest --run src/services/pdfExport.test.ts && pnpm run build`  
Expected: PASS; Vite creates separate chunks for the dynamically imported PDF libraries.

- [ ] **Step 6: Commit the PDF generator**

```bash
git add package.json pnpm-lock.yaml src/services/pdfExport.ts src/services/pdfExport.test.ts
git commit -m "feat: generate A4 PDFs locally"
```

---

### Task 5: Integrate export status into the document workspace

**Files:**
- Modify: `src/features/documents/DocumentWorkspace.tsx`
- Modify: `src/features/documents/DocumentWorkspace.test.tsx`
- Modify: `src/services/export.ts`
- Modify: `src/services/export.test.ts`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `DocumentPdfExportSurface` and `exportPdfDocument()` from Tasks 3 and 4.
- Produces: a user-facing PDF button that is disabled while exporting and reports success or failure without changing the draft.

- [ ] **Step 1: Write failing UI tests for loading, success, and failure**

```tsx
vi.mock('../../services/pdfExport', () => ({ exportPdfDocument: vi.fn() }))

it('disables PDF export while generating and reports success', async () => {
  let resolveExport!: () => void
  const pending = new Promise<void>((resolve) => { resolveExport = resolve })
  vi.mocked(exportPdfDocument).mockReturnValueOnce(pending)
  const user = userEvent.setup()
  render(<DocumentWorkspace />)
  await user.click(screen.getByRole('button', { name: '导出 PDF' }))
  expect(screen.getByRole('button', { name: '正在生成 PDF…' })).toBeDisabled()
  resolveExport()
  expect(await screen.findByText('PDF 已导出')).toBeInTheDocument()
})

it('reports PDF generation failure and restores the button', async () => {
  vi.mocked(exportPdfDocument).mockRejectedValueOnce(new Error('capture failed'))
  const user = userEvent.setup()
  render(<DocumentWorkspace />)
  await user.click(screen.getByRole('button', { name: '导出 PDF' }))
  expect(await screen.findByText('PDF 生成失败，请检查内容后重试')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '导出 PDF' })).toBeEnabled()
})
```

- [ ] **Step 2: Run workspace tests and verify RED**

Run: `pnpm exec vitest --run src/features/documents/DocumentWorkspace.test.tsx`  
Expected: FAIL because the workspace still calls `window.print()` and has no export surface reference.

- [ ] **Step 3: Mount the export surface and implement status transitions**

Add `pdfRootRef`, `isPdfExporting`, and this handler:

```tsx
async function handlePdfExport() {
  if (!pdfRootRef.current || isPdfExporting) return
  setIsPdfExporting(true)
  setExportStatus('正在生成 PDF…')
  try {
    await exportPdfDocument(pdfRootRef.current, draft.documentNumber)
    setExportStatus('PDF 已导出')
  } catch {
    setExportStatus('PDF 生成失败，请检查内容后重试')
  } finally {
    setIsPdfExporting(false)
  }
}
```

Render `<div ref={pdfRootRef}><DocumentPdfExportSurface draft={draft} /></div>` outside the responsive two-column workspace. Change the button label to `正在生成 PDF…` only while exporting and disable it during that state.

- [ ] **Step 4: Remove the obsolete print path**

Delete `printDocument()` from `src/services/export.ts`, remove its import from `DocumentWorkspace.tsx`, and remove the `@media print` block from `src/index.css`. Do not change `buildWorkbookData()` or `exportWorkbook()`.

- [ ] **Step 5: Run workspace, PDF, and workbook tests**

Run: `pnpm exec vitest --run src/features/documents/DocumentWorkspace.test.tsx src/services/pdfExport.test.ts src/services/export.test.ts`  
Expected: PASS; workbook sheets and rows remain unchanged.

- [ ] **Step 6: Commit workspace integration**

```bash
git add src/features/documents/DocumentWorkspace.tsx src/features/documents/DocumentWorkspace.test.tsx src/services/export.ts src/services/export.test.ts src/index.css
git commit -m "feat: integrate reliable PDF export"
```

---

### Task 6: Validate all six PDFs visually and publish the corrected site

**Files:**
- Create during QA: `output/pdf/QT-视觉验收.pdf`
- Create during QA: `output/pdf/PI-视觉验收.pdf`
- Create during QA: `output/pdf/SC-视觉验收.pdf`
- Create during QA: `output/pdf/CI-视觉验收.pdf`
- Create during QA: `output/pdf/PL-视觉验收.pdf`
- Create during QA: `output/pdf/CD-视觉验收.pdf`
- Modify only if defects are found: files from Tasks 1–5

**Interfaces:**
- Consumes: the completed browser UI and all six `DocumentDraft` configurations.
- Produces: six A4 QA artifacts, rendered PNG evidence, a clean production build, and an updated public deployment.

- [ ] **Step 1: Run the complete automated verification suite**

Run: `pnpm exec vitest --run && pnpm run build && git diff --check`  
Expected: all tests pass, production build exits `0`, and `git diff --check` prints nothing.

- [ ] **Step 2: Start a local production-like preview**

Run: `pnpm run dev -- --host 127.0.0.1`  
Expected: Vite reports a healthy local URL and the six document buttons are usable.

- [ ] **Step 3: Export six representative documents**

For each type, use at least two product rows and populate every type-specific field. Save the downloads with these exact QA filenames under `output/pdf/`. For `CD`, use enough rows to force at least two pages. Confirm the UI reports `PDF 已导出` after every file.

- [ ] **Step 4: Verify PDF metadata and page geometry**

Run for each file: `pdfinfo output/pdf/<filename>.pdf`  
Expected: page size `595.28 x 841.89 pts (A4)` or equivalent A4 dimensions, portrait rotation, no encryption, and at least one page. `CD-视觉验收.pdf` must have at least two pages.

- [ ] **Step 5: Render every PDF page to PNG and inspect visually**

Run for each file: `pdftoppm -r 144 -png output/pdf/<filename>.pdf tmp/pdfs/<type>/page`  
Inspect every PNG. Require zero browser headers, URLs, clipped text, vertical single-character wrapping, overlaps, broken rows, missing repeated table headers, or detached totals/terms. Compare the PI hierarchy against `PI-202608-6369.pdf`.

- [ ] **Step 6: Fix any visual defect with a new failing test first**

For each defect, add the smallest failing model or render test, observe RED, implement one correction, rerun GREEN, regenerate the affected PDF, and re-render all of its pages. Do not batch unrelated visual corrections.

- [ ] **Step 7: Run final verification after the last correction**

Run: `pnpm exec vitest --run && pnpm run build && git diff --check`  
Expected: all tests pass, production build exits `0`, and no whitespace errors remain.

- [ ] **Step 8: Commit any final QA corrections**

```bash
git add src package.json pnpm-lock.yaml
git commit -m "fix: polish six PDF document layouts"
```

Skip this commit only when Step 6 required no source changes.

- [ ] **Step 9: Publish only after explicit public-deployment approval**

Push the exact validated commit to the existing Sites source repository, package the matching build, save a new site version, and deploy it to the existing public access level. Poll until the deployment reports `succeeded`.

- [ ] **Step 10: Verify the deployed product flow**

Open the exact deployed URL, create a short PI, export it, and confirm the downloaded PDF opens as A4 without browser headers or layout compression. Report the public URL, automated test count, PDF QA result, and any intentionally simplified area.

---

## Plan Self-Review

- Spec coverage: Tasks 1–5 cover all six configurations, three languages, three styles, A4 isolation, local generation, pagination, loading/error states, and Excel preservation. Task 6 covers six-file visual QA and publication.
- Scope: This plan changes only PDF export and directly supporting tests/styles/dependencies. It excludes logo upload, authentication, payment, backend generation, and CRM.
- Type consistency: `PdfPageModel`, `PdfDocumentDefinition`, `DocumentPdfExportSurface`, `PdfExportAdapters`, and `exportPdfDocument()` use the same signatures in producer and consumer tasks.
- Placeholder scan: No unfinished implementation markers remain. Every task names exact files, tests, commands, expected failures, implementation interfaces, and commit boundaries.
