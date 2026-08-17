# EdgeOne 人工收费与会员系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前可被浏览器修改的会员演示替换为 EdgeOne 服务端账号、72 小时试用、人工付款申请、三管理员后台和服务端权益校验。

**Architecture:** React 继续负责中文界面和本地单据；同源 `/api/*` 由 EdgeOne Node.js Cloud Functions 处理。账号、会话、订单、确认事件、权益和审计日志以 JSON/二进制对象保存在 EdgeOne Blob，关键读取使用强一致模式；确认订单使用 `onlyIfNew` 事件保证幂等，KV 只作为可选限频计数，不作为事实来源。

**Tech Stack:** React 18、TypeScript、Vite、Tailwind CSS、shadcn/ui、Vitest、Node.js 20 Cloud Functions、Node `crypto`、`@edgeone/pages-blob`、Node test runner。

## Global Constraints

- 所有用户可见文字使用简体中文；代码、接口字段和注释使用英文。
- 月付 59 元并增加 30 天；年付 499 元并增加 365 天；永久买断 1299 元且无到期时间。
- 每个新账号只获得一次服务端记录的连续 72 小时完整试用。
- 不接短信、邮箱、微信授权、微信支付 API 或支付宝支付 API。
- 支付由管理员人工核对；同一订单最多发放一次权益。
- 最多初始化三个管理员账号，所有管理员接口必须在服务端校验角色。
- 单据草稿、双方资料和产品数据继续只存浏览器，不上传服务器。
- 密码不保存明文；会话 Cookie 必须为 `HttpOnly`、`Secure`、`SameSite=Lax`。
- 账号和会员接口失败不能被误显示为“试用到期”。
- 不购买套餐、不绑定自定义域名；关闭 VPN 后匿名访问失败时不得宣称已经可收费上线。

---

### Task 1: 服务端会员合同与权益计算

**Files:**
- Create: `cloud-functions/_lib/plans.js`
- Create: `cloud-functions/_lib/entitlements.js`
- Create: `tests/server/entitlements.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `PLANS`, `getPlan(planId)`, `computeEntitlement({ user, confirmedOrders, now })`, `applyConfirmedOrder({ current, order, confirmedAt })`.
- Consumes: no earlier task.

- [ ] **Step 1: Write failing plan and entitlement tests**

```js
test('returns the approved prices and durations', () => {
  assert.deepEqual(PLANS.map(({ id, amountCny, durationDays }) => ({ id, amountCny, durationDays })), [
    { id: 'monthly', amountCny: 59, durationDays: 30 },
    { id: 'yearly', amountCny: 499, durationDays: 365 },
    { id: 'lifetime', amountCny: 1299, durationDays: null },
  ])
})

