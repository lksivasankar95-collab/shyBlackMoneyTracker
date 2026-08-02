# Performance Report — Expense Tracker ShyBlack (finora v1.1.0)

- **Audit date:** 2026-08-02
- **Platform:** Capacitor 5 WebView on Android, bundled Vite build (`target es2020`), data in localStorage/IndexedDB.
- **Method:** Static analysis of render paths, bundle-critical dependencies, storage I/O patterns, and the large-dataset test file. No profiler was run (device access not available in this audit).

Severity: **P1** = high, **P2** = medium, **P3** = low.

---

## P1 — High

### PERFORMANCE-001 — AnimatedNumber renders every animation frame forever
- **File:** `shyblack/src/components/AnimatedNumber.jsx:9-28`
- **Details:** The animation effect writes state (`setDisplay`) on every `requestAnimationFrame` tick and lists `display` in the dependency array (line 28). Consequences:
  1. Each `setDisplay` triggers a re-render; the effect cleanup cancels and re-arms rAF; the animation restarts from its current display value every frame.
  2. While mounted, the component renders at ~60fps for its entire lifetime — and any stat that re-mounts it (or whose `value` prop is a new number identity) re-triggers the loop.
- **Impact:** Measurable CPU/battery cost on the Dashboard and any page using `<AnimatedNumber/>` for balances; compounds with the low-end Android devices this app targets.
- **Fix:** Drive the rAF loop from effect-local state (keep `display` in a ref for the start value), deps `[value, duration]`, and stop cleanly. (See BUG-003.)

---

## P2 — Medium

### PERFORMANCE-002 — Heavy runtime dependencies inflate the bundle and memory
- **Files:** `shyblack/package.json:28-35`
  - `recharts ^3.8.1` — large SVG charting library; charts are used across Analytics/Dashboard/Reports.
  - `jspdf ^4.2.1` + `jspdf-autotable` — PDF generation loaded statically in `ReportsPage.jsx:12-15`.
  - `tesseract.js ^7.0.0` — OCR engine; WASM + traineddata are multi-MB and (by default) fetched from a CDN at runtime.
- **Details:** The build has no chunk-size reporting and no explicit vendor-splitting config beyond Vite defaults. Pages are lazy-loaded (manual `pages` map in `App.jsx`), which is good — but `ReportsPage` statically imports `jspdf`, `jspdf-autotable`, and the entire `exports` + `pdfReport` module graph, so the PDF engine loads whenever the Reports route is opened.
- **Impact:** Large first-render JS on device; high memory pressure on low-RAM Android; slow cold navigation into Reports.
- **Fix:** 
  - Route-level `import()` for `ReportsPage`/PDF generation (or dynamic `await import('jspdf')` inside `handleGeneratePDF`/`handleExport`).
  - Add `build.chunkSizeWarningLimit` awareness and a `reportCompressedSize` check in CI.
  - Lazy-mount `recharts` charts behind `Suspense`.

### PERFORMANCE-003 — Synchronous localStorage writes for every transaction mutation
- **Files:** `shyblack/src/context/FinanceContext.jsx` (single 59 KB state file), `shyblack/src/utils/safeStorage.js:77-84` (synchronous `set`), `storageAdapter.js`
- **Details:** Each transaction add/edit/delete serialises the full transactions array and persists synchronously via the adapter. The project includes `largeDataset.test.js` (5 tests) suggesting the data scale is a recognised concern. `safeStorage` adds an in-memory `Map` cache (good) but every mutation still does a full-array `JSON.stringify` + write.
- **Impact:** On devices with slow flash and datasets in the tens of thousands of rows, UI can stutter during save; quota pressure is handled by the adapter but degradation is linear.
- **Fix:** Debounce/batch persistence, or migrate the transactions store to IndexedDB (the adapter already supports `ADAPTER_TYPES`) with incremental writes; keep the memory cache for reads.

### PERFORMANCE-004 — OCR path assumes network availability
- **File:** `shyblack/src/utils/receiptParser.js` / `receiptUtils.js` (tesseract usage), `package.json:35`
- **Details:** Default `tesseract.js` configuration loads worker + `eng.traineddata` from a CDN. This is an offline-capable finance app; scanning a receipt without connectivity will fail or hang on a network fetch.
- **Impact:** Feature broken offline; also an unbounded external network request from a privacy-focused app.
- **Fix:** Bundle traineddata/WASM in `public/` and set `langPath`/`workerPath`/`corePath` to local URLs; or detect connectivity and degrade gracefully. (See SEC-005.)

### PERFORMANCE-005 — `FinanceContext.jsx` is a 59 KB monolith with broad provider re-renders
- **File:** `shyblack/src/context/FinanceContext.jsx` (58,929 bytes)
- **Details:** All financial state (transactions, budgets, debts, EMIs, recurring, backups, reminders, goals, tags, accounts…) lives in one context. Any state update re-renders every consumer of the context across the active page tree unless `useFinance` consumers are memoised carefully.
- **Impact:** Page-level responsiveness degrades as the number of consumers and dataset size grow; hard to profile per-domain.
- **Fix:** Slice the context (separate `TransactionsContext`, `BudgetsContext`, `RecurringContext`, …) or memoise selectors; at minimum, memo the provider value and keep page components `memo`'d.

---

## P3 — Low

### PERFORMANCE-006 — No build-size budget / CI checks
- **Files:** `vite.config.js`, `package.json:6-16`
- **Details:** No `chunkSizeWarningLimit` tuning, no bundle-size assertions, no coverage/performance gates in CI scripts. Bundle growth (recharts + jspdf + tesseract) is unmonitored.
- **Fix:** Add `vite-plugin-compression` or `vite-bundle-visualizer` to the dev workflow and enforce a size budget in CI.

### PERFORMANCE-007 — `AnimatedNumber` rAF not cancelled on unmount
- **File:** `shyblack/src/components/AnimatedNumber.jsx:25-27`
- **Details:** The cleanup does cancel `rafRef.current` — but because the effect re-runs every frame (PERFORMANCE-001), the cleanup/cancel churn itself is wasted work; the guard is present but ineffective given the deps bug.
- **Fix:** Resolved by PERFORMANCE-001.

---

## Verdict

The architecture already does the most important thing right: **lazy-loaded pages** keep the core shell small. The two meaningful performance defects are (1) the `AnimatedNumber` render churn on the dashboard and (2) the static loading of the PDF engine on the Reports route. Both are cheap to fix and have visible impact on low-end hardware. Long-term, splitting `FinanceContext` and moving heavy stores to IndexedDB will keep the app smooth at scale.

## Recommended order

1. Fix PERFORMANCE-001 (AnimatedNumber) — one-line deps change, big win.
2. Lazy-load jspdf + recharts (PERFORMANCE-002) — route-level `import()`.
3. Bundle tesseract assets / gate OCR (PERFORMANCE-004).
4. Defer large-store persistence to IndexedDB (PERFORMANCE-003).
5. Split FinanceContext (PERFORMANCE-005) as a follow-up refactor.
