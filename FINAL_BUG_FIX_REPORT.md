# Final Bug Fix Report — ShyBlack Expense Tracker

**Date:** 2026-08-02
**Branch:** `main`
**Status:** All 13 documented bugs resolved. Production-ready release commit.

## Summary

All bugs from `BUG_REPORT.md` were fixed in three batches, each verified (lint → build → tests) and pushed to `origin/main` before starting the next batch. A total of **25 files** were modified across **3 commits**.

| Batch | Bugs | Commit | Files | Δ | Pushed |
|-------|------|--------|-------|-----|--------|
| 1 | BUG-001..005 | `f5ee727` | 6 | +41 / −19 | `fedd441..f5ee727` |
| 2 | BUG-006..010 | `dc4efcc` | 15 | +122 / −65 | `f5ee727..dc4efcc` |
| 3 | BUG-011..013 | `301581e` | 4 | +5 / −266 | `dc4efcc..301581e` |

## Batch 1 — `f5ee727` (BUG-001..005)

| Bug | Severity | Fix |
|-----|----------|-----|
| BUG-001 | P0 | `ReportsPage.jsx` — removed call to undefined `setShowExportPreview` in export-scope onClick |
| BUG-002 | P0 | `DocumentVaultPage.jsx` — declared missing `viewerBlobUrl` state; document viewer now uses a revocable object URL |
| BUG-003 | P1 | `AnimatedNumber.jsx` — split effects; `display` removed from animation deps (animation restarts on every render) |
| BUG-004 | P1 | `GlassCard.jsx` — removed manual `onKeyDown` handlers on native `<button>` (Enter/Space already activate) |
| BUG-005 | P1 | `SubscriptionsPage.jsx` — pause no longer deletes subscriptions; uses `pauseRecurring`/`resumeRecurring`; added resume button |

Files: `ReportsPage.jsx`, `DocumentVaultPage.jsx`, `AnimatedNumber.jsx`, `GlassCard.jsx`, `SubscriptionsPage.jsx`, `src/i18n/en.json`.

## Batch 2 — `dc4efcc` (BUG-006..010)

| Bug | Severity | Fix |
|-----|----------|-----|
| BUG-006 | P1 | `exports.js` — `generateMonthlyStatement` now filters income/expense by the **requested** year/month (was latest-month bucket) |
| BUG-007 | P2 | Added centralized `isOpenDebt()` in `debts.js`; unified **14** consumers that mixed `pending\|paid` (V1) and `active\|settled` (V2) predicates |
| BUG-008 | P2 | TZ-safe date-only matching (`matchesMonthYear`) in `exports.js` (`exportByMonth`, `exportByYear`, `generateMonthlyStatement`) and `pdfExport.js` |
| BUG-009 | P2 | `privacy.js` — storage key renamed to `shyblack_privacy` (legacy `finora_privacy` migrated on read); PIN hash upgraded from single-pass SHA-256 to **PBKDF2-SHA256 (150k iterations)** with silent re-hash of legacy hashes on next successful verify |
| BUG-010 | P2 | **Verified already satisfied** — Reports card exists in Dashboard "More Features" (`Dashboard.jsx:81`) and route registered (`App.jsx:77`); no change required |

BUG-007 consumers unified: `networth`, `insightsEngine` (×2), `forecastEngine`, `healthScore2` (×2), `financialHealth`, `pdfExport`, `pdfReport`, `relationshipInsights`, `reminders`, `statementGenerator` (×2), `timeline`, `wealthUtils`.

## Batch 3 — `301581e` (BUG-011..013)

| Bug | Severity | Fix |
|-----|----------|-----|
| BUG-011 | P3 | `index.html` — removed `maximum-scale=1.0` and `user-scalable=no` (restores pinch-zoom/accessibility) |
| BUG-012 | P3 | `GlassCard.jsx` — dropped redundant `role="button"` on native `<button>`; explicit `role` prop still respected |
| BUG-013 | P3 | Removed committed JVM crash log `hs_err_pid13080.log`; added root `.gitignore` with `hs_err_pid*.log` |

## Verification

- **Build:** `npm run build` succeeds in all batches (exit 0); only pre-existing chunk-size warnings.
- **Tests:** 546 / 547 pass. The single failure — `forecast.test.js:258` "calculates breach probability" — is **pre-existing and date-dependent** (early-in-month ⇒ ~0 elapsed days ⇒ probability rounds to 0). Proven via `git stash` + clean-tree re-run during Batch 1.
- **Lint:** 0 new issues introduced. Pre-existing errors remain untouched: `financialTimeline.js:75-76` (`txsUpTo`), `insights.js:310` (`NOTIF_TYPES`), `insightsEngine.js:279,288` (`avgExpense`).

## Remaining Known Items (outside bug scope)

- **SEC-001 (high):** `shyblack-release-key.jks` is committed in git history. Fixing properly requires rotating the signing key and rewriting history (e.g. `git filter-repo`). Not performed to avoid breaking Play Store releases without approval.
- **SEC-007 (low):** `PRODUCTION_AUDIT_REPORT.md` (15 KB) and a 105-byte stub `package-lock.json` are committed at repo root; both are cleanup candidates.
- Pre-existing lint errors and the date-flaky forecast test (see above).

## Recommendation

**Release approved.** The 13 documented bugs are resolved, all changes are committed and pushed to `origin/main`, and the build/test baseline is unchanged from the audited state (no regressions). Follow-up: rotate/remove the committed signing keystore and clean up the SEC-007 leftovers.