test('extends an unexpired annual entitlement from its current expiry', () => {
  const current = { plan: 'yearly', expiresAt: '2026-12-31T00:00:00.000Z', isLifetime: false }
  const next = applyConfirmedOrder({ current, order: { plan: 'yearly' }, confirmedAt: '2026-08-17T00:00:00.000Z' })
  assert.equal(next.expiresAt, '2027-12-31T00:00:00.000Z')
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/server/entitlements.test.mjs`

Expected: FAIL because `plans.js` and `entitlements.js` do not exist.

- [ ] **Step 3: Implement the minimal contract and calculation**

Use UTC timestamps, add exact calendar days as `durationDays * 86_400_000`, start expired memberships from `confirmedAt`, and make lifetime dominate every later order.

- [ ] **Step 4: Add server test scripts and verify GREEN**

Add `"test:server": "node --test tests/server/*.test.mjs"` and `"test:all": "vitest run && npm run test:server"`.

Run: `npm run test:server`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json cloud-functions/_lib/plans.js cloud-functions/_lib/entitlements.js tests/server/entitlements.test.mjs
git commit -m "feat: define server membership plans"
```

### Task 2: Blob 仓库、密码和会话安全原语

**Files:**
- Create: `cloud-functions/_lib/blobRepository.js`
- Create: `cloud-functions/_lib/security.js`
- Create: `tests/server/memoryRepository.mjs`
- Create: `tests/server/security.test.mjs`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: `createBlobRepository(store)`, `hashPassword(password)`, `verifyPassword(password, encoded)`, `createSessionToken()`, `hashToken(token)`, `parseSessionCookie(request)`, `sessionCookie(token)`, `expiredSessionCookie()`.
- Repository interface: `getJson(key)`, `setJson(key, value, options?)`, `setBinary(key, bytes, options?)`, `getBinary(key)`, `delete(key)`, `list(prefix)`.
- Consumes: Node.js 20 `crypto`; `@edgeone/pages-blob` only in the EdgeOne adapter.

- [ ] **Step 1: Write failing security tests**

```js
test('verifies the right password and rejects another password', async () => {
  const encoded = await hashPassword('correct-horse-2026')
  assert.equal(await verifyPassword('correct-horse-2026', encoded), true)
  assert.equal(await verifyPassword('wrong-password', encoded), false)
  assert.notEqual(encoded, 'correct-horse-2026')
})

test('creates a protected seven-day cookie', () => {
  const value = sessionCookie('token-value')
  assert.match(value, /HttpOnly/)
  assert.match(value, /Secure/)
  assert.match(value, /SameSite=Lax/)
  assert.match(value, /Max-Age=604800/)
})
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/server/security.test.mjs`

Expected: FAIL because security exports do not exist.

- [ ] **Step 3: Implement security primitives**

Use asynchronous `scrypt` with a 16-byte random salt and 64-byte derived key. Encode as `scrypt$<salt-base64url>$<hash-base64url>`, validate format before deriving, and compare with `timingSafeEqual`. Hash session tokens with SHA-256 before storage.

- [ ] **Step 4: Implement Blob and in-memory repositories**

`createBlobRepository` must instantiate Blob with `{ consistency: 'strong' }`. `setJson(..., { onlyIfNew: true })` must forward the condition. The in-memory repository must throw an error with code `ALREADY_EXISTS` on a conflicting conditional write so idempotency tests exercise real repository behavior.

- [ ] **Step 5: Install the official Blob SDK and verify GREEN**

Run: `pnpm add @edgeone/pages-blob`

Run: `npm run test:server`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml cloud-functions/_lib/blobRepository.js cloud-functions/_lib/security.js tests/server/memoryRepository.mjs tests/server/security.test.mjs
git commit -m "feat: add secure membership storage primitives"
```

### Task 3: 注册、登录、会话和管理员初始化 API

**Files:**
- Create: `cloud-functions/_lib/http.js`
- Create: `cloud-functions/_lib/authService.js`
- Create: `cloud-functions/_lib/rateLimitService.js`
- Create: `cloud-functions/_lib/adminSeed.js`
- Create: `cloud-functions/_lib/api.js`
- Create: `cloud-functions/api/[[default]].js`
- Create: `tests/server/authApi.test.mjs`

**Interfaces:**
- Produces: same-origin API routes `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/password`.
- Produces: `createApi({ repository, env, now, uuid }) => (request, context) => Promise<Response>`.
- Consumes: Task 1 plans/entitlements and Task 2 repository/security exports.

- [ ] **Step 1: Write failing registration and login tests**

Test these observable behaviors with real `Request` and `Response` objects:

```js
test('registers a user with one server-side 72 hour trial', async () => {
  const response = await api(jsonRequest('/api/auth/register', 'POST', {
    username: 'KyrieUser', password: 'secure-pass-2026', contact: 'kyrie_wechat',
  }))
  assert.equal(response.status, 201)
  const body = await response.json()
  assert.equal(body.entitlement.phase, 'trialing')
  assert.equal(body.entitlement.trialEndsAt, '2026-08-20T00:00:00.000Z')
  assert.match(response.headers.get('set-cookie'), /kyrie_session=/)
})

test('does not reveal whether a username exists on failed login', async () => {
  const missing = await api(jsonRequest('/api/auth/login', 'POST', { username: 'missing', password: 'bad-pass-2026' }))
  const wrong = await api(jsonRequest('/api/auth/login', 'POST', { username: 'KyrieUser', password: 'bad-pass-2026' }))
  assert.deepEqual(await missing.json(), await wrong.json())
})
```

Also cover duplicate usernames ignoring case, short passwords, invalid Origin, expired sessions, logout deletion, password change invalidating other sessions, suspended accounts, three registration attempts per IP per hour, five login failures per account-and-IP per minute, and admin routes not yet existing returning 404.

- [ ] **Step 2: Run auth tests and verify RED**

Run: `node --test tests/server/authApi.test.mjs`

Expected: FAIL because `createApi` does not exist.

- [ ] **Step 3: Implement HTTP helpers and auth service**

Normalize usernames with `trim().toLocaleLowerCase('en-US')`; store each user at `v1/users/by-name/<sha256>.json`. Registration uses `onlyIfNew`. Store sessions at `v1/sessions/<tokenHash>.json`. Return all user-facing errors in Simplified Chinese and add `Cache-Control: no-store` to API responses.

Rate-limit keys contain SHA-256 hashes rather than raw IP addresses. Store one strongly read counter object per scope and time window; a counter contains only `count` and `resetsAt`. EdgeOne's platform rule remains the outer protection layer because object-storage counters cannot provide strict distributed atomic increments.

- [ ] **Step 4: Implement three-admin seed**

Read `ADMIN_1_USERNAME`, `ADMIN_1_PASSWORD`, `ADMIN_1_DISPLAY_NAME` through the corresponding `ADMIN_3_*` values. On the first API request, create missing admins with `role: 'admin'`, `passwordResetRequired: true`, no trial expiry, and conditional writes. Never return or log seed passwords.

- [ ] **Step 5: Implement EdgeOne catch-all entry**

`cloud-functions/api/[[default]].js` gets store `kyrie-membership-v1`, creates the Blob repository, passes `context.env` and `context.clientIp`, and exports `onRequest`.

- [ ] **Step 6: Verify GREEN and commit**

Run: `npm run test:server`

Expected: PASS.

```bash
git add cloud-functions tests/server/authApi.test.mjs
git commit -m "feat: add server account and session API"
```

### Task 4: 付款申请、幂等开通和管理员 API

**Files:**
- Create: `cloud-functions/_lib/billingService.js`
- Create: `cloud-functions/_lib/adminService.js`
- Create: `tests/server/billingApi.test.mjs`
- Modify: `cloud-functions/_lib/api.js`

**Interfaces:**
- Produces: `GET /api/plans`, `POST /api/orders`, `GET /api/orders/me`, `GET /api/payment/qr/:method`.
- Produces: `GET /api/admin/users`, `GET /api/admin/orders`, `POST /api/admin/orders/:id/confirm`, `POST /api/admin/orders/:id/reject`, `POST /api/admin/users/:id/entitlement`, `POST /api/admin/users/:id/status`, `POST /api/admin/users/:id/reset-password`, `GET /api/admin/audit`, `POST /api/admin/payment-settings`.
- Consumes: Tasks 1–3.

- [ ] **Step 1: Write failing billing and authorization tests**

Cover approved prices, authenticated order creation, amount coming from server plans rather than request JSON, order ownership, anonymous rejection, normal-user admin rejection, admin list access, reject flow, suspension, temporary password, and Simplified Chinese errors.

```js
test('confirms one order only once and extends entitlement once', async () => {
  const first = await adminApi(confirmRequest(orderId))
  const second = await adminApi(confirmRequest(orderId))
  assert.equal(first.status, 200)
  assert.equal(second.status, 409)
  const snapshot = await authApi(meRequest(userCookie))
  assert.equal((await snapshot.json()).entitlement.expiresAt, '2026-09-16T00:00:00.000Z')
})
```

- [ ] **Step 2: Run billing tests and verify RED**

Run: `node --test tests/server/billingApi.test.mjs`

Expected: FAIL because billing routes do not exist.

- [ ] **Step 3: Implement order and confirmation events**

Create order IDs as `KTB-YYYYMMDD-<8 uppercase characters>`. Store orders at `v1/orders/<orderId>.json` and create a per-user order index. Confirmation writes `v1/confirmed-orders-by-user/<userId>/<orderId>.json` with `onlyIfNew`; entitlement reads list only that user's event prefix and recompute deterministically, avoiding both global scans and cache invalidation.

- [ ] **Step 4: Implement admin operations and audit events**

Every admin mutation writes `v1/audit/<ISO timestamp>-<uuid>.json` containing administrator ID, action, target ID, before/after summary, and timestamp. Do not include passwords, Cookie values or complete contact strings.

- [ ] **Step 5: Implement payment settings upload**

Accept `multipart/form-data` with `method` (`wechat` or `alipay`), an image limited to PNG/JPEG/WebP and 2 MB, and optional public customer-service contact. Save QR bytes under `v1/payment-qr/<method>` and serve them only through the authenticated same-origin API. When one or both QR codes are absent, `POST /api/orders` returns “收款方式配置中，请稍后再试”。

- [ ] **Step 6: Verify GREEN and commit**

Run: `npm run test:server`

Expected: PASS.

```bash
git add cloud-functions/_lib cloud-functions/api tests/server/billingApi.test.mjs
git commit -m "feat: add manual billing and admin API"
```

### Task 5: React API 客户端与会员状态机

**Files:**
- Create: `src/features/membership/types.ts`
- Create: `src/features/membership/membershipApi.ts`
- Create: `src/features/membership/MembershipContext.test.tsx`
- Modify: `src/features/membership/MembershipContext.tsx`
- Modify: `src/features/membership/TrialBanner.tsx`
- Modify: `src/services/storage.ts`
- Delete: `src/domain/trial.ts`
- Delete: `src/domain/trial.test.ts`

**Interfaces:**
- Produces: `MembershipSnapshot`, `UserSummary`, `PlanSummary`, `PaymentOrder`, `membershipApi` and `MembershipContextValue` with `snapshot`, `loading`, `error`, `refresh()`, `logout()`.
- Consumes: Task 3 `GET /api/auth/me` and logout API.

- [ ] **Step 1: Write failing provider tests**

Test anonymous, trialing, expired, active, admin and unavailable states using an injected API object. Verify a network failure renders `phase: 'unavailable'` and never `phase: 'expired'`. Verify no trial or membership key is written to `localStorage`.

- [ ] **Step 2: Run provider tests and verify RED**

Run: `npm test -- src/features/membership/MembershipContext.test.tsx --run`

Expected: FAIL because the provider still reads local membership state.

- [ ] **Step 3: Implement typed API and provider**

All requests use relative URLs, `credentials: 'same-origin'`, JSON validation at the boundary, and an `AbortController` timeout. Keep the default API object stable at module scope and avoid effect dependency waterfalls.

- [ ] **Step 4: Remove obsolete local membership keys**

Keep only document drafts and party templates in `storage.ts`. Do not clear users' existing document data.

- [ ] **Step 5: Verify GREEN and commit**

Run: `npm test -- src/features/membership/MembershipContext.test.tsx --run`

Run: `npm test -- src/services/storage.test.ts --run`

Expected: PASS.

```bash
git add src/features/membership src/services/storage.ts src/domain/trial.ts src/domain/trial.test.ts
git commit -m "feat: use server membership state"
```

### Task 6: 注册登录、付费墙和账号入口

**Files:**
- Create: `src/pages/AuthPage.tsx`
- Create: `src/pages/AuthPage.test.tsx`
- Create: `src/features/membership/AccountMenu.tsx`
- Create: `src/features/membership/ProtectedFeature.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Produces routes `/login` and `/register`; header login/account controls; protected states for loading, anonymous, expired, unavailable and active.
- Consumes: Task 5 membership context and Task 3 auth endpoints.

- [ ] **Step 1: Write failing browser-component tests**

Verify every visible string is Chinese, registration asks for username/password/contact, login error is generic, successful auth refreshes context, expired users see plan CTA, and unavailable membership shows retry rather than a payment wall.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/pages/AuthPage.test.tsx src/App.test.tsx --run`

Expected: FAIL because auth routes and account controls do not exist.

- [ ] **Step 3: Implement auth forms and protected states**

Use accessible labels, native autocomplete values (`username`, `current-password`, `new-password`), disabled loading buttons, inline Chinese errors and no English placeholders. Keep form submission inside event handlers and do not mirror form fields into effects.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- src/pages/AuthPage.test.tsx src/App.test.tsx --run`

Expected: PASS.

```bash
git add src/App.tsx src/App.test.tsx src/pages/AuthPage.tsx src/pages/AuthPage.test.tsx src/features/membership
git commit -m "feat: add account access and secure paywall"
```

### Task 7: 真实价格与人工付款页面

**Files:**
- Create: `src/pages/CheckoutPage.tsx`
- Create: `src/pages/CheckoutPage.test.tsx`
- Modify: `src/pages/MembershipPage.tsx`
- Modify: `src/features/membership/Membership.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces route `/membership/checkout/:planId` and real plan CTAs.
- Consumes: Task 4 plan, QR and order endpoints; Task 5 current account.

- [ ] **Step 1: Write failing plan and checkout tests**

Verify the page displays `¥59/月`, `¥499/年`, `¥1299/永久`, removes all demo activation controls, explains the perpetual AI-cost boundary, creates an order, displays its exact server amount and ID, switches between微信/支付宝收款码, and submits付款方式、付款时间、付款人信息尾号.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/features/membership/Membership.test.tsx src/pages/CheckoutPage.test.tsx --run`

Expected: FAIL because old prices and demo controls remain.

- [ ] **Step 3: Implement plan and checkout UI**

Load plan data in parallel with the current user's orders where both are needed. Do not import QR image bytes into the main bundle; use the authenticated API URL only when the selected payment method is visible.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- src/features/membership/Membership.test.tsx src/pages/CheckoutPage.test.tsx --run`

Expected: PASS.

```bash
git add src/App.tsx src/pages/MembershipPage.tsx src/pages/CheckoutPage.tsx src/pages/CheckoutPage.test.tsx src/features/membership/Membership.test.tsx
git commit -m "feat: add manual payment checkout"
```

### Task 8: 三管理员操作后台

**Files:**
- Create: `src/pages/AdminPage.tsx`
- Create: `src/pages/AdminPage.test.tsx`
- Create: `src/features/admin/AdminUsersPanel.tsx`
- Create: `src/features/admin/AdminOrdersPanel.tsx`
- Create: `src/features/admin/AdminPaymentSettings.tsx`
- Create: `src/features/admin/AdminAuditPanel.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces route `/admin` with role guard, searchable users, order review, entitlement/status actions, temporary-password action, QR upload and audit list.
- Consumes: Task 4 admin endpoints and Task 5 membership role.

- [ ] **Step 1: Write failing admin tests**

Verify normal users receive “无权访问管理员后台”, admins can filter users, confirm an order only after a details confirmation dialog, rejection requires a note, temporary password is shown once, QR upload validates file type/size, and all buttons have Chinese accessible names.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/pages/AdminPage.test.tsx --run`

Expected: FAIL because admin page does not exist.

- [ ] **Step 3: Implement focused panels**

Keep each panel responsible for one API family. Load independent users/orders/settings/audit requests with `Promise.all`; memoize filtered user rows; avoid defining row components inside the page component.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test -- src/pages/AdminPage.test.tsx --run`

Expected: PASS.

```bash
git add src/App.tsx src/pages/AdminPage.tsx src/pages/AdminPage.test.tsx src/features/admin
git commit -m "feat: add manual membership admin console"
```

### Task 9: EdgeOne 配置、隐私说明和本地运行文档

**Files:**
- Create: `.env.edgeone.example`
- Create: `docs/operations/edgeone-membership-runbook.md`
- Create: `src/pages/HomePage.test.tsx`
- Modify: `README.md`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/MembershipPage.tsx`

**Interfaces:**
- Produces: exact deployment variables, admin bootstrap sequence, QR configuration sequence, rollback/export steps and privacy copy.
- Consumes: all earlier tasks.

- [ ] **Step 1: Write a failing privacy wording test**

Render the homepage and verify it distinguishes account data from document content:

```tsx
expect(screen.getByText('账号与会员状态安全保存在服务器')).toBeInTheDocument()
expect(screen.getByText('单据内容仍在本地处理，不上传云端')).toBeInTheDocument()
```

Run: `npm test -- src/pages/HomePage.test.tsx --run`

Expected: FAIL because the current page claims all processing is local.

- [ ] **Step 2: Document exact environment variables**

Document `ADMIN_1_USERNAME`, `ADMIN_1_PASSWORD`, `ADMIN_1_DISPLAY_NAME` through admin 3. The implementation uses random opaque session tokens stored only as server-side hashes, so no `SESSION_SECRET` is required; customer support contact is configured from the administrator page rather than a `PUBLIC_SUPPORT_CONTACT` environment variable. State that administrator passwords must be entered in EdgeOne settings and never committed.

- [ ] **Step 3: Update public privacy and product wording**

Change “本地处理、不上传云端” to the precise statement: account and membership status are stored on the server; document drafts and business document contents remain local and are not uploaded. Remove any claim that the entire application performs no server processing.

- [ ] **Step 4: Verify build and commit**

Run: `npm test -- src/pages/HomePage.test.tsx --run`

Run: `npm run build`

Expected: TypeScript, Vite and hosting layout checks PASS.

```bash
git add .env.edgeone.example README.md docs/operations src/pages/HomePage.tsx src/pages/HomePage.test.tsx src/pages/MembershipPage.tsx
git commit -m "docs: add EdgeOne membership operations"
```

### Task 10: 全量回归、安全检查与线上验收

**Files:**
- Create: `docs/qa/2026-08-17-membership-billing-qa.md`
- Modify only if a failing test or review finding requires a focused fix with its own failing regression test.

**Interfaces:**
- Produces: evidence for tests, build, UI, security boundaries and anonymous China-network access.
- Consumes: completed application and EdgeOne deployment.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm run test:all`

Run: `npm run build`

Expected: all Vitest, Node server tests, TypeScript, Vite build and hosting checks PASS with no warnings requiring action.

- [ ] **Step 2: Run targeted security review**

Inspect password handling, Cookie attributes, Origin validation, authorization on every admin endpoint, order amount source, `onlyIfNew` idempotency, logging redaction, QR file validation and membership network-failure behavior. Add a failing regression test before every code correction.

- [ ] **Step 3: Run React and UI review**

Check for sequential independent fetches, unstable effect dependencies, large eager imports, nested component definitions, English user-visible strings, missing labels, keyboard traps, mobile overflow and inaccessible status messages. Add a failing component test before behavior corrections.

- [ ] **Step 4: Deploy to EdgeOne Makers**

Log in through the Tencent Cloud page already open in Safari, create a free project, configure `dist/client` as output, enter environment variables, deploy, then initialize the three admins by signing in and changing each temporary password. Do not purchase a plan or bind a custom domain.

- [ ] **Step 5: Configure payment QR codes**

Use the admin “收款设置” panel to upload the user's微信和支付宝收款码. Until both are present, confirm that the user checkout cannot submit a payment order.

- [ ] **Step 6: Verify real flows online**

Create a normal test account, verify the 72-hour server trial, create a 59 元 order, confirm it from an admin account, verify the user receives 30 days, and verify a repeated confirmation returns the same result without extending again. Repeat the display check for 499 元 and 1299 元 without sending real payments.

- [ ] **Step 7: Verify anonymous China-network access**

Turn off VPN only with the user's action-time confirmation, open the free URL in a private window, and test homepage, registration, login, API, PDF and Excel. If the URL requires login, returns 401, expires or is unstable, record the deployment as unsuitable for charging and use the documented fallback decision instead of claiming launch readiness.

- [ ] **Step 8: Record evidence and final commit**

Write exact command results, tested routes, browser/device sizes, public URL, access result, remaining operational inputs and any simplified modules in the QA report.

```bash
git add docs/qa/2026-08-17-membership-billing-qa.md
git commit -m "test: verify membership billing release"
```
