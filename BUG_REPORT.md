# Bug Report — Expense Tracker ShyBlack (finora v1.1.0)

- **Repository root:** `shyBlackMoneyTracker`
- **App:** `shyblack/` — React 18.2 + Vite 4.5 + Capacitor 5.7 (Android)
- **Audit date:** 2026-08-02
- **Method:** Static review of all source (44 pages, 28 components, 72 utils, FinanceContext), automated agent review of every page/component/test file, and line-level verification of each finding.

All line numbers verified against the current working tree.

---

## Severity Legend

| Severity | Meaning |
|----------|---------|
| **P0 — Critical** | Crash, data loss, or release-blocking. Must fix before shipping. |
| **P1 — High** | Incorrect behaviour or destructive UX affecting real users. |
| **P2 — Medium** | Correctness/consistency issues, edge cases, accessibility. |
| **P3 — Low** | Cosmetic / hygiene. |

---

## P0 — Critical

### BUG-001 — ReportsPage crashes: `setShowExportPreview` is not defined
- **File:** `shyblack/src/pages/ReportsPage.jsx:315`
- **Code:**
  ```jsx
  onClick={() => { setExportScope(es.id); setShowExportPreview(true) }}
  ```
- **Evidence:** The component declares state at lines 48–67 (`selectedMonth`, `pdfDataUri`, `exportScope`, …). There is **no** `showExportPreview` / `setShowExportPreview` declaration anywhere in the file (verified by full-file scan). No `useState` exists for it and it is not imported.
- **Impact:** Any tap on an "Export Scope" button (`All Transactions`, `This Month`, `This Year`, `Custom Range`, `By Category`) with at least one transaction present throws `ReferenceError: setShowExportPreview is not defined`. In React this unmounts the page tree (blank/crashed view) and the user must restart the screen. This is the Reports page — a core feature.
- **Fix:** Either remove the `setShowExportPreview(true)` call, or (if a preview modal is intended) declare `const [showExportPreview, setShowExportPreview] = useState(false)` and render the preview.

### BUG-002 — DocumentVaultPage crashes: `setViewerBlobUrl` is not defined
- **File:** `shyblack/src/pages/DocumentVaultPage.jsx:246` and `:664`
- **Code:**
  ```jsx
  // line 246 (handleView)
  setViewerBlobUrl(null)
  // line 664 (viewer backdrop onClick)
  ... setViewerBlobUrl(null) ...
  ```
- **Evidence:** State declarations (lines 55–75, 337) include `previewUrl`, `showViewer`, `selectedDoc`, `zoomLevel`, … but **no** `viewerBlobUrl` / `setViewerBlobUrl`.
- **Impact:** Opening a document (`handleView`) throws `ReferenceError`, so the document viewer cannot be opened at all. Closing the viewer also throws. Document vault (receipts/scans) is effectively unusable.
- **Fix:** Declare `const [viewerBlobUrl, setViewerBlobUrl] = useState(null)`, populate it from the document blob, and revoke it on close (the code at line 247 already manages `viewerRef` for revocation).

---

## P1 — High

### BUG-003 — AnimatedNumber never animates; re-renders continuously
- **File:** `shyblack/src/components/AnimatedNumber.jsx:28`
- **Code:**
  ```jsx
  useEffect(() => { ... }, [value, duration, display])
  ```
- **Evidence:** The effect reads `display` (state) as its animation start value and writes `display` via `setDisplay(Math.round(current))` each rAF frame. Because `display` is in the dependency array, every frame triggers a state update → re-render → effect cleanup + re-run → rAF reset. The count never progresses smoothly (sawtooth reset each frame) and the component renders on every animation frame.
- **Impact:** Any dashboard/stat number rendered through `<AnimatedNumber/>` churns the React tree at ~60fps for its lifetime and the animation visually glitches/stutters.
- **Fix:** Keep `display` in a ref for the start value (already has `startValue`/`startTime` refs) and set deps to `[value, duration]` only; drive the frame from a single rAF owned by the effect.

### BUG-004 — GlassCard double-activation for keyboard users
- **File:** `shyblack/src/components/GlassCard.jsx:19` and `:33`
- **Code:**
  ```jsx
  <Component onClick={onClick} onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(e) } : undefined} ...>
  ```
  where `Component = clickable ? 'button' : 'div'` (line 9).
