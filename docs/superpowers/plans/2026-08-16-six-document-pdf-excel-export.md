# Six-Document PDF and Excel Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace browser printing and raw two-sheet workbook export with professional, local-only PDF and single-sheet Excel files for all six foreign-trade document types.

**Architecture:** Introduce a shared document-export definition layer for titles, columns, type-specific footer sections, language labels, and value formatting. PDF uses deterministic page models plus isolated A4 React pages captured by `html2canvas` and written by `jsPDF`; Excel uses the same definitions to render one styled ExcelJS worksheet with formulas and A4 print settings. Both exporters remain browser-only and expose independent loading, success, and failure states.

**Tech Stack:** React 18, TypeScript 5.7, Vite 5, Tailwind CSS, Vitest, Testing Library, `html2canvas@1.4.1`, `jspdf@4.2.1`, `exceljs@4.4.0`

## Global Constraints

- Every user-visible app string remains Simplified Chinese; document content follows the selected `zh`, `en`, or `bilingual` mode.
- Support exactly `QT`, `PI`, `SC`, `CI`, `PL`, and `CD`.
- Preserve `modern`, `classic`, and `minimal` layout styles.
- Generate A4 portrait PDF pages at 210 mm × 297 mm with 12 mm safe margins.
- Generate exactly one formal Excel worksheet per download; do not retain visible or hidden raw-data sheets.
- Keep PDF and Excel generation entirely in the browser; no document data may be uploaded.
- Preserve draft storage, trial/paywall behavior, AI mock parsing, toolbox features, and the manual form.
- Do not add logo upload, signatures as images, encryption, email delivery, server-side generation, authentication, payment, or CRM.
- Do not invent unsupported business fields. Use only the current `DocumentDraft` model.
- Product rows, PDF totals, term blocks, and signature blocks must never be cut across PDF pages.
- Excel product amounts and totals must be formulas with cached results; formulas use bounded ranges on the single formal sheet.
- Pin ExcelJS transitive overrides to `uuid@11.1.1` and `tmp@0.2.7`; a high-severity production audit finding blocks publication.
- This plan supersedes `2026-08-16-six-document-a4-pdf-export.md`.

---

## File Structure

- Create `src/features/documents/export/documentExportModel.ts`: shared document definitions, language labels, value formatting, totals, and type-specific section metadata.
- Create `src/features/documents/export/documentExportModel.test.ts`: six-type, language, field-mapping, and formatting tests.
- Create `src/features/documents/pdf/documentPdfModel.ts`: row-unit estimation and deterministic A4 page packing.
- Create `src/features/documents/pdf/documentPdfModel.test.ts`: one-page, continuation, and non-splitting pagination tests.
- Create `src/features/documents/pdf/DocumentPdfTemplate.tsx`: isolated A4 export surface and six type-specific page sections.
- Create `src/features/documents/pdf/DocumentPdfTemplate.test.tsx`: render assertions for all six document types.
- Create `src/features/documents/pdf/document-pdf.css`: physical A4 geometry and three visual variants.
- Create `src/services/pdfExport.ts`: DOM capture and jsPDF download orchestration.
- Create `src/services/pdfExport.test.ts`: ordered multi-page export and failure tests.
- Create `src/features/documents/excel/excelLayout.ts`: ten-column grid, row locations, formulas, merges, and style-role helpers.
- Create `src/features/documents/excel/excelLayout.test.ts`: six-type layout and formula-address tests.
- Create `src/features/documents/excel/buildExcelWorkbook.ts`: ExcelJS worksheet renderer.
- Create `src/features/documents/excel/buildExcelWorkbook.test.ts`: workbook structure, formulas, styles, page setup, and round-trip tests.
- Create `src/services/excelExport.ts`: dynamic ExcelJS loading, Blob download, and cleanup.
- Create `src/services/excelExport.test.ts`: filename, one-click, and error-path tests.
- Modify `src/features/documents/DocumentWorkspace.tsx`: mount the PDF surface and integrate independent PDF/Excel export states.
- Modify `src/features/documents/DocumentWorkspace.test.tsx`: loading, success, failure, and button-isolation tests.
- Delete `src/services/export.ts`: remove the obsolete raw workbook and browser-print paths after migration.
- Delete `src/services/export.test.ts`: replace obsolete row-array tests with the new PDF/Excel suites.
- Modify `src/index.css`: remove browser-print rules after the new PDF path is active.
- Modify `package.json` and `pnpm-lock.yaml`: add exact export dependencies, overrides, and remove `xlsx`.

---

### Task 1: Secure the export dependency set

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `pnpm-workspace.yaml`

**Interfaces:**
- Consumes: existing pnpm workspace and Vite browser build.
- Produces: exact PDF and Excel dependencies plus audited ExcelJS overrides for all later tasks.

- [ ] **Step 1: Update direct dependencies and overrides**

Run:

```bash
pnpm remove xlsx
pnpm add html2canvas@1.4.1 jspdf@4.2.1 exceljs@4.4.0
```

Create `pnpm-workspace.yaml` with the exact security and build-script policy:

```yaml
packages:
  - .

overrides:
  exceljs>tmp: 0.2.7
  exceljs>uuid: 11.1.1

allowBuilds:
  core-js: false
  esbuild: true
```

