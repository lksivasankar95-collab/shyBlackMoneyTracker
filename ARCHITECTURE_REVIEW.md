# Architecture Review — Expense Tracker ShyBlack (finora v1.1.0)

- **Audit date:** 2026-08-02
- **Codebase:** `shyblack/` — 44 pages, 28 components, 72 utils, 5 i18n locales, 1 context, 2 hooks, 24 test files. Core state file `FinanceContext.jsx` is 58.9 KB.

---

## 1. Overview

**Runtime model:** A fully client-side React 18.2 application embedded in a Capacitor 5 Android WebView. There is **no backend, no API layer, no WebSocket, no analytics** — all state and files persist in the device WebView via a storage adapter over `localStorage`/IndexedDB. This is a deliberate, privacy-positive design (see SECURITY_REPORT).

```
main.jsx → App.jsx (manual router + lock gate + reminder init)
   └─ pages map (lazy)  → 44 Page components
   └─ FinanceContext (useFinance)  ← all domain state
   └─ utils/  (72 modules)  → domain logic, storage, backup, export
   └─ i18n/   (5 locales)  → react-i18next
```

## 2. Strengths

### 2.1 Clean domain-utils layering
The 72 modules under `src/utils/` are logically separated by domain: `transactions` (indexer, tags, templates, archiveEngine), money movement (`recurring`, `emi`, `debts`, `bills`, `budgets`, `goals`, `transfers`), analysis (`analytics`, `insights`, `insightsEngine`, `networth`, `wealthUtils`, `healthScore2`, `financialHealth`, `cashFlowForecast`, `forecastEngine`), and infrastructure (`safeStorage`, `storageAdapter`, `schema`, `backup*`, `snapshotRecovery`, `dataIntegrity`, `dataValidator`, `dataQuality`). Separation of pure logic from React is the right call and pays off in the test suite.

### 2.2 Robust durability pipeline
A genuine, well-structured data-protection stack exists:
- **Schema versioning + validation** (`schema.js`, `dataValidator.js`)
- **Backup generations** with checksums and retention (`backup.js`, `backupManager.js`, `backupMetadata.js`, `backupHealth.js`)
- **Snapshot recovery** before risky operations such as import (`snapshotRecovery.js`, max age 30 days)
- **Integrity audits** (`dataIntegrity.js`, `integrityValidator.js`, `dataQuality.js`) surfaced on a Health Centre page

### 2.3 Sensible manual routing for a 44-page shell
Rather than pulling in `react-router`, navigation is a state-based `pages` map with lazy imports and an in-memory history stack (`App.jsx`). For a mobile app with no URL concerns this is legitimate and keeps the bundle lean. Trade-offs: no deep-link/back-button interop with the OS back gesture beyond the app's own stack (the Capacitor back handler must map to `handleGoBack`).

### 2.4 Privacy-first storage
`allowBackup=false` on Android, prefixed namespaced keys (`shyblack_*`), an adapter indirection over storage, and a memory cache in `safeStorage.js`. All-or-nothing clear() and per-key invalidation are well thought out.

## 3. Architectural Risks

### 3.1 The `FinanceContext` monolith
- **File:** `src/context/FinanceContext.jsx` (58.9 KB)
- All domains (transactions, recurring, EMIs, debts, budgets, goals, accounts, backups, reminders, tags, imports) share one provider. Every write re-renders every consumer. This is the single biggest scalability and maintainability risk: it makes per-domain performance tuning and unit-testing of the context impossible in isolation, and it concentrates 1000+ lines of business logic in one file.
- **Recommendation:** split by domain (transactions/budgets/recurring/relationships) with composed providers; keep cross-cutting orchestration (backups, reminders) in dedicated hooks.

### 3.2 Two coexisting data models for debts
- **Files:** `debts.js` (V1 `createDebt` → `pending|paid`; V2 `createLedger` → `active|settled`), `networth.js`, `insightsEngine.js`, `forecastEngine.js`, `healthScore2.js`, `financialHealth.js`
- The migration added a V2 ledger engine but kept V1 wrappers, and downstream modules read `status` with incompatible predicates (see BUG-007). This is the classic "migration by accretion" debt: two shapes stored under the same key (`shyblack_debts`).
- **Recommendation:** a one-time data migration normalising all records to the ledger shape, with the V1 statuses translated, plus a single exported "is open" helper used everywhere.

### 3.3 Storage adapter ambiguity (localStorage vs IndexedDB)
- **File:** `storageAdapter.js` (`ADAPTER_TYPES`)
- The adapter abstracts the backing store, but most reads/writes go through `safeStorage`'s synchronous `get`/`set` and the cache. Which keys use IndexedDB vs localStorage is not obvious from usage sites; documents/backups are large and are the natural IndexedDB residents. The abstraction is good, but the routing policy should be explicit and documented (size-based promotion to IndexedDB, quota handling surfaced via `getStorageInfo()`).

### 3.4 Manual router lacks a canonical "current route" model
- **File:** `App.jsx`
- `pageKey = currentPage + navParams?.editTransaction?.id` is used to key pages. Back-stack and deep-link handling are hand-rolled. Every new page must be registered in both the pages map and the settings/dashboard quick links. This is manageable now (44 pages) but is a maintenance hotspot; a lightweight declarative route table (array of `{ id, lazy, tab }`) would remove the drift risk (e.g. `reports` registered as a route but absent from nav and Dashboard — BUG-010).

### 3.5 Export/PDF engine statically bundled into ReportsPage
- **Files:** `ReportsPage.jsx:6-15` statically imports `exports.js`, `pdfReport.js`, `downloadUtils.js`; both `jspdf` and `jspdf-autotable` are loaded with the route.
- With lazy page loading already in place, the PDF stack should be dynamically imported to keep the Reports chunk light (see PERFORMANCE-002).

### 3.6 i18n surface is large but duplicated keys are not enforced
- **Files:** `src/i18n/` (5 locales); pages fall back to inline English strings (e.g. `t('reports.export_format') || 'Export Format'` throughout `ReportsPage.jsx`).
- The `|| 'fallback'` pattern is pragmatic but silently hides missing-translation drift; an i18n lint (missing-key check) would prevent untranslated strings from shipping.

## 4. Data Flow Diagram (as-implemented)

```
User action → Page component
   → useFinance() actions (FinanceContext)      [business logic lives in utils/]
   → util module mutates domain array
   → safeStorage.set(key, data)                 [memory cache + adapter write]
   → provider state update → re-render consumers
   → periodic: backups/snapshots/reminders (App.jsx ReminderInit)
```

## 5. Verdict

The architecture is **coherent and appropriately simple for a client-only finance app**. The foundation (utils layering, durability pipeline, storage abstraction, lazy routing) is above average for a solo/small-team app of this size. The main structural debts are the **FinanceContext monolith**, the **dual debt data model**, and the **manual router's registration drift**. None block the current release except in combination with the P0 bugs and the keystore leak, which are functional/security, not architectural.

## 6. Recommended Architectural Actions (by value)

| # | Action | Effort | Value |
|---|--------|--------|-------|
| 1 | Normalise debt data model; single "is open debt" helper | S | High |
| 2 | Dynamic-import PDF engine on Reports route | S | High |
| 3 | Fix AnimatedNumber (render churn) | XS | High |
| 4 | Document + enforce storage routing (IndexedDB for large keys) | M | Medium |
| 5 | Declarative route table; derive nav + quick links from it | M | Medium |
| 6 | Split FinanceContext by domain | L | High (long-term) |
| 7 | i18n missing-key lint | S | Medium |
