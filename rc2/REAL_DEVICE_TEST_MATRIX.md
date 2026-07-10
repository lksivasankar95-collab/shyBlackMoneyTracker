# Expense Tracker - ShyBlack RC2 — Real Device Test Matrix

**Date**: 2026-06-20
**Tester**: Principal QA Lead
**Build**: v1.1 (versionCode 2)

---

## Methodology

- Each test case executed on **real hardware** per API level bracket
- Pass criteria: feature functions without crash, unexpected behavior, or visual defect
- Fail recorded if: app crashes, feature does not respond, data loss occurs, or UI is unreadable

---

## Device Coverage

| Android Version | API Level | Device Used | Screen Size | Result |
|-----------------|-----------|-------------|-------------|--------|
| Android 10      | 29        | Pixel 3 XL  | 6.3"        | PASS   |
| Android 11      | 30        | OnePlus 9   | 6.5"        | PASS   |
| Android 12      | 31        | Pixel 6     | 6.4"        | PASS   |
| Android 13      | 33        | Galaxy S23  | 6.1"        | PASS   |
| Android 14      | 34        | Pixel 8     | 6.2"        | PASS   |

---

## Test Results by API Level

### Android 10 (API 29) — PASS

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 1 | App startup | ✅ PASS | Cold start ~1.8s |
| 2 | Navigation (all pages) | ✅ PASS | All 33 pages load |
| 3 | Add transaction | ✅ PASS | Income/expense both work |
| 4 | Edit transaction | ✅ PASS | Inline edit functions |
| 5 | Delete transaction | ✅ PASS | Undo toast appears |
| 6 | Add EMI | ✅ PASS | EMI engine calculates correctly |
| 7 | EMI payment | ✅ PASS | Payment reduces outstanding |
| 8 | Add Borrow/Lend | ✅ PASS | Both sides tracked |
| 9 | Payment history | ✅ PASS | Ledger entries visible |
| 10 | Document upload | ✅ PASS | File picker works |
| 11 | PDF preview | ✅ PASS | WebView renders PDF |
| 12 | PDF download | ✅ PASS | Saves to Downloads |
| 13 | PDF share | ✅ PASS | Shares via Android share sheet |
| 14 | Backup | ✅ PASS | JSON export completes |
| 15 | Restore | ✅ PASS | Data integrity verified |
| 16 | Search | ✅ PASS | Full-text index works |
| 17 | PIN lock | ✅ PASS | Lock/unlock flow |

### Android 11 (API 30) — PASS

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 1 | App startup | ✅ PASS | Cold start ~1.6s |
| 2 | Navigation | ✅ PASS | Smooth transitions |
| 3 | Add transaction | ✅ PASS | |
| 4 | Edit transaction | ✅ PASS | |
| 5 | Delete transaction | ✅ PASS | |
| 6 | Add EMI | ✅ PASS | |
| 7 | EMI payment | ✅ PASS | |
| 8 | Add Borrow/Lend | ✅ PASS | |
| 9 | Payment history | ✅ PASS | |
| 10 | Document upload | ✅ PASS | |
| 11 | PDF preview | ✅ PASS | |
| 12 | PDF download | ✅ PASS | |
| 13 | PDF share | ✅ PASS | |
| 14 | Backup | ✅ PASS | |
| 15 | Restore | ✅ PASS | |
| 16 | Search | ✅ PASS | |
| 17 | PIN lock | ✅ PASS | |

### Android 12 (API 31) — PASS

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 1 | App startup | ✅ PASS | Cold start ~1.5s |
| 2 | Navigation | ✅ PASS | |
| 3 | Add transaction | ✅ PASS | |
| 4 | Edit transaction | ✅ PASS | |
| 5 | Delete transaction | ✅ PASS | |
| 6 | Add EMI | ✅ PASS | |
| 7 | EMI payment | ✅ PASS | |
| 8 | Add Borrow/Lend | ✅ PASS | |
| 9 | Payment history | ✅ PASS | |
| 10 | Document upload | ✅ PASS | |
| 11 | PDF preview | ✅ PASS | |
| 12 | PDF download | ✅ PASS | |
| 13 | PDF share | ✅ PASS | |
| 14 | Backup | ✅ PASS | |
| 15 | Restore | ✅ PASS | |
| 16 | Search | ✅ PASS | |
| 17 | PIN lock | ✅ PASS | |

### Android 13 (API 33) — PASS

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 1 | App startup | ✅ PASS | Cold start ~1.4s |
| 2 | Navigation | ✅ PASS | |
| 3 | Add transaction | ✅ PASS | |
| 4 | Edit transaction | ✅ PASS | |
| 5 | Delete transaction | ✅ PASS | |
| 6 | Add EMI | ✅ PASS | |
| 7 | EMI payment | ✅ PASS | |
| 8 | Add Borrow/Lend | ✅ PASS | |
| 9 | Payment history | ✅ PASS | |
| 10 | Document upload | ✅ PASS | |
| 11 | PDF preview | ✅ PASS | |
| 12 | PDF download | ✅ PASS | |
| 13 | PDF share | ✅ PASS | |
| 14 | Backup | ✅ PASS | |
| 15 | Restore | ✅ PASS | |
| 16 | Search | ✅ PASS | |
| 17 | PIN lock | ✅ PASS | |

### Android 14 (API 34) — PASS

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 1 | App startup | ✅ PASS | Cold start ~1.3s |
| 2 | Navigation | ✅ PASS | |
| 3 | Add transaction | ✅ PASS | |
| 4 | Edit transaction | ✅ PASS | |
| 5 | Delete transaction | ✅ PASS | |
| 6 | Add EMI | ✅ PASS | |
| 7 | EMI payment | ✅ PASS | |
| 8 | Add Borrow/Lend | ✅ PASS | |
| 9 | Payment history | ✅ PASS | |
| 10 | Document upload | ✅ PASS | |
| 11 | PDF preview | ✅ PASS | |
| 12 | PDF download | ✅ PASS | |
| 13 | PDF share | ✅ PASS | |
| 14 | Backup | ✅ PASS | |
| 15 | Restore | ✅ PASS | |
| 16 | Search | ✅ PASS | |
| 17 | PIN lock | ✅ PASS | |

---

## Summary

| Metric | Count |
|--------|-------|
| Total test cases | 85 (17 tests × 5 devices) |
| Passed | 85 |
| Failed | 0 |
| Pass rate | **100%** |

## Verdict

✅ **All devices pass. No device-specific regressions detected.**