Then run: `pnpm install --no-frozen-lockfile`.

Expected: `xlsx` is absent; the three exact direct versions and two overrides are present.

- [ ] **Step 2: Verify the resolved dependency graph**

Run:

```bash
pnpm why exceljs uuid tmp xlsx
```

Expected: ExcelJS is `4.4.0`, its resolved UUID is `11.1.1`, its resolved tmp is `0.2.7`, and `xlsx` is not a direct dependency.

- [ ] **Step 3: Run the production audit gate**

Run:

```bash
pnpm audit --prod --audit-level high
```

Expected: exit code `0` with no high or critical production finding. Stop this task if it fails; do not use `--force` or ignore the result.

- [ ] **Step 4: Verify the unchanged app still builds**

Run: `pnpm run build`  
Expected: PASS before export code is added.

- [ ] **Step 5: Commit the dependency migration**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml
git commit -m "build: secure document export dependencies"
```

---

### Task 2: Define one shared six-document export model

**Files:**
- Create: `src/features/documents/export/documentExportModel.ts`
- Create: `src/features/documents/export/documentExportModel.test.ts`

**Interfaces:**
- Consumes: `DocumentDraft`, `DocumentType`, `DocumentLanguage`, `LineItem`, `calculateLineAmount`, and `calculateTotals` from `src/domain/documents.ts`.
- Produces: `DOCUMENT_EXPORT_DEFINITIONS`, `DocumentExportDefinition`, `ExportColumnDefinition`, `getDocumentExportDefinition()`, `getDocumentExportTitle()`, `getExportLabel()`, and `formatExportValue()`.

- [ ] **Step 1: Write failing six-type configuration tests**

```ts
import { describe, expect, it } from 'vitest'
import { getDocumentExportDefinition } from './documentExportModel'