- **Evidence:** When clickable, the element is a **native `<button>`**, so Enter/Space already synthesise a `click` event that fires `onClick`. The custom `onKeyDown` handler then calls `onClick(e)` a second time for the same keystroke.
- **Impact:** Keyboard/AT users trigger card actions twice (e.g. navigation fires twice, dialogs double-open, toggles flip twice). Screen readers also announce a `role="button"` on a real button (redundant role).
- **Fix:** Drop the `onKeyDown` handler when `Component` is a `button` (keyboard handling is native). Keep it only for the `div`/`span` clickable variant.

### BUG-005 — Subscriptions "Pause" permanently deletes the subscription
- **File:** `shyblack/src/pages/SubscriptionsPage.jsx:70-75`
- **Code:**
  ```jsx
  const toggleActive = useCallback((id, current) => {
    removeRecurring(id)                       // DELETES the recurring record
    if (current !== false) addToast('...paused...', 'info')
  }, [removeRecurring, addToast, t])
  ```
- **Evidence:** The pause button (`title={t('subscriptions.pause')}`, line 132) calls `toggleActive`, which calls `removeRecurring(id)` — a permanent deletion of the recurring transaction and its future occurrences. The "inactive" list (`inactiveSubs`, line 68, filtering `s.active === false`) can therefore never contain anything; there is no restore path. The active/inactive toggle implies reversible pause but behaves destructively.
- **Impact:** One tap silently erases a subscription and its schedule. Confirmed destructive UX with no confirmation dialog.
- **Fix:** Use `pauseRecurring(id)`/`resumeRecurring(id)` (exposed by `useFinance`, used correctly in `RecurringTransactionsPage.jsx:182-184`) instead of `removeRecurring`.

### BUG-006 — Monthly statement income/expense uses wrong month
- **File:** `shyblack/src/utils/exports.js:460`
- **Code:**
  ```js
  export function generateMonthlyStatement(transactions, year, month) {
    const monthly = getMonthlyData(transactions, 1)[0]   // latest month, ignores year/month args
    ...
  ```
- **Evidence:** `getMonthlyData(transactions, 1)[0]` returns the most recent month bucket regardless of the `year`/`month` parameters. The function then separately filters `expenses` and `transactionCount` by the requested `month`/`year` (lines 463–489), producing a statement whose **income/expense/balance** (from `monthly`) do **not** match the requested period whenever the selected month is not the latest month with data.
- **Impact:** PDF/HTML "Monthly Statement" and the `handleExportStatement` flow (`ReportsPage.jsx:176-182`) show the latest month's totals while labelling a different month. Financial misreporting.
- **Fix:** Filter income/expense with the same `new Date(t.date)` month/year predicate used for expenses (or call `getMonthlyData` for the requested month and read its bucket).

---

## P2 — Medium

### BUG-007 — Inconsistent debt status vocabulary across modules
- **Files:** `shyblack/src/utils/debts.js:9-17` defines two overlapping status sets:
  - `DEBT_STATUS = { PENDING: 'pending', PAID: 'paid' }` (V1 debt shape)
  - `LEDGER_STATUS = { ACTIVE: 'active', SETTLED: 'settled' }` (V2 ledger shape)
- **Evidence of inconsistent consumers:**
  - `shyblack/src/utils/networth.js:79-82` filters only `DEBT_STATUS.PENDING` → V2 ledgers with `status:'active'` are excluded from net-worth computations.
  - `shyblack/src/utils/insightsEngine.js:169` filters `d.status !== 'settled' && d.status !== 'closed'` → `'closed'` is not a valid status anywhere; a V1 `'paid'` debt is counted as active (inflated obligation).
  - `shyblack/src/utils/forecastEngine.js:61` (`active || pending`) and `shyblack/src/utils/healthScore2.js:120,319` (`!== 'settled' && !== 'paid'`) handle both but only by luck of combined conditions.
  - `shyblack/src/utils/financialHealth.js:98` (`pending || active`).
- **Impact:** Net worth, health scores, forecasts and insights silently disagree about which debts are open — inconsistent totals across screens.
- **Fix:** Normalise on a single status enum (recommend keeping `active|settled`), add a migration for legacy `pending|paid`, and centralise "is open debt" helpers used by all consumers.

### BUG-008 — Month/year filters are timezone-sensitive (UTC date parsing)
- **Files:** `shyblack/src/utils/exports.js:90-102` and `:463-489`
- **Code:**
  ```js
  exportByMonth:  const d = new Date(t.date); d.getMonth() === month ...
  ```
