# Executive Summary — Expense Tracker ShyBlack (finora v1.1.0)

- **Audit date:** 2026-08-02
- **App:** React 18 + Vite 4 + Tailwind 3 + Capacitor 5 (Android), fully offline, client-only.
- **Scope reviewed:** 44 pages, 28 components, 72 utils, core `FinanceContext` (58.9 KB), 24 test files (547 cases), Android native config, git history, and repository root.
- **Companion reports:** `BUG_REPORT.md`, `SECURITY_REPORT.md`, `PERFORMANCE_REPORT.md`, `ARCHITECTURE_REVIEW.md`, `CODE_QUALITY_REPORT.md`, `TEST_COVERAGE_REPORT.md`, `DEPENDENCY_AUDIT.md`, `PRODUCTION_READINESS_REPORT.md`, `FIX_ROADMAP.md`.

---

## 1. Bottom line

**The application is NOT ready to ship until three items are fixed:**

1. **Two P0 crashes** — the Reports export page and the Document Vault viewer both call state setters that are never declared, throwing `ReferenceError` on tap:
   - `shyblack/src/pages/ReportsPage.jsx:315` — `setShowExportPreview(true)` (no such state)
   - `shyblack/src/pages/DocumentVaultPage.jsx:246,664` — `setViewerBlobUrl(null)` (no such state)

2. **The production signing keystore is committed to the repository** — `shyblack-release-key.jks` is tracked in git history (commit `11f2be7`). Anyone with repo access can sign a malicious build that the platform will accept as the genuine app. The key must be rotated and purged from history before publishing.

Everything else is high quality for a client-only finance app: clean Play-policy posture (`allowBackup=false`, minimal permissions, exact-alarm and media permissions stripped), a genuine backup/snapshot/integrity pipeline, strong unit coverage of domain logic, and a privacy-positive offline design with no tracking or backend.

---

## 2. Headline findings by severity

| Severity | Count | Key items |
|----------|-------|-----------|
| **P0** | 3 | 2 crash bugs (Reports, Document Vault) + leaked signing keystore |
| **P1** | 5 | AnimatedNumber render churn; GlassCard double-activation; Subscriptions pause deletes data; monthly statement uses wrong month; (security) SHA-256 PIN hash |
| **P2** | 6 | Debt status vocabulary mismatch; timezone-sensitive month filters; unprefixed privacy key; OCR needs network; HTML reports not escaped; Reports page discoverability |
| **P3** | 4 | `user-scalable=no`; redundant button role; committed JVM crash log + lockfile stub; (housekeeping) |

## 3. Top risks in one line each

- **BUG-001 / BUG-002 (P0):** tapping an export scope or opening a document throws `ReferenceError` → blank screen. Both are the *headline* features of the product.
- **SEC-001 (P0):** signing key in git = attackers can push a fake "official" update to users.
- **BUG-005 (P1):** the subscriptions "pause" button silently **deletes** the subscription instead of pausing — data-loss UX that Play reviewers and users will flag.
- **BUG-006 (P1):** monthly statements can report the latest month's income/expense under a different month's label — financial misreporting.
- **BUG-003 (P1):** `AnimatedNumber` re-renders every animation frame and never animates cleanly — a battery/CPU cost on every dashboard stat.
- **BUG-007 (P2):** debts/ledgers use two incompatible status vocabularies (`pending|paid` vs `active|settled`); net worth and insights silently disagree on what is still owed.

## 4. What is done well

- **Data durability:** backup generations (max 10) with checksums, pre-import snapshots, schema validation, and integrity audits surfaced in a Health Centre.
- **Privacy posture:** fully offline; `android:allowBackup="false"`; no analytics SDKs; PIN lock with cooldown/lockout and tamper-resistant reset; biometric auth dependency present.
- **Code organisation:** domain logic cleanly separated into 72 small utils; consistent component idioms; pure functions make the strong unit suite possible.
- **Testing:** 24 files / 547 cases with meaningful depth in debts, EMIs, recurring, backups, exports, and PDF generation.

## 5. Biggest quality gap

**The UI layer is untested.** All 547 tests are pure-utility tests; there is no React DOM test tooling. Every P0/P1 bug in this audit lives in a page or component — and `diagnostic_bugs.test.js` ships ~19 tests with zero assertions. A CI gate (`npm run lint && npm test`), strict React-hooks linting, and `@testing-library/react` coverage of the reported crash paths would have caught the P0s before release.

## 6. Required actions before next release

1. Fix BUG-001 and BUG-002 (declare the missing state or remove the calls). *(hours)*
2. Rotate the signing key; purge the keystore and crash log from git history. *(1–2 days incl. Play-side checks)*
3. Fix BUG-005 (pause must pause, not delete) and BUG-006 (correct-month statement). *(half day)*
4. Fix BUG-003 (AnimatedNumber deps) and BUG-004 (GlassCard double-fire). *(minutes each)*
5. Add regression tests for all of the above; enable strict linting; add a CI gate.
6. Re-run `npm test` (547 cases + new), `npm run build`, `cap:sync`, and the device matrix in `rc2/REAL_DEVICE_TEST_MATRIX.md`.

Details, exact line numbers, and a sequenced plan are in `BUG_REPORT.md`, `SECURITY_REPORT.md`, and `FIX_ROADMAP.md`.

---

## FINAL SUMMARY

| Report | Overall Grade | Headline | Top Item |
|--------|:---:|----------|----------|
| BUG_REPORT | D | 13 verified bugs: 2 P0, 4 P1 | `ReportsPage.jsx:315` undefined setter crash |
| SECURITY_REPORT | D | Signing keystore leaked in git | Rotate key + purge history (SEC-001) |
| PERFORMANCE_REPORT | B− | Lazy routing is right; 2 perf defects matter | AnimatedNumber 60fps render churn |
| ARCHITECTURE_REVIEW | B | Coherent client-only design, monolith context | Split FinanceContext; normalise debt model |
| CODE_QUALITY_REPORT | C+ | Consistent style; no type safety / no UI tests | Enable strict hooks linting (finds all P0s) |
| TEST_COVERAGE_REPORT | C | 547 cases, strong utils, zero UI tests | Component tests for the crash paths |
| DEPENDENCY_AUDIT | B− | Runtime deps consistent; toolchain stale | Vite 4 / Vitest 0.34 upgrade |
| PRODUCTION_READINESS | **NOT READY** | Blocked by P0 crashes + keystore leak | Resolve G1 (crashes) and G2 (keystore) |
| FIX_ROADMAP | — | 19 items across 4 phases | Hotfix: F-01, F-02, F-03 |

**Overall verdict: GOOD PRODUCT, BLOCKED SHIP.** Fix the two crashes and the keystore, and this codebase is in better shape than most client-only finance apps — with a genuinely privacy-first posture that can be a store-listing strength.