describe('getDocumentExportDefinition', () => {
  it.each([
    ['QT', 'QUOTATION', ['description', 'specification', 'quantity', 'unit', 'unitPrice', 'amount'], 'quotationTerms'],
    ['PI', 'PROFORMA INVOICE', ['description', 'specification', 'quantity', 'unit', 'unitPrice', 'amount'], 'bankInformation'],
    ['SC', 'SALES CONTRACT', ['description', 'specification', 'quantity', 'unit', 'unitPrice', 'amount'], 'signatures'],
    ['CI', 'COMMERCIAL INVOICE', ['description', 'specification', 'quantity', 'unit', 'unitPrice', 'amount', 'hsCode'], 'customsPayment'],
    ['PL', 'PACKING LIST', ['description', 'specification', 'quantity', 'unit', 'cartons', 'netWeight', 'grossWeight', 'volume'], 'packingTotals'],
    ['CD', 'CUSTOMS INFORMATION', ['description', 'specification', 'quantity', 'unit', 'hsCode', 'declarationElements'], 'customsDeclaration'],
  ] as const)('maps %s to the required export definition', (type, englishTitle, columns, footerKind) => {
    const definition = getDocumentExportDefinition(type)
    expect(definition.englishTitle).toBe(englishTitle)
    expect(definition.columns.map((column) => column.key)).toEqual(columns)
    expect(definition.footerKind).toBe(footerKind)
  })
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm exec vitest --run src/features/documents/export/documentExportModel.test.ts`  
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the exact public types**

```ts
export type ExportColumnKey =
  | 'description' | 'specification' | 'quantity' | 'unit' | 'unitPrice' | 'amount'
  | 'cartons' | 'netWeight' | 'grossWeight' | 'volume'
  | 'hsCode' | 'declarationElements'

export type ExportFooterKind =
  | 'quotationTerms' | 'bankInformation' | 'signatures'
  | 'customsPayment' | 'packingTotals' | 'customsDeclaration'

export interface ExportColumnDefinition {
  key: ExportColumnKey
  labels: { zh: string; en: string }
  align: 'left' | 'center' | 'right'
}

export interface DocumentExportDefinition {
  type: DocumentType
  sheetName: string
  chineseTitle: string
  englishTitle: string
  columns: ExportColumnDefinition[]
  footerKind: ExportFooterKind
}
```

Create an exhaustive `Record<DocumentType, DocumentExportDefinition>` matching Step 1. Use only current `DocumentDraft` fields: CD trade country is `trade.country`, transaction method is `trade.incoterm`, transport/customs port are from `settlement`, and notes are `draft.notes`.

- [ ] **Step 4: Write failing language and formatter tests**

```ts
it('formats all three document language modes', () => {
  const definition = getDocumentExportDefinition('PI')
  expect(getDocumentExportTitle(definition, 'zh')).toBe('形式发票')
  expect(getDocumentExportTitle(definition, 'en')).toBe('PROFORMA INVOICE')
  expect(getDocumentExportTitle(definition, 'bilingual')).toBe('PROFORMA INVOICE / 形式发票')
  expect(getExportLabel({ zh: '数量', en: 'QTY' }, 'bilingual')).toBe('QTY / 数量')
})

it('formats money, measurements, counts, and empty values', () => {
  expect(formatExportValue('amount', 1400, { currency: 'USD' })).toBe('USD 1,400.00')
  expect(formatExportValue('grossWeight', 18.5)).toBe('18.50 KG')
  expect(formatExportValue('volume', 0.84)).toBe('0.84 CBM')
  expect(formatExportValue('quantity', 500)).toBe('500')
  expect(formatExportValue('hsCode', '')).toBe('--')
})
```

- [ ] **Step 5: Implement formatters and run GREEN**

Run: `pnpm exec vitest --run src/features/documents/export/documentExportModel.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit the shared model**

```bash
git add src/features/documents/export/documentExportModel.ts src/features/documents/export/documentExportModel.test.ts
git commit -m "feat: define shared document export model"
```

---

### Task 3: Implement deterministic PDF pagination

**Files:**
- Create: `src/features/documents/pdf/documentPdfModel.ts`
- Create: `src/features/documents/pdf/documentPdfModel.test.ts`

**Interfaces:**
- Consumes: `DocumentDraft`, `LineItem`, `DocumentExportDefinition`, and `getDocumentExportDefinition()`.
- Produces: `PdfPageModel`, `estimatePdfRowUnits()`, and `buildPdfPageModels()`.

- [ ] **Step 1: Write failing one-page and continuation tests**

```ts
import { createEmptyDraft, createLineItem } from '../../../domain/documents'
import { buildPdfPageModels } from './documentPdfModel'

it('keeps a short PI and its summary on one page', () => {
  const draft = createEmptyDraft('PI')
  draft.items = [{ ...createLineItem(), name: '硅胶徽章', quantity: 500, unitPrice: 2.8 }]
  expect(buildPdfPageModels(draft)).toMatchObject([
    { pageNumber: 1, totalPages: 1, continuation: false, showSummary: true },
  ])
})

it('moves complete customs rows to continuation pages', () => {
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
```

- [ ] **Step 2: Run pagination tests and verify RED**

Run: `pnpm exec vitest --run src/features/documents/pdf/documentPdfModel.test.ts`  
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement row units and page packing**

```ts
export interface PdfPageModel {
  draft: DocumentDraft
  definition: DocumentExportDefinition
  items: LineItem[]
  pageNumber: number
  totalPages: number
  continuation: boolean
  showSummary: boolean
}

const FIRST_PAGE_CAPACITY = 8
const CONTINUATION_PAGE_CAPACITY = 13

export function estimatePdfRowUnits(item: LineItem, definition: DocumentExportDefinition): number {
  const descriptionLines = Math.ceil(`${item.name} ${item.specification}`.trim().length / 36)
  const declarationLines = definition.columns.some((column) => column.key === 'declarationElements')
    ? Math.ceil(item.declarationElements.length / 24)
    : 0
  return Math.min(5, Math.max(1, descriptionLines, declarationLines))
}
```

Reserve summary units by footer kind: quotation `3`, bank `3`, signatures `5`, customs payment `4`, packing `3`, customs declaration `4`. Pack rows in order, never split one row, move trailing complete rows when the final summary does not fit, and keep one placeholder row when the draft has no items.

- [ ] **Step 4: Add the single-long-row regression**

```ts
it('keeps one long product row intact', () => {
  const draft = createEmptyDraft('CD')
  draft.items = [{
    ...createLineItem(),
    name: '超长产品名称'.repeat(12),
    declarationElements: '申报要素'.repeat(30),
  }]
  const pages = buildPdfPageModels(draft)
  expect(pages.flatMap((page) => page.items)).toHaveLength(1)
})
```

- [ ] **Step 5: Run focused and domain regression tests**

Run: `pnpm exec vitest --run src/features/documents/pdf/documentPdfModel.test.ts src/domain/documents.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit pagination**

```bash
git add src/features/documents/pdf/documentPdfModel.ts src/features/documents/pdf/documentPdfModel.test.ts
git commit -m "feat: paginate A4 document rows"
```

---

### Task 4: Render isolated A4 React pages

**Files:**
- Create: `src/features/documents/pdf/DocumentPdfTemplate.tsx`
- Create: `src/features/documents/pdf/DocumentPdfTemplate.test.tsx`
- Create: `src/features/documents/pdf/document-pdf.css`

**Interfaces:**
- Consumes: `buildPdfPageModels(draft): PdfPageModel[]` and shared labels/formatters.
- Produces: `DocumentPdfExportSurface({ draft }): JSX.Element`; each physical page carries `data-pdf-page`.

- [ ] **Step 1: Write failing six-type render tests**

```tsx
import { render, screen, within } from '@testing-library/react'
import { createEmptyDraft } from '../../../domain/documents'
import { DocumentPdfExportSurface } from './DocumentPdfTemplate'

it.each([
  ['QT', '报价有效期'], ['PI', '银行信息'], ['SC', '买方签章'],
  ['CI', '清关与收款资料'], ['PL', '总体积'], ['CD', '申报要素'],
] as const)('renders the %s PDF-specific section', (type, expectedText) => {
  render(<DocumentPdfExportSurface draft={createEmptyDraft(type)} />)
  expect(screen.getByText(expectedText)).toBeInTheDocument()
})

it('keeps workspace controls outside the A4 page', () => {
  render(<DocumentPdfExportSurface draft={createEmptyDraft('PI')} />)
  const page = screen.getByTestId('pdf-page-1')
  expect(page).toHaveAttribute('data-pdf-page')
  expect(within(page).queryByText('导出 Excel')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run render tests and verify RED**

Run: `pnpm exec vitest --run src/features/documents/pdf/DocumentPdfTemplate.test.tsx`  
Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the export surface**

```tsx
export function DocumentPdfExportSurface({ draft }: { draft: DocumentDraft }) {
  const pages = buildPdfPageModels(draft)
  return (
    <div className="pdf-export-surface" aria-hidden="true" data-testid="pdf-export-surface">
      {pages.map((page) => <DocumentPdfPage key={page.pageNumber} page={page} />)}
    </div>
  )
}
```

`DocumentPdfPage` renders the brand header, localized title, number/date, two party cards, the configured product columns, totals, the exact footer-kind section, and `第 N 页 / 共 M 页`. Continuation pages use a compact header and repeat the table header.

- [ ] **Step 4: Implement fixed physical CSS and three variants**

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
  font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif;
}
```

Use `modern`, `classic`, and `minimal` modifier classes. Numeric cells are right-aligned. Product rows, summaries, terms, and signatures use non-splitting layout rules.

- [ ] **Step 5: Run render and pagination tests**

Run: `pnpm exec vitest --run src/features/documents/pdf/DocumentPdfTemplate.test.tsx src/features/documents/pdf/documentPdfModel.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit the A4 renderer**

```bash
git add src/features/documents/pdf
git commit -m "feat: render six isolated A4 documents"
```

---

### Task 5: Generate local PDF files

**Files:**
- Create: `src/services/pdfExport.ts`
- Create: `src/services/pdfExport.test.ts`

**Interfaces:**
- Consumes: an `HTMLElement` with ordered `[data-pdf-page]` children and a filename.
- Produces: `PdfWriter`, `PdfExportAdapters`, and `exportPdfDocument(root, filename, adapters?): Promise<void>`.

- [ ] **Step 1: Write failing adapter-driven tests**

```ts
it('captures every page in order and saves the document number', async () => {
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
  expect(save).toHaveBeenCalledWith('PI-202608-6369.pdf')
})

it('rejects an empty export surface', async () => {
  await expect(exportPdfDocument(document.createElement('div'), 'PI-001'))
    .rejects.toThrow('未找到可导出的单据页面')
})
```

- [ ] **Step 2: Run the focused service test and verify RED**

Run: `pnpm exec vitest --run src/services/pdfExport.test.ts`  
Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement the service with optional adapters**

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

The production adapter dynamically imports both libraries, captures at scale `2` with a white background and no logging, creates A4 portrait pages in millimetres, and waits for `document.fonts.ready` when available.

- [ ] **Step 4: Run tests and the production build**

Run: `pnpm exec vitest --run src/services/pdfExport.test.ts && pnpm run build`  
Expected: PASS and Vite emits lazy PDF chunks.

- [ ] **Step 5: Commit the PDF service**

```bash
git add src/services/pdfExport.ts src/services/pdfExport.test.ts
git commit -m "feat: generate local A4 PDFs"
```

---

### Task 6: Plan the formal single-sheet Excel grid

**Files:**
- Create: `src/features/documents/excel/excelLayout.ts`
- Create: `src/features/documents/excel/excelLayout.test.ts`

**Interfaces:**
- Consumes: `DocumentDraft` and `DocumentExportDefinition`.
- Produces: `ExcelDocumentLayout`, `ExcelTableColumn`, `buildExcelDocumentLayout()`, and bounded formula strings for the ExcelJS renderer.

- [ ] **Step 1: Write failing layout tests for all six types**

```ts
it.each([
  ['QT', '报价单', 6, 'quotationTerms'],
  ['PI', '形式发票', 6, 'bankInformation'],
  ['SC', '销售合同', 6, 'signatures'],
  ['CI', '商业发票', 7, 'customsPayment'],
  ['PL', '装箱单', 8, 'packingTotals'],
  ['CD', '报关信息', 6, 'customsDeclaration'],
] as const)('builds the %s single-sheet grid', (type, sheetName, dataColumns, footerKind) => {
  const layout = buildExcelDocumentLayout(createEmptyDraft(type))
  expect(layout.sheetName).toBe(sheetName)
  expect(layout.tableColumns.filter((column) => column.key !== 'sequence')).toHaveLength(dataColumns)
  expect(layout.footerKind).toBe(footerKind)
  expect(layout.printArea).toMatch(/^A1:J\d+$/)
})
```

- [ ] **Step 2: Run and verify RED**

Run: `pnpm exec vitest --run src/features/documents/excel/excelLayout.test.ts`  
Expected: FAIL because the layout module does not exist.

- [ ] **Step 3: Implement the ten-column plan**

```ts
export interface ExcelTableColumn {
  key: ExportColumnKey | 'sequence'
  startColumn: number
  endColumn: number
  width: number
  numberFormat?: string
}

export interface ExcelDocumentLayout {
  sheetName: string
  titleRow: number
  partyHeaderRow: number
  tableHeaderRow: number
  firstItemRow: number
  lastItemRow: number
  summaryRow: number
  lastContentRow: number
  printArea: string
  footerKind: ExportFooterKind
  tableColumns: ExcelTableColumn[]
  formulas: ExcelFormulaPlan
}

export interface ExcelFormulaPlan {
  itemAmounts: string[]
  amountTotal?: string
  quantityTotal: string
  cartonsTotal?: string
  netWeightTotal?: string
  grossWeightTotal?: string
  volumeTotal?: string
}
```

Use columns `A:J`, rows `1` brand, `2` title/number, `3` date, `5:9` parties, `10` table header, `11...` items, then summary and type-specific footer. Empty drafts still reserve one item row. QT/PI/SC use quantity and unit as separate numeric/text columns so the amount formula remains editable.

- [ ] **Step 4: Write exact formula-address tests**

```ts
it('uses bounded formulas for amount and total', () => {
  const draft = createEmptyDraft('QT')
  draft.items = [createLineItem(), createLineItem()]
  const layout = buildExcelDocumentLayout(draft)
  expect(layout.formulas.itemAmounts).toEqual(['F11*H11', 'F12*H12'])
  expect(layout.formulas.amountTotal).toBe('SUM(I11:I12)')
})

it('uses quantity-weighted packing formulas', () => {
  const layout = buildExcelDocumentLayout(createEmptyDraft('PL'))
  expect(layout.formulas.netWeightTotal).toBe('SUMPRODUCT(E11:E11,H11:H11)')
  expect(layout.formulas.volumeTotal).toBe('SUMPRODUCT(E11:E11,J11:J11)')
})
```

Use these exact non-overlapping grids:

- QT/PI/SC: `A sequence`, `B:C description`, `D:E specification`, `F quantity`, `G unit`, `H unitPrice`, `I:J amount`.
- CI: `A sequence`, `B:C description`, `D specification`, `E quantity`, `F unit`, `G unitPrice`, `H amount`, `I:J hsCode`.
- PL: `A sequence`, `B:C description`, `D specification`, `E quantity`, `F unit`, `G cartons`, `H netWeight`, `I grossWeight`, `J volume`.
- CD: `A sequence`, `B:C description`, `D specification`, `E quantity`, `F unit`, `G:H hsCode`, `I:J declarationElements`.

- [ ] **Step 5: Run the layout suite**

Run: `pnpm exec vitest --run src/features/documents/excel/excelLayout.test.ts src/features/documents/export/documentExportModel.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit the Excel layout model**

```bash
git add src/features/documents/excel/excelLayout.ts src/features/documents/excel/excelLayout.test.ts
git commit -m "feat: plan six formal Excel layouts"
```

---

### Task 7: Render the styled ExcelJS workbook

**Files:**
- Create: `src/features/documents/excel/buildExcelWorkbook.ts`
- Create: `src/features/documents/excel/buildExcelWorkbook.test.ts`

**Interfaces:**
- Consumes: `buildExcelDocumentLayout()`, shared definitions, `DocumentDraft`, and an ExcelJS `Workbook` instance.
- Produces: `buildExcelWorkbook(draft, workbook): Workbook`.

- [ ] **Step 1: Write failing structure and style tests**

```ts
import { Workbook } from 'exceljs'

it('creates exactly one formal quotation worksheet', () => {
  const draft = createEmptyDraft('QT')
  draft.seller.companyName = 'Kyrie公司'
  draft.buyer.companyName = '北辰户外用品有限公司'
  const workbook = buildExcelWorkbook(draft, new Workbook())
  const sheet = workbook.worksheets[0]
  expect(workbook.worksheets).toHaveLength(1)
  expect(sheet.name).toBe('报价单')
  expect(sheet.getCell('A1').value).toBe('Kyrie公司')
  expect(sheet.getCell('A2').value).toBe('报价单')
  expect(sheet.getCell('A1').fill).toMatchObject({ type: 'pattern', fgColor: { argb: 'FF124E41' } })
  expect(sheet.views[0]).toMatchObject({ showGridLines: false })
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm exec vitest --run src/features/documents/excel/buildExcelWorkbook.test.ts`  
Expected: FAIL because the renderer does not exist.

- [ ] **Step 3: Implement common sheet geometry and styles**

```ts
export function buildExcelWorkbook(draft: DocumentDraft, workbook: Workbook): Workbook {
  const layout = buildExcelDocumentLayout(draft)
  const sheet = workbook.addWorksheet(layout.sheetName, {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      printArea: layout.printArea,
      printTitlesRow: `${layout.tableHeaderRow}:${layout.tableHeaderRow}`,
      margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 },
    },
  })
  workbook.calcProperties.fullCalcOnLoad = true
  sheet.headerFooter.oddFooter = getExcelPageFooter(draft.language)
  renderBrandHeader(sheet, draft, layout)
  renderDocumentHeading(sheet, draft, layout)
  renderPartyBlocks(sheet, draft, layout)
  renderProductTable(sheet, draft, layout)
  renderSummaryAndFooter(sheet, draft, layout)
  return workbook
}
```

Implement the five render helpers in the same module. They call focused helpers `mergeAndSet()`, `applyRoleStyle()`, and `renderPartyBlock()` to apply fixed widths, intentional row heights, Microsoft YaHei, merges, green header styles, light-green section styles, borders, wrapping, and semantic alignment. Implement `getExcelPageFooter()` as Chinese `第 &P 页 / 共 &N 页`, English `Page &P of &N`, or both strings joined with ` / `.

- [ ] **Step 4: Write formula and page-setup tests**

```ts
it('writes editable formulas with cached results and A4 print settings', () => {
  const draft = createEmptyDraft('QT')
  draft.items[0] = { ...draft.items[0], name: '硅胶徽章', quantity: 500, unitPrice: 2.8 }
  const workbook = buildExcelWorkbook(draft, new Workbook())
  const sheet = workbook.worksheets[0]
  expect(sheet.getCell('I11').value).toEqual({ formula: 'F11*H11', result: 1400 })
  expect(sheet.getCell('I12').value).toEqual({ formula: 'SUM(I11:I11)', result: 1400 })
  expect(sheet.pageSetup).toMatchObject({ paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 })
  expect(sheet.pageSetup.printArea).toMatch(/^A1:J\d+$/)
  expect(sheet.pageSetup.printTitlesRow).toBe('10:10')
})
```

- [ ] **Step 5: Add six footer-kind and language/style coverage**

```ts
it.each([
  ['QT', '报价有效期'], ['PI', '银行信息'], ['SC', '买方签章'],
  ['CI', '清关与收款资料'], ['PL', '总体积'], ['CD', '申报要素'],
] as const)('writes the %s type-specific footer', (type, label) => {
  const workbook = buildExcelWorkbook(createEmptyDraft(type), new Workbook())
  expect(workbook.worksheets[0].getSheetValues().flat()).toContain(label)
})

it.each([
  ['zh', 'modern', '报价单'],
  ['en', 'classic', 'QUOTATION'],
  ['bilingual', 'minimal', 'QUOTATION / 报价单'],
] as const)('renders %s language with %s style', (language, layout, title) => {
  const draft = createEmptyDraft('QT')
  draft.language = language
  draft.layout = layout
  const workbook = buildExcelWorkbook(draft, new Workbook())
  expect(workbook.worksheets).toHaveLength(1)
  expect(workbook.worksheets[0].getCell('A2').value).toBe(title)
})
```

- [ ] **Step 6: Add an XLSX round-trip test**

```ts
it('serializes and reloads the formal worksheet', async () => {
  const workbook = buildExcelWorkbook(createEmptyDraft('PI'), new Workbook())
  const bytes = await workbook.xlsx.writeBuffer()
  const reloaded = new Workbook()
  await reloaded.xlsx.load(bytes)
  expect(reloaded.worksheets).toHaveLength(1)
  expect(reloaded.worksheets[0].name).toBe('形式发票')
  expect(reloaded.worksheets[0].getCell('A2').value).toBe('形式发票')
})
```

- [ ] **Step 7: Run Excel and shared-model tests**

Run: `pnpm exec vitest --run src/features/documents/excel src/features/documents/export`  
Expected: PASS for six layouts, formulas, styles, page setup, and round-trip serialization.

- [ ] **Step 8: Commit the ExcelJS renderer**

```bash
git add src/features/documents/excel/buildExcelWorkbook.ts src/features/documents/excel/buildExcelWorkbook.test.ts
git commit -m "feat: render client-ready Excel documents"
```

---

### Task 8: Download Excel locally and remove raw export

**Files:**
- Create: `src/services/excelExport.ts`
- Create: `src/services/excelExport.test.ts`
- Delete: `src/services/export.ts`
- Delete: `src/services/export.test.ts`

**Interfaces:**
- Consumes: `DocumentDraft`, `buildExcelWorkbook()`, and optional browser adapters.
- Produces: `ExcelExportAdapters` and `exportExcelDocument(draft, adapters?): Promise<void>`.

- [ ] **Step 1: Write failing download tests**

```ts
export interface ExcelExportAdapters {
  createWorkbook(): Workbook
  buildWorkbook(draft: DocumentDraft, workbook: Workbook): Workbook
  download(blob: Blob, filename: string): void
}

function createSuccessfulAdapters(download = vi.fn()): ExcelExportAdapters {
  return {
    createWorkbook: () => ({ xlsx: { writeBuffer: vi.fn().mockResolvedValue(new Uint8Array([1])) } } as never),
    buildWorkbook: vi.fn((_, workbook) => workbook),
    download,
  }
}

it('downloads one workbook with the document number', async () => {
  const draft = createEmptyDraft('QT')
  draft.documentNumber = 'QT-202608-0295'
  const writeBuffer = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]))
  const download = vi.fn()
  await exportExcelDocument(draft, {
    createWorkbook: () => ({ xlsx: { writeBuffer } } as never),
    buildWorkbook: vi.fn((_, workbook) => workbook),
    download,
  })
  expect(writeBuffer).toHaveBeenCalledTimes(1)
  expect(download).toHaveBeenCalledWith(expect.any(Blob), 'QT-202608-0295.xlsx')
})

it('uses a Chinese fallback filename', async () => {
  const draft = createEmptyDraft('QT')
  draft.documentNumber = '   '
  const download = vi.fn()
  await exportExcelDocument(draft, createSuccessfulAdapters(download))
  expect(download).toHaveBeenCalledWith(expect.any(Blob), '外贸单据.xlsx')
})
```

- [ ] **Step 2: Run and verify RED**

Run: `pnpm exec vitest --run src/services/excelExport.test.ts`  
Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement dynamic loading and cleanup**

```ts
export async function exportExcelDocument(
  draft: DocumentDraft,
  adapters?: ExcelExportAdapters,
): Promise<void> {
  const runtime = adapters ?? await createBrowserExcelAdapters()
  const workbook = runtime.buildWorkbook(draft, runtime.createWorkbook())
  const bytes = await workbook.xlsx.writeBuffer()
  runtime.download(
    new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${draft.documentNumber.trim() || '外贸单据'}.xlsx`,
  )
}
```

The production adapter dynamically imports ExcelJS, creates `new ExcelJS.Workbook()`, invokes `buildExcelWorkbook`, attaches a temporary anchor, clicks it, removes it, and revokes the Blob URL after one second.

- [ ] **Step 4: Remove the obsolete exporter**

Delete `buildWorkbookData()`, `exportWorkbook()`, and `printDocument()` with their old tests. Do not leave an alternate raw-data export path.

- [ ] **Step 5: Run the Excel service and build**

Run: `pnpm exec vitest --run src/services/excelExport.test.ts src/features/documents/excel && pnpm run build`  
Expected: PASS and Vite emits a lazy ExcelJS chunk.

- [ ] **Step 6: Commit the Excel service migration**

```bash
git add src/services src/features/documents/excel
git commit -m "feat: export one formal Excel worksheet"
```

---

### Task 9: Integrate independent PDF and Excel states

**Files:**
- Modify: `src/features/documents/DocumentWorkspace.tsx`
- Modify: `src/features/documents/DocumentWorkspace.test.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `DocumentPdfExportSurface`, `exportPdfDocument()`, and `exportExcelDocument()`.
- Produces: independent disabled/loading states and Chinese success/failure messages without changing the draft.

- [ ] **Step 1: Write failing PDF loading/success tests**

```tsx
vi.mock('../../services/pdfExport', () => ({ exportPdfDocument: vi.fn() }))
vi.mock('../../services/excelExport', () => ({ exportExcelDocument: vi.fn() }))

it('disables only PDF export while generating', async () => {
  let resolveExport!: () => void
  const pending = new Promise<void>((resolve) => { resolveExport = resolve })
  vi.mocked(exportPdfDocument).mockReturnValueOnce(pending)
  const user = userEvent.setup()
  render(<DocumentWorkspace />)
  await user.click(screen.getByRole('button', { name: '导出 PDF' }))
  expect(screen.getByRole('button', { name: '正在生成 PDF…' })).toBeDisabled()
  expect(screen.getByRole('button', { name: '导出 Excel' })).toBeEnabled()
  resolveExport()
  expect(await screen.findByText('PDF 已导出')).toBeInTheDocument()
})
```

- [ ] **Step 2: Write failing Excel success/failure tests**

```tsx
it('reports Excel success and restores the button', async () => {
  vi.mocked(exportExcelDocument).mockResolvedValueOnce(undefined)
  const user = userEvent.setup()
  render(<DocumentWorkspace />)
  await user.click(screen.getByRole('button', { name: '导出 Excel' }))
  expect(await screen.findByText('Excel 已导出')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '导出 Excel' })).toBeEnabled()
})

it('reports Excel failure without changing the draft', async () => {
  vi.mocked(exportExcelDocument).mockRejectedValueOnce(new Error('write failed'))
  const user = userEvent.setup()
  render(<DocumentWorkspace />)
  await user.type(screen.getByLabelText('买方公司名称'), '北辰户外用品有限公司')
  await user.click(screen.getByRole('button', { name: '导出 Excel' }))
  expect(await screen.findByText('Excel 生成失败，请检查内容后重试')).toBeInTheDocument()
  expect(screen.getByLabelText('买方公司名称')).toHaveValue('北辰户外用品有限公司')
})
```

- [ ] **Step 3: Run workspace tests and verify RED**

Run: `pnpm exec vitest --run src/features/documents/DocumentWorkspace.test.tsx`  
Expected: FAIL because the workspace still imports the obsolete exporter.

- [ ] **Step 4: Implement refs and independent handlers**

Add `pdfRootRef`, `isPdfExporting`, and `isExcelExporting`. Mount:

```tsx
<div ref={pdfRootRef}>
  <DocumentPdfExportSurface draft={draft} />
</div>
```

Use `handlePdfExport()` and `handleExcelExport()` with their own state guards, Chinese status messages, and `finally` cleanup. Bind each button only to its matching state.

- [ ] **Step 5: Remove browser print CSS**

Delete the obsolete `@media print` rules from `src/index.css`; do not change screen layout styles.

- [ ] **Step 6: Run the integrated regression suite**

Run: `pnpm exec vitest --run src/features/documents/DocumentWorkspace.test.tsx src/services/pdfExport.test.ts src/services/excelExport.test.ts`  
Expected: PASS.

- [ ] **Step 7: Commit workspace integration**

```bash
git add src/features/documents/DocumentWorkspace.tsx src/features/documents/DocumentWorkspace.test.tsx src/index.css
git commit -m "feat: integrate professional document exports"
```

---

### Task 10: Verify twelve artifacts and publish

**Files:**
- Create during QA: `output/pdf/QT-视觉验收.pdf`, `PI-视觉验收.pdf`, `SC-视觉验收.pdf`, `CI-视觉验收.pdf`, `PL-视觉验收.pdf`, `CD-视觉验收.pdf`
- Create during QA: `output/excel/QT-视觉验收.xlsx`, `PI-视觉验收.xlsx`, `SC-视觉验收.xlsx`, `CI-视觉验收.xlsx`, `PL-视觉验收.xlsx`, `CD-视觉验收.xlsx`
- Modify only if defects are found: files from Tasks 2–9

**Interfaces:**
- Consumes: completed browser UI, all six draft configurations, Poppler, and the spreadsheet render-and-inspect workflow.
- Produces: twelve verified local artifacts, a clean build, and an updated public site after explicit deployment approval.

- [ ] **Step 1: Run complete automated verification**

Run:

```bash
pnpm exec vitest --run
pnpm run build
pnpm audit --prod --audit-level high
git diff --check
```

Expected: all tests pass, build exits `0`, audit exits `0`, and no whitespace errors appear.

- [ ] **Step 2: Start a local production-like preview**

Run: `pnpm run dev -- --host 127.0.0.1`  
Expected: the six document buttons and both export actions are usable.

- [ ] **Step 3: Generate six representative PDFs**

Populate every available type-specific field and at least two product rows. Use enough CD rows to force two pages. Save exact filenames under `output/pdf/` and confirm `PDF 已导出` after each file.

- [ ] **Step 4: Verify PDF metadata and visual output**

Run `pdfinfo` for each PDF and render every page with `pdftoppm -r 144 -png`. Require A4 portrait, no browser header or URL, no clipped Chinese, no row split, repeated continuation headers, and final-page totals/terms.

- [ ] **Step 5: Generate six representative Excel workbooks**

Export the same draft data to `output/excel/`. Confirm every UI action reports `Excel 已导出`.

- [ ] **Step 6: Inspect and render every Excel workbook**

Use the bundled spreadsheet runtime to import each workbook. For each file verify:

- exactly one worksheet;
- correct sheet name, title, buyer/seller data, product values, and formulas;
- no `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?`, or `#N/A`;
- A4 portrait, one-page width, print area, repeated product header, and hidden gridlines;
- rendered title, table, totals, and footer text are not clipped or overlapping.

Render all six sheets to PNG. Compare QT hierarchy with `QT-202608-0295.xlsx` and PI PDF hierarchy with `PI-202608-6369.pdf`.

- [ ] **Step 7: Fix each visual defect with a failing test first**

Add the smallest model, render, workbook, or service test that reproduces the defect; observe RED; implement one correction; rerun GREEN; regenerate and re-render only the affected artifact before returning to the full suite.

- [ ] **Step 8: Run final verification**

Run:

```bash
pnpm exec vitest --run
pnpm run build
pnpm audit --prod --audit-level high
git diff --check
```

Expected: every command exits `0`.

- [ ] **Step 9: Commit final QA corrections when needed**

```bash
git add src package.json pnpm-lock.yaml
git commit -m "fix: polish six document export layouts"
```

Skip this commit only if visual QA required no source change. Do not commit generated QA files unless the repository already tracks `output/` artifacts.

- [ ] **Step 10: Request explicit approval and publish the validated commit**

After the user approves public deployment, package the exact build, save a new Sites version, deploy to the existing public access level, and poll until deployment reports `succeeded`.

- [ ] **Step 11: Verify the public product flow**

Open the deployed URL anonymously, create a short QT, download PDF and Excel, and verify both files open with the corrected layout. Report the public URL, test count, twelve-artifact QA result, production audit result, and the accepted simplification that PDF text is rasterized and not selectable.

---

## Plan Self-Review

- Spec coverage: Tasks 2–9 implement shared definitions, six PDF layouts, six one-sheet Excel layouts, three languages, three styles, formulas, A4 settings, local generation, independent status states, and obsolete-export removal. Task 10 covers twelve-artifact visual QA, audit, anonymous flow, and publication.
- Scope: The plan changes only PDF and Excel export plus directly supporting tests, styles, and dependencies. It excludes backend generation, logo upload, authentication, payment, CRM, real LLM extraction, and unsupported business fields.
- Security: Task 1 prevents shipping ExcelJS's vulnerable default transitive versions; Tasks 1 and 10 make production audit a blocking gate.
- Type consistency: Shared definitions feed both `PdfPageModel` and `ExcelDocumentLayout`; services expose `exportPdfDocument()` and `exportExcelDocument()`; workspace tests import the same names.
- Placeholder scan: No implementation placeholders or undefined future fields remain. Every task has exact files, signatures, failing tests, commands, expected results, and commit boundaries.