- **Evidence:** `t.date` is a `YYYY-MM-DD` string (e.g. `2026-08-01`). `new Date('2026-08-01')` parses as **UTC midnight**; `.getMonth()`/`.getFullYear()` then evaluate in the **local** timezone. In negative-offset regions (UTC-…), `2026-08-01 00:00 UTC` is the previous day locally, so transactions dated the 1st of a month are attributed to the wrong month in `exportByMonth`, `exportByYear`, and `generateMonthlyStatement`.
- **Impact:** Month/year scoped exports and statements are wrong for users west of UTC on day 1 of each month. String-based comparisons elsewhere (`exportByCustomRange`, `transactionsToCsv`) are consistent, so results also disagree between export paths.
- **Fix:** Parse date-only strings with `new Date(y, m-1, d)` (local) or compare `t.date.substring(0,7)` for month keys (as done in the HTML report at line 148).

### BUG-009 — PIN stored with fast hash, no KDF; legacy unprefixed key
- **File:** `shyblack/src/utils/privacy.js:3,48-52`
- **Evidence:** PIN hash is single-pass `SHA-256(salt + pin)` with a 16-byte random salt. No PBKDF2/bcrypt/Argon2 iteration. Stored key is `finora_privacy` (line 3) — the only storage key not using the `shyblack_` prefix used by every key in `safeStorage.js:3` (`STORAGE_PREFIX = 'shyblack_'`).
- **Impact:** A 4–6 digit PIN is trivially brute-forceable offline from the localStorage hash (sub-second). The lock screen protects only against casual shoulder-surfing, not extraction. The key-naming inconsistency is a hygiene risk for future clear/migration logic.
- **Fix:** Migrate to a KDF (PBKDF2-SHA256, ≥100k iterations or WebCrypto PBKDF2) with per-user salt, keep `requiresReset` behaviour, and migrate to the prefixed key.

### BUG-010 — Reports page reachable only from Settings
- **Evidence:** `App.jsx` `navPages` is `['dashboard','add','history','analytics','settings']`; `reports` is registered as a route (AGENTS.md) and linked from `Settings.jsx:437`, but the Dashboard Quick Links section has no Reports card and Reports is not in bottom navigation.
- **Impact:** Users must navigate Settings → Reports to reach report/export features; discoverability is poor for a headline feature.
- **Fix:** Add a Reports card to the Dashboard Quick Links section.

---

## P3 — Low

### BUG-011 — `user-scalable=no` disables zoom
- **File:** `shyblack/index.html:8` — `maximum-scale=1.0, user-scalable=no` in the viewport meta. Prevents pinch-zoom, an accessibility concern for low-vision users.
- **Fix:** Drop `maximum-scale` and `user-scalable` (modern Android WebView ignores them anyway).

### BUG-012 — Redundant `role="button"` on native buttons
- **Files:** `GlassCard.jsx:16,30` set `role={clickable ? 'button' : undefined}` while the element is already a `<button>` — redundant for assistive tech.
- **Fix:** Only set `role="button"` for the non-button clickable variant.

### BUG-013 — JVM crash log committed to repo root
- **File:** `hs_err_pid13080.log` (tracked in git) — a JVM crash dump from a build machine. It is noise in the repository and can embed machine paths. Remove from git and add `hs_err_pid*.log` to `.gitignore`.

---

## Summary Table

| ID | Severity | File:Line | Issue | 
|----|----------|-----------|-------|
| BUG-001 | P0 | `ReportsPage.jsx:315` | Undefined `setShowExportPreview` → crash |
| BUG-002 | P0 | `DocumentVaultPage.jsx:246,664` | Undefined `setViewerBlobUrl` → crash |
| BUG-003 | P1 | `AnimatedNumber.jsx:28` | `display` in effect deps → broken animation + render churn |
| BUG-004 | P1 | `GlassCard.jsx:19,33` | Native button + onKeyDown → double activation |
| BUG-005 | P1 | `SubscriptionsPage.jsx:70-75` | Pause permanently deletes subscription |
| BUG-006 | P1 | `exports.js:460` | Statement uses latest month, ignores selected month |
| BUG-007 | P2 | `debts.js` + 5 consumers | Debt status vocabulary mismatch |
| BUG-008 | P2 | `exports.js:90-102` | UTC-parsed dates break month filters off-UTC |
| BUG-009 | P2 | `privacy.js:3,48` | Fast SHA-256 PIN hash; unprefixed key |
| BUG-010 | P2 | `App.jsx` / `Dashboard.jsx` | Reports only reachable via Settings |
| BUG-011 | P3 | `index.html:8` | `user-scalable=no` blocks zoom |
| BUG-012 | P3 | `GlassCard.jsx:16,30` | Redundant button role |
| BUG-013 | P3 | repo root | `hs_err_pid*.log` committed |
