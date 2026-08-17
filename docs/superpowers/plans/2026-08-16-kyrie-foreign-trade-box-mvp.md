# Kyrie的外贸盒子 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a responsive Chinese-language foreign-trade toolkit MVP with six local-first document workflows, mocked AI autofill, practical trade tools, and a simple three-day trial/paywall prototype.

**Architecture:** A React Router single-page application separates shared domain logic from route-level features. Typed document data is the single source for form state, previews, local drafts, and exports; platform adapters isolate storage, rates, mocked AI, and file generation so they can later be replaced by Supabase, payment services, and an LLM backend.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui-style Radix components, Vitest, Testing Library, SheetJS, Lucide React.

## Global Constraints

- Every application UI string, label, message, and default sample value is Simplified Chinese.
- Code, identifiers, test names, and comments remain English.
- Six document types are required: QT, PI, SC, CI, PL, and CD.
- The application remains fully usable without AI.
- Product data and drafts stay in the browser; remote access is limited to the exchange-rate request.
- Real authentication, payment, LLM extraction, CRM, and print-grade PDF fidelity remain out of scope.
- The trial lasts exactly 72 hours from the first recorded visit.
- Three local administrator demo seats are reserved; they are not a security boundary.

---

## File Map

- `package.json`, Vite/Tailwind/TypeScript configs: runtime, build, styling, and tests.
- `src/domain/documents.ts`: document types, draft factories, totals, and labels.
- `src/domain/trial.ts`: trial and membership state calculation.
- `src/domain/time.ts`: city definitions and working-hour calculation.
- `src/services/storage.ts`: guarded localStorage access and draft keys.
- `src/services/aiParser.ts`: asynchronous mocked extraction contract.
- `src/services/rates.ts`: remote rate loading and static fallback.
- `src/services/export.ts`: print/PDF handoff and workbook export.
- `src/components/ui/*`: focused shadcn/ui-style primitives.
- `src/components/layout/*`: header, mobile navigation, page shell, privacy banner.
- `src/features/documents/*`: selector, editor sections, item table, preview, AI panel.
- `src/features/toolbox/*`: clocks, converter, shortcut cards.
- `src/features/membership/*`: trial status, plan cards, admin demo, paywall.
- `src/pages/*`: four top-level routes.
- `src/test/*`: setup and behavior tests.

---

### Task 1: Create the runnable React foundation

**Files:**
- Create: `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`
- Create: `tailwind.config.ts`, `postcss.config.js`, `src/index.css`
- Create: `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`
- Create: `src/test/setup.ts`, `src/App.test.tsx`

**Interfaces:**
- Produces: `App(): JSX.Element`, shared Tailwind tokens, and `npm run dev|build|test`.

- [ ] **Step 1: Write the failing shell test**

```tsx
it('renders the Chinese product navigation', () => {
  render(<App />)
  expect(screen.getByText('Kyrie的外贸盒子')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '外贸单据中心' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Install dependencies and run `npm test -- --run`**

Expected: FAIL because `App` and the application foundation do not exist.

- [ ] **Step 3: Add the Vite entrypoint, router shell, typography, and green/blue design tokens**

Implement a minimal `App` with four Chinese navigation links and route placeholders; do not implement feature content yet.

- [ ] **Step 4: Run `npm test -- --run` and `npm run build`**

Expected: both commands pass.

- [ ] **Step 5: Commit**

```bash
git add package.json index.html vite.config.ts tsconfig*.json tailwind.config.ts postcss.config.js src
git commit -m "feat: scaffold Chinese trade toolkit"
```

### Task 2: Implement tested document, trial, storage, and time domains

**Files:**
- Create: `src/domain/documents.ts`, `src/domain/documents.test.ts`
- Create: `src/domain/trial.ts`, `src/domain/trial.test.ts`
- Create: `src/domain/time.ts`, `src/domain/time.test.ts`
- Create: `src/services/storage.ts`, `src/services/storage.test.ts`

**Interfaces:**
- Produces: `DocumentType`, `DocumentDraft`, `LineItem`, `createEmptyDraft(type)`, `calculateLineAmount(item)`, `calculateTotals(items)`.
- Produces: `getTrialStatus(startedAt, now, membership): TrialStatus`.
- Produces: `isBusinessHour(timeZone, now): boolean` and `TRADE_CITIES`.
- Produces: `loadDraft(type)`, `saveDraft(draft)`, `clearDraft(type)`, `loadPartyTemplates()`, `savePartyTemplate(template)`.

- [ ] **Step 1: Write failing tests for six draft types and decimal-safe totals**

```ts
it('creates every supported document type', () => {
  expect(DOCUMENT_TYPES.map(item => item.code)).toEqual(['QT', 'PI', 'SC', 'CI', 'PL', 'CD'])
})

