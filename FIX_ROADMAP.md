# Fix Roadmap — Expense Tracker ShyBlack (finora v1.1.0)

- **Audit date:** 2026-08-02
- Companion docs: `BUG_REPORT.md`, `SECURITY_REPORT.md`, `PERFORMANCE_REPORT.md`, `ARCHITECTURE_REVIEW.md`, `CODE_QUALITY_REPORT.md`, `TEST_COVERAGE_REPORT.md`, `DEPENDENCY_AUDIT.md`, `PRODUCTION_READINESS_REPORT.md`, `EXECUTIVE_SUMMARY.md`.

Every item below is mapped to a verified finding. IDs refer to the `BUG-`/`SEC-`/`PERFORMANCE-`/`DEP-` lists.

---

## Phase 0 — Release blockers (do first, ship in next hotfix)

### F-01 Fix ReportsPage crash — `setShowExportPreview` undefined
- **Finding:** BUG-001 (`ReportsPage.jsx:315`)
- **Fix:** Declare `const [showExportPreview, setShowExportPreview] = useState(false)` and render the intended preview, **or** delete the `setShowExportPreview(true)` call if no preview is intended.
- **Verify:** tap every Export Scope button with ≥1 transaction; no blank screen.

### F-02 Fix DocumentVaultPage crash — `setViewerBlobUrl` undefined
- **Finding:** BUG-002 (`DocumentVaultPage.jsx:246,664`)
- **Fix:** Declare `const [viewerBlobUrl, setViewerBlobUrl] = useState(null)`; set it from the document blob in `handleView`; use/revoke it consistently with the existing `viewerRef` logic.
- **Verify:** open + close the document viewer for PDF/image documents.

### F-03 Rotate leaked signing keystore and purge from git
- **Finding:** SEC-001 (`shyblack-release-key.jks` tracked since commit `11f2be7`)
- **Fix:**
  1. Generate a new keystore/key alias (keep the same package identity; if already published, follow Google Play signing-key rotation; **if the app-signing key leaked, contact Play support before publishing anything**).
  2. `git rm --cached shyblack-release-key.jks` (also `hs_err_pid13080.log`, root `package-lock.json` stub).
  3. Rewrite history (BFG or `git filter-repo`) so old commits don't retain the key.
  4. Store the keystore outside the repo; commit a `keystore.properties` template only.
- **Verify:** `git log --all --oneline -- shyblack-release-key.jks` shows no reachable reference; build signs with the new key.

---

## Phase 1 — High-priority correctness (same release or immediate follow-up)

### F-04 Fix AnimatedNumber animation + render churn
- **Finding:** BUG-003 / PERFORMANCE-001 (`AnimatedNumber.jsx:28`)
- **Fix:** Move the start value into a ref; set effect deps to `[value, duration]`; keep the single rAF owned by the effect.
- **Verify:** a Dashboard stat animates 0→value once; no continuous re-render (React Profiler / logs).

### F-05 Fix GlassCard double activation for keyboard users
- **Finding:** BUG-004 / BUG-012 (`GlassCard.jsx:19,33`)
- **Fix:** Remove the `onKeyDown` handler when the element is a native `<button>` (Enter/Space already clicks); keep it only for the non-button clickable variant; drop redundant `role="button"` on real buttons.
- **Verify:** keyboard tab + Enter/Space activates a clickable card exactly once.

### F-06 Fix destructive subscription pause
- **Finding:** BUG-005 (`SubscriptionsPage.jsx:70-75`)
- **Fix:** Use `pauseRecurring(id)` / `resumeRecurring(id)` (already available via `useFinance` and used correctly in `RecurringTransactionsPage.jsx:182-184`); remove `removeRecurring` from the toggle path.
- **Verify:** pause/resume restores the subscription to the active list; nothing is deleted.

### F-07 Fix wrong-month monthly statement
- **Finding:** BUG-006 (`exports.js:460`)
- **Fix:** Compute income/expense/balance with the same `new Date(t.date)` month/year predicate used for `expenses` (or read `getMonthlyData` for the requested month bucket).
- **Verify:** add a regression test selecting a non-latest month; statement totals match the filtered transaction set.

---

## Phase 2 — Medium priority (next iteration)

### F-08 Normalise debt data model
- **Finding:** BUG-007 (`debts.js:9-17` + `networth.js:79`, `insightsEngine.js:169`, `forecastEngine.js:61`, `healthScore2.js:120,319`, `financialHealth.js:98`)
- **Fix:** one-time migration of stored debts to the ledger shape (`active|settled`); export a single `isOpenDebt(d)` helper; replace all consumer predicates.
- **Verify:** net worth, health score, forecasts, and insights agree on the same active-debt set; unit tests for each consumer.

