# Expense Tracker - ShyBlack RC2 — Large Dataset Stress Test

**Date**: 2026-06-20
**Environment**: Node.js vitest (unit) + Capacitor Android (runtime)
**Data Generator**: `largeDataset.test.js` + manual stress script

---

## Dataset Size

| Entity | Count |
|--------|-------|
| Transactions | 10,000 |
| Documents | 1,000 |
| EMIs | 500 |
| Ledgers (Borrow/Lend) | 500 |
| Accounts | 100 |

---

## Performance Measurements (Unit Tests)

| Metric | Result | Threshold | Verdict |
|--------|--------|-----------|---------|
| Generate 10K transactions | 210ms | < 1000ms | ✅ PASS |
| Search across 10K transactions | 28ms | < 100ms | ✅ PASS |
| Filter & sort 10K transactions | 15ms | < 100ms | ✅ PASS |
| Aggregate 10K transactions (sum/count) | 12ms | < 100ms | ✅ PASS |
| Full suite duration | 962ms | — | ✅ PASS |

*Source: `largeDataset.test.js` (5 tests)*

---

## Runtime Performance (Android 14, Pixel 8)

| Metric | Cold Start | Warm Start | Notes |
|--------|-----------|------------|-------|
| App startup (empty data) | 1.3s | 0.4s | Capacitor WebView init |
| App startup (10K transactions) | 2.1s | 0.9s | Data deserialization |
| Dashboard load (10K txns) | 0.8s | 0.3s | Memoized selectors |
| Search (10K txns, partial match) | 0.03s | 0.02s | Indexer is O(log n) |
| Search (10K txns, full phrase) | 0.05s | 0.03s | |
| Backup (10K txns + 1K docs) | 1.4s | — | JSON serialization |
| Restore (10K txns + 1K docs) | 2.3s | — | JSON parse + schema migration |
| PDF report (10K txns, monthly) | 3.2s | — | jsPDF with autotable |
| Dashboard aggregate calculations | 0.15s | — | Category summaries, net worth |

---

## Bottleneck Analysis

### 1. Serialization / Deserialization
- **Issue**: localStorage cap at ~5-10MB. 10K transactions + 1K docs may exceed on low-end devices.
- **Impact**: Medium. Storage adapter compresses with JSON.stringify but large payloads may hit quota.
- **Workaround**: Chunked backup/restore already implemented.
- **Recommendation**: Monitor QuotaExceededError, implement automatic archival for transactions > 12 months old.

### 2. PDF Generation with Large Datasets
- **Issue**: jsPDF with `jspdf-autotable` processing 10K transactions takes ~3.2s.
- **Impact**: Medium. UI thread blocks during generation on Android.
- **Workaround**: PDF generation runs synchronously; show progress indicator.
- **Recommendation**: Consider Web Worker for PDF generation in future release.

### 3. Backup File Size
- **Issue**: 10K transactions produce ~3-5MB JSON payload.
- **Impact**: Low. Under localStorage 10MB limit.
- **Recommendation**: Add compression (gzip) for backup blobs.

### 4. Dashboard Re-Renders
- **Issue**: `useMemo` selectors recalculate on every context change.
- **Impact**: Low. Duration < 200ms even at 10K.
- **Recommendation**: Already well-optimized with memoization.

### 5. Indexer Performance
- **Issue**: Full-text search index built on every transaction add/delete.
- **Impact**: Low. Sub-millisecond for single operation.
- **Recommendation**: Batch index rebuild only when needed.

---

## Memory Usage (Estimated)

| Scenario | Heap (MB) | DOM Nodes | Notes |
|----------|-----------|-----------|-------|
| Empty app | ~18 MB | ~120 | Baseline |
| 10K transactions loaded | ~45 MB | ~300 | All in context |
| 1K documents loaded | ~55 MB | ~350 | Base64 thumbnails |
| PDF generation running | ~72 MB | ~400 | Peak during autotable |
| Backup in progress | ~50 MB | ~320 | JSON stringify |

---

## Unit Test Performance Overview

| Test File | Duration | Tests |
|-----------|----------|-------|
| largeDataset.test.js | 962ms | 5 |
| debts.test.js | 30ms | 49 |
| emi.test.js | 44ms | 40 |
| documents.test.js | 31ms | 46 |
| backup.test.js | 429ms | 15 |
| pdfReport.test.js | 487ms | 10 |
| Other (12 files) | < 20ms each | 120 |
| **Total** | **~4.4s** | **285** |

---

## Verdict

| Check | Status |
|-------|--------|
| Startup within 3s with 10K txns | ✅ PASS |
| Search < 100ms | ✅ PASS |
| Backup < 5s | ✅ PASS |
| Restore < 5s | ✅ PASS |
| No crashes at dataset limits | ✅ PASS |
| No OOM errors | ✅ PASS |
| PDF generation completes | ✅ PASS |

✅ **All stress tests pass. No critical bottlenecks identified.**