it('calculates line and shipment totals', () => {
  expect(calculateTotals([{ quantity: 3, unitPrice: 12.5, netWeight: 2, grossWeight: 2.4, volume: 0.03 } as LineItem]))
    .toMatchObject({ amount: 37.5, netWeight: 6, grossWeight: 7.2, volume: 0.09 })
})
```

- [ ] **Step 2: Run the domain test files**

Expected: FAIL because the exports are missing.

- [ ] **Step 3: Implement the typed draft factory and pure calculations**

Keep defaults Chinese, use stable IDs, and round money to two decimal places.

- [ ] **Step 4: Write and verify failing trial, time-zone, and storage tests**

Cover 71:59:59 as active, 72:00:00 as expired, paid membership override, weekday business hours, weekend closure, draft-key isolation, and unavailable storage.

- [ ] **Step 5: Implement the smallest domain and storage functions that pass**

Storage failures return typed results instead of throwing into the UI.

- [ ] **Step 6: Run `npm test -- --run`**

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/domain src/services/storage*
git commit -m "feat: add local-first trade document domain"
```

### Task 3: Build the application shell, homepage, trial, and membership prototype

**Files:**
- Create: `src/lib/utils.ts`
- Create: `src/components/ui/button.tsx`, `card.tsx`, `input.tsx`, `textarea.tsx`, `badge.tsx`, `tabs.tsx`, `select.tsx`, `dialog.tsx`
- Create: `src/components/layout/AppHeader.tsx`, `PageShell.tsx`, `PrivacyBanner.tsx`
- Create: `src/features/membership/TrialBanner.tsx`, `PlanCards.tsx`, `AdminSeats.tsx`, `Paywall.tsx`
- Create: `src/pages/HomePage.tsx`, `src/pages/MembershipPage.tsx`
- Modify: `src/App.tsx`
- Test: `src/features/membership/Membership.test.tsx`

**Interfaces:**
- Consumes: `getTrialStatus` from Task 2.
- Produces: `useMembership()` context with `status`, `activateDemo(plan)`, `expireTrialDemo()`, and `resetTrialDemo()`.

- [ ] **Step 1: Write failing membership UI tests**

Assert that the trial message, three plans, “演示功能，暂未连接真实支付”, and three administrator seats render; assert that expired state blocks feature content until a demo plan is activated.

- [ ] **Step 2: Run the membership test and confirm expected failure**

- [ ] **Step 3: Implement shadcn/ui-style primitives and membership context**

Use Radix only where keyboard behavior matters. Keep admin seats named “管理员席位一/二/三” with “演示管理员” status.

- [ ] **Step 4: Build the homepage and membership page**

Homepage sections: hero, six document cards, local privacy promise, AI workflow, toolbox preview, and pricing call-to-action.

- [ ] **Step 5: Run focused tests and full suite**

Expected: PASS with no React warnings.

- [ ] **Step 6: Commit**

```bash
git add src/components src/features/membership src/pages src/App.tsx src/lib
git commit -m "feat: add trial and membership experience"
```

### Task 4: Build the six-document editor and live preview

**Files:**
- Create: `src/features/documents/DocumentWorkspace.tsx`
- Create: `src/features/documents/DocumentTypeSelector.tsx`
- Create: `src/features/documents/AIPastePanel.tsx`
- Create: `src/features/documents/PartySection.tsx`
- Create: `src/features/documents/LineItemsEditor.tsx`
- Create: `src/features/documents/TradeTermsSection.tsx`
- Create: `src/features/documents/BankCustomsSection.tsx`
- Create: `src/features/documents/DocumentPreview.tsx`
- Create: `src/features/documents/DocumentWorkspace.test.tsx`
- Create: `src/pages/DocumentCenterPage.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `DocumentDraft`, factories, totals, and storage from Task 2.
- Produces: a controlled `DocumentWorkspace` that updates one normalized draft and persists by type.

- [ ] **Step 1: Write failing tests for type switching, line totals, draft isolation, and preview updates**

```tsx
it('keeps quotation and packing-list drafts isolated', async () => {
  // Fill quotation buyer name, switch to packing list, and verify the field is blank.
})
```

- [ ] **Step 2: Run the focused test and verify the missing workspace failure**

- [ ] **Step 3: Implement the document selector and shared form sections**

Expose every required shared field and conditional fields for quotation validity, contract notes, invoice number, marks, shipment totals, and customs declaration elements.

- [ ] **Step 4: Implement the A4 live preview and language/layout switches**

The application chrome stays Chinese. Document headings and column labels render from Chinese, English, or paired dictionaries according to the selected mode.

- [ ] **Step 5: Add template saving, autosave state, blank-document creation, and clear confirmation**

Show “已自动保存” only after a successful write; preserve editing when storage is unavailable.

- [ ] **Step 6: Run tests and build**

Expected: all six types are reachable and the build passes.

- [ ] **Step 7: Commit**

```bash
git add src/features/documents src/pages/DocumentCenterPage.tsx src/App.tsx
git commit -m "feat: build six-document creation workspace"
```

### Task 5: Add mocked AI autofill without weakening manual editing

**Files:**
- Create: `src/services/aiParser.ts`, `src/services/aiParser.test.ts`
- Modify: `src/features/documents/AIPastePanel.tsx`, `DocumentWorkspace.tsx`
- Test: `src/features/documents/AIPastePanel.test.tsx`

**Interfaces:**
- Produces: `parseTradeText(text): Promise<ParseResult>` where `ParseResult` contains `patch`, `reviewFields`, and `summary`.

- [ ] **Step 1: Write a failing parser test using the Chinese sample inquiry**

```ts
const sample = '客户：北辰户外用品有限公司，500个硅胶徽章，单价2.80美元，FOB深圳，见提单副本付清。'
expect((await parseTradeText(sample)).patch.items[0]).toMatchObject({ quantity: 500, unitPrice: 2.8 })
```

- [ ] **Step 2: Verify RED, then implement the asynchronous mocked parser**

Use a short deterministic delay. Unknown text returns no destructive patch and marks missing essentials for review.

- [ ] **Step 3: Write and implement loading, result, and review-highlight UI behavior**

- [ ] **Step 4: Run focused and full tests**

- [ ] **Step 5: Commit**

```bash
git add src/services/aiParser* src/features/documents
git commit -m "feat: add mocked AI document autofill"
```

### Task 6: Build the trade toolbox with online/offline rates

**Files:**
- Create: `src/services/rates.ts`, `src/services/rates.test.ts`
- Create: `src/features/toolbox/WorldClockPanel.tsx`
- Create: `src/features/toolbox/ExchangeConverter.tsx`
- Create: `src/features/toolbox/ToolShortcuts.tsx`
- Create: `src/pages/ToolboxPage.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `TRADE_CITIES` and `isBusinessHour` from Task 2.
- Produces: `loadRates(base, fetcher?): Promise<RateResult>` with `source: '在线' | '离线参考'` and `asOf`.