### F-09 Fix timezone-sensitive month/year filters
- **Finding:** BUG-008 (`exports.js:90-102,463-489`)
- **Fix:** parse date-only strings locally (`new Date(y, m-1, d)`) or compare `t.date.substring(0,7)` for month grouping (as `exportWithChartsToHTML` already does at `exports.js:148`).
- **Verify:** a `2026-08-01` transaction stays in August for any local timezone.

### F-10 Strengthen PIN hashing
- **Finding:** BUG-009 / SEC-002 (`privacy.js:3,48-52`)
- **Fix:** PBKDF2-SHA256 (≥100k iterations) via WebCrypto; keep cooldown/lockout and `requiresReset`; migrate key to the `shyblack_` prefix.
- **Verify:** existing PINs still unlock after migration (verify against old hash format first); new PINs use KDF.

### F-11 Bundle OCR assets or gate behind connectivity
- **Finding:** SEC-005 / PERFORMANCE-004 (`package.json:35`)
- **Fix:** ship `eng.traineddata` + worker/WASM under `public/` and set `langPath`/`workerPath`/`corePath`; or show a connectivity notice before scanning.
- **Verify:** receipt scan works in airplane mode.

### F-12 HTML-escape user text in exported reports + CSP
- **Finding:** SEC-004 (`exports.js:200-296,504-546`, `index.html`)
- **Fix:** escape `<`, `>`, `&` in notes/categories when interpolating into HTML; add a restrictive CSP meta to `index.html`.
- **Verify:** a note containing `<script>` renders as text in exported HTML; page loads with CSP.

---

## Phase 3 — Quality & engineering (continuous)

### F-13 Test the P0/P1 paths
- **Finding:** TEST_COVERAGE_REPORT §3
- **Fix:** `@testing-library/react` + jsdom; add render tests for ReportsPage (BUG-001), DocumentVaultPage (BUG-002), AnimatedNumber (BUG-003), GlassCard (BUG-004), SubscriptionsPage (BUG-005); unit test `generateMonthlyStatement` (BUG-006).

### F-14 Close the zero-assertion test gap
- **Finding:** TEST_COVERAGE_REPORT §4.1 (`diagnostic_bugs.test.js`: 47 tests / 28 expects)
- **Fix:** add `expect.assertions()` or an ESLint rule rejecting `test` blocks without assertions; split proof docs from real tests.

### F-15 Add CI gate
- **Finding:** CODE_QUALITY_REPORT §1, PRODUCTION_READINESS §3.3
- **Fix:** GitHub Actions (or equivalent) running `npm run lint` + `npm test` + `npm run build` on PR; add coverage provider + budget gate.

### F-16 Enable strict React-hooks linting
- **Finding:** CODE_QUALITY_REPORT §3.2
- **Fix:** `react-hooks/exhaustive-deps: 'error'` + `no-undef` — catches BUG-001/002/003 classes at lint time.

### F-17 Lazy-load the PDF engine
- **Finding:** PERFORMANCE-002
- **Fix:** dynamic `import('jspdf')` inside the PDF handlers in `ReportsPage.jsx`, or route-level `import()` for the Reports page.

### F-18 Toolchain upgrade
- **Finding:** DEP-002
- **Fix:** Vite + Vitest (with `@vitest/coverage-v8`) upgrade; re-run full suite + Android build.

### F-19 FinanceContext split + storage routing (long-term)
- **Finding:** ARCHITECTURE_REVIEW §3.1/§3.3, PERFORMANCE-003/005
- **Fix:** split context by domain; promote large keys (documents, backups) to IndexedDB explicitly.

---

## Suggested sequencing

| Sprint | Items |
|--------|-------|
| Hotfix (immediate) | F-01, F-02, F-03 |
| Release 1.1.1 | F-04, F-05, F-06, F-07, F-13 (unit for F-07) |
| Release 1.2 | F-08, F-09, F-10, F-11, F-12, F-15 |
| Ongoing | F-14, F-16, F-17, F-18, F-19 |

## Verification commands

```bash
cd shyblack
npm run lint          # after F-16 this must be 0 warnings
npm test              # 547 cases green + new regression tests
npm run build         # 0 errors
npm run cap:sync      # sync Capacitor after native/version changes
npx cap open android  # manual smoke: Reports export scope, Document Vault, Subscriptions pause
```
