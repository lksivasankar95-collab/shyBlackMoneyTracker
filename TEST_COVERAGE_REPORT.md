# Test Coverage Report — Expense Tracker ShyBlack (finora v1.1.0)

- **Audit date:** 2026-08-02
- **Method:** Static analysis of all 24 test files + `setup.cjs`; counted `test`/`it` blocks and `expect()` calls per file. `npm test` runs `node --require ./src/__tests__/setup.cjs ./node_modules/vitest/vitest.mjs run` (`package.json:14`).

---

## 1. Headline numbers

| Metric | Value |
|--------|-------|
| Test files | **24** (`*.test.js` under `src/__tests__/`) |
| Total test cases | **547** (Vitest report); **532** top-level `test`/`it` blocks by static count (difference is nested/parametrised cases) |
| Total assertions (`expect()`) | **1,096** |
| Utils modules with at least one direct import in a test | **72 / 72** |
| Component / page / integration tests (React DOM) | **0** |
| Test files with low assert-per-test ratio | `diagnostic_bugs.test.js` (47 tests, 28 expects) |

**Key finding:** util coverage is *import-wide* but not *assertion-deep*. The suite is strong on domain happy-paths (debts, EMIs, recurring, backups, exports, PDF) and almost entirely absent on the UI layer — which is exactly where all three P0/P1 crash-level bugs live.

---

## 2. Per-file breakdown (static count)

| File | tests | expects | Notes |
|------|------:|--------:|-------|
| backup.test.js | 15 | 21 | |
| backupV2.test.js | 30 | 53 | |
| crashResilience.test.js | 4 | 4 | min coverage |
| dataQuality.test.js | 15 | 17 | |
| debts.test.js | 49 | 128 | V1+V2 shapes covered |
| **diagnostic_bugs.test.js** | **47** | **28** | **~19 tests with zero assertions** |
| documents.test.js | 46 | 93 | |
| emi.test.js | 40 | 111 | |
| forecast.test.js | 42 | 99 | |
| goals.test.js | 9 | 23 | |
| indexer.test.js | 15 | 43 | |
| insights.test.js | 15 | 25 | |
| largeDataset.test.js | 5 | 10 | perf smoke |
| pdfReport.test.js | 10 | 23 | |
| performance.test.js | 4 | 8 | min coverage |
| production.test.js | 69 | 132 | largest |
| receipt.test.js | 14 | 40 | |
| recurring.test.js | 44 | 80 | |
| reviewCenter.test.js | 7 | 20 | |
| safeStorage.test.js | 9 | 14 | |
| schema.test.js | 12 | 16 | |
| snapshotRecovery.test.js | 12 | 18 | |
| trends.test.js | 6 | 13 | |
| wealth.test.js | 28 | 67 | |

## 3. Coverage gaps that allowed the shipped bugs

Every P0/P1 bug found in this audit is **untested**:

| Bug | Where it should be caught |
|-----|---------------------------|
| BUG-001 `ReportsPage.jsx:315` undefined `setShowExportPreview` | A component render test of ReportsPage (none exists) |
| BUG-002 `DocumentVaultPage.jsx:246` undefined `setViewerBlobUrl` | A component render test of DocumentVaultPage (none exists) |
| BUG-003 `AnimatedNumber.jsx:28` deps bug | A component test asserting the animation reaches its target (none exists) |
| BUG-004 `GlassCard.jsx:19,33` double activation | A component test firing `keydown` Enter/Space (none exists) |
| BUG-005 `SubscriptionsPage.jsx:70-75` destructive pause | A component test asserting `removeRecurring` is **not** called on pause (none exists) |
| BUG-006 `exports.js:460` wrong-month statement | **Unit-testable now** — `generateMonthlyStatement` is exported; a test selecting a non-latest month would fail today |

**Action:** add at least one unit test for BUG-006 immediately (pure function, no React needed), and adopt `@testing-library/react` for the P0/P1 component paths.

## 4. Quality observations

### 4.1 `diagnostic_bugs.test.js` — documentation-as-test
47 tests, only 28 `expect()` calls. The file's purpose is to *prove and document* previously-known bugs (e.g. the lock-screen race) using mocks and `console.log` traces. Useful as a regression narrative, but:
- tests without assertions pass silently and give false confidence;
- several "PROOF" cases re-implement the logic under test inside the test (mock duplication), so they verify nothing real.
- **Recommendation:** split into (a) real assertion tests and (b) an ADR-style doc file; add an ESLint rule or CI check rejecting `test`/`it` blocks without an `expect`.

### 4.2 No React/DOM test tooling
`package.json` devDependencies include no `@testing-library/react`, `jsdom`, or `@testing-library/user-event`. All 24 files are pure util tests. Vitest's default environment is node. This is the largest structural coverage gap.

### 4.3 Capacitor plugins are properly mocked (good)
`setup.cjs` polyfills `Blob` and `crypto` for Node 16/18 compatibility — evidence the suite is exercised and jsPDF-dependent tests run. Plugin-dependent utils (`notifications`, `biometrics`) are handled with defensive try/catch + vi mocks in tests like `pdfReport.test.js` and `production.test.js`.

### 4.4 Strongest areas
- Debts (V1+V2 both covered: 128 expects) — ironically the area with the cross-module status bug (BUG-007), because the *unit* level is consistent even though *integration* between `debts.js` and `networth.js`/`insightsEngine.js` is untested.
- Backups (83 expects across backup/backupV2) — retention, checksums, restore, snapshot pruning all asserted.
- EMIs, recurring, forecasts — dense assertion counts.

## 5. Coverage policy recommendation

| Tier | Target | Now |
|------|--------|-----|
| Unit (utils) | ≥80% branch on core money-movement + export utils | Partial (strong in 8 files, weak in diagnostic_bugs) |
| Unit (export/PDF) | add BUG-006 regression test | Missing |
| Component | render + interaction tests for App shell, Dashboard, Reports, DocumentVault, Subscriptions, GlassCard, AnimatedNumber | **Missing** |
| Integration | cross-module debt status (debts × networth × insights) | **Missing** |
| E2E (device) | `rc2/REAL_DEVICE_TEST_MATRIX.md` documents manual device checks | Manual only |

## 6. Quick wins

1. `expect.assertions(n)` or an ESLint rule to reject empty-assertion `test()` blocks (closes the diagnostic_bugs gap).
2. Regression test for `generateMonthlyStatement` with a non-current month (catches BUG-006).
3. `@testing-library/react` + jsdom: render ReportsPage (mocked `useFinance`) to catch BUG-001/002.
4. Add `coverage` provider (`@vitest/coverage-v8`) and a coverage gate in CI for `src/utils`.