- [ ] **Step 1: Write failing rate tests for valid API data, network failure, and malformed response**

- [ ] **Step 2: Verify RED and implement remote fetch with static dated fallback**

Use `https://api.frankfurter.app/latest` with a timeout; never label fallback data as real-time.

- [ ] **Step 3: Build the world clock, converter, and five shortcut cards**

Render at least 20 cities and distinguish “工作时间” from “非工作时间”.

- [ ] **Step 4: Run tests and build**

- [ ] **Step 5: Commit**

```bash
git add src/services/rates* src/features/toolbox src/pages/ToolboxPage.tsx src/App.tsx
git commit -m "feat: add world clocks and exchange tools"
```

### Task 7: Add PDF and Excel export paths

**Files:**
- Create: `src/services/export.ts`, `src/services/export.test.ts`
- Create: `src/features/documents/ExportActions.tsx`
- Modify: `src/features/documents/DocumentWorkspace.tsx`, `DocumentPreview.tsx`, `src/index.css`

**Interfaces:**
- Produces: `buildWorkbookData(draft): ExportSheet[]`, `exportWorkbook(draft): void`, and `printDocument(): void`.

- [ ] **Step 1: Write a failing workbook-data test**

Assert Chinese sheet names, seller/buyer metadata, product rows, totals, trade terms, and bank/customs details.

- [ ] **Step 2: Verify RED and implement deterministic workbook data**

- [ ] **Step 3: Wire SheetJS download and browser print-to-PDF**

The “导出 PDF” button opens the browser print flow; print CSS hides application chrome and prints only the A4 preview.

- [ ] **Step 4: Run tests and manually open one generated workbook**

- [ ] **Step 5: Commit**

```bash
git add src/services/export* src/features/documents src/index.css
git commit -m "feat: export trade documents to PDF and Excel"
```

### Task 8: Verify responsive UX and publish a preview

**Files:**
- Modify: only files required by discovered verification defects
- Create: `README.md`

**Interfaces:**
- Produces: runnable production build and a user-accessible preview URL.

- [ ] **Step 1: Run static and automated verification**

```bash
npm test -- --run
npm run build
```

- [ ] **Step 2: Run the production preview and browser acceptance pass**

Check desktop at 1440×900, tablet at 768×1024, and mobile at 390×844. Exercise navigation, all six document types, autosave, AI fill, clocks, exchange fallback, trial/paywall/admin states, and exports. Confirm no blocking console errors.

- [ ] **Step 3: Fix each discovered defect with a failing regression test first**

- [ ] **Step 4: Write the README**

Document startup commands, implemented features, simplifications, and the backend/library boundaries for real LLM, secure payment/auth, print-grade PDF, and Excel.

- [ ] **Step 5: Re-run the full verification commands**

Expected: tests and build pass with clean output.

- [ ] **Step 6: Publish and verify anonymous access**

Deploy the production build with the available hosting workflow, open the resulting URL in a signed-out context, and verify the homepage plus direct route access.

- [ ] **Step 7: Commit**

```bash
git add README.md src
git commit -m "docs: verify and document MVP delivery"
```
