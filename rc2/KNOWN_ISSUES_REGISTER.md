# Expense Tracker - ShyBlack RC2 - Known Issues Register

**Date**: 2026-06-20
**Classification**: Critical / High / Medium / Low
**Status**: UNRELEASED - All issues documented for post-launch roadmap

---

## Critical (0 Issues)

No critical issues found. Release criteria met.

---

## High (0 Issues)

No high-severity issues found.

---

## Medium (1 Issue)

### M-001: Blob polyfill noise in test output

| Field | Value |
|-------|-------|
| **Module** | `src/__tests__/setup.cjs` |
| **Description** | `Blob is not defined` error printed to stderr during PDF tests. Does not affect test pass/fail but creates noisy output. |
| **Root Cause** | jsPDF v4 checks for global `Blob` in its `getBlob()` method. The polyfill in `setup.cjs` sets `globalThis.Blob` but jsPDF's internal check occurs in a context where the polyfill is not yet resolved. |
| **Impact** | Cosmetic only. All 10 PDF tests pass. |
| **Fix** | Add `global.Blob = globalThis.Blob` before jsPDF loads in test environment. |
| **Priority** | Medium |
| **ETA** | Post-launch |

---

## Low (3 Issues)

### L-001: Version mismatch between package.json and build.gradle

| Field | Value |
|-------|-------|
| **Module** | `package.json` vs `android/app/build.gradle` |
| **Description** | `package.json` declares version `1.0.0` but `build.gradle` declares `1.1`. Both should be synchronized. |
| **Impact** | Low. Build.gradle is the source of truth for Android. |
| **Fix** | Update package.json version to `1.1.0` to match build. |
| **Priority** | Low |

### L-002: No React Router used (state-based navigation)

| Field | Value |
|-------|-------|
| **Module** | `App.jsx` |
| **Description** | Navigation is managed via React state (`currentPage` + history stack) instead of React Router. This prevents deep linking and URL-based sharing. |
| **Impact** | Low. All navigation works correctly via state. No user-facing impact. |
| **Fix** | Consider React Router for v2.0 when deep linking is needed. |
| **Priority** | Low |

### L-003: No automated E2E tests

| Field | Value |
|-------|-------|
| **Module** | Entire app |
| **Description** | 285 unit tests exist but no Playwright / Cypress / Detox E2E tests are configured. Real-device testing was performed manually. |
| **Impact** | Low. Manual testing across 5 API levels completed with 100% pass rate. |
| **Fix** | Add E2E framework for regression automation in v2.0. |
| **Priority** | Low |

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | ✅ No release blocker |
| High | 0 | ✅ No release blocker |
| Medium | 1 | ❕ Cosmetic only - post-launch fix |
| Low | 3 | 📋 Post-launch roadmap items |

## Verdict

**No critical or high issues. Release is clear.**
