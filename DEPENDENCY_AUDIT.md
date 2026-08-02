# Dependency Audit — Expense Tracker ShyBlack (finora v1.1.0)

- **Audit date:** 2026-08-02
- **Source of truth:** `shyblack/package.json` + resolved versions from `node_modules`.
- **Note:** This audit is static. A live `npm audit --omit=dev` against the registry should be run on the build machine and the results recorded here; none of the versions below are asserted to have known CVEs, only age/risk profile and compatibility facts that were verified locally.

---

## 1. Installed runtime dependencies (resolved)

| Package | Resolved | Declared | Role | Assessment |
|---------|----------|----------|------|------------|
| `react` / `react-dom` | 18.3.1 | ^18.2.0 | UI | LTS-ish, mature |
| `react-i18next` | 17.0.8 | ^17.0.8 | i18n | Compatible with `i18next 26.3.1` (peer `>=26.2.0` verified) and React ≥16.8 ✓ |
| `i18next` | 26.3.1 | ^26.3.1 | i18n core | Current major |
| `@capacitor/core` | 5.7.8 | ^5.7.8 | Native bridge | Current in Capacitor 5 line |
| `@capacitor/app`, `android`, `cli`, `filesystem`, `local-notifications`, `share` | 5.x | ^5.x | Plugins | Aligned with core 5.x ✓ |
| `@aparajita/capacitor-biometric-auth` | 5.2.1 | ^5.2.1 | Biometrics | Third-party plugin — review for maintenance status |
| `@capacitor-community/contacts` | 5.1.1 | ^5.1.1 | Contacts | Third-party plugin |
| `lucide-react` | 1.17.0 | ^1.17.0 | Icons | Current |
| `recharts` | 3.8.1 | ^3.8.1 | Charts | Heavy (see PERFORMANCE-002) |
| `jspdf` | 4.2.1 | ^4.2.1 | PDF | Heavier than necessary for offline report cards (see PERFORMANCE-002) |
| `jspdf-autotable` | 5.0.8 | ^5.0.8 | PDF tables | Version-paired with jspdf 4.x — verified usage in `pdfReport.js` ✓ |
| `tesseract.js` | 7.0.0 | ^7.0.0 | OCR | Largest supply-chain/runtime risk (CDN-traineddata; see SEC-005/PERFORMANCE-004) |

## 2. Installed dev dependencies

| Package | Resolved | Assessment |
|---------|----------|------------|
| `vite` | 4.5.14 | **Aging** — Vite 4 (2023). Toolchain is two+ majors behind; esbuild/rollup bundles carry an unquantified patch risk. Recommend upgrade to current Vite + re-verify build. |
| `vitest` | 0.34.6 | **Aging** — Vitest 0.x (2023). Works with Vite 4; locked to the old toolchain. |
| `@vitejs/plugin-react` | 3.1.0 | Matches Vite 4 era |
| `eslint` | ^8.53.0 | ESLint 8 (flat-config is 9+); acceptable |
| `tailwindcss` | ^3.4.19 | Current 3.x line |
| `@capacitor/assets` | ^3.0.0 | Matches Capacitor 5 |

## 3. Findings

### DEP-001 — Runtime dependencies are internally consistent (verified)
Peer/version checks pass locally for the pairing that matters most:
- `react-i18next 17.0.8` ⇄ `i18next 26.3.1` ✓
- `jspdf-autotable 5.0.8` ⇄ `jspdf 4.2.1` ✓ (API used in `pdfReport.js`)
- All Capacitor 5.x plugins ⇄ `@capacitor/core 5.7.8` ✓
No duplicate-version conflicts were found among the runtime packages.

### DEP-002 — Toolchain is two+ years stale (Vite 4 / Vitest 0.34)
- **Risk:** medium. Old bundlers miss build-time performance/size improvements and accumulate patched vulnerabilities; Vitest 0.34 lacks modern coverage providers (`@vitest/coverage-v8`), which blocks the coverage gate recommended in TEST_COVERAGE_REPORT.
- **Action:** plan an upgrade to current Vite (with matching `@vitejs/plugin-react`) and Vitest (with `@vitest/coverage-v8`); re-run the full 547-test suite and the Android build after.

### DEP-003 — `tesseract.js` is the biggest supply-chain surface
- Downloads WASM + `eng.traineddata` from a CDN by default. This is both a **privacy** issue (external network call from an offline-first finance app) and an **availability** issue (OCR fails offline). Bundle locally or gate behind connectivity. (SEC-005, PERFORMANCE-004.)

### DEP-004 — Third-party native plugins are single-maintainer ecosystem
`@aparajita/capacitor-biometric-auth` and `@capacitor-community/contacts` are community plugins. Both are pinned within major 5.x and were chosen deliberately (biometrics for the lock screen; contacts for person linking). Recommend:
- verify these plugins are not stale relative to Capacitor 5; 
- keep them pinned (no auto-major) so a native rebuild doesn't drift from the JS API used in `biometrics.js`.

### DEP-005 — No lockfile hygiene at repo root
- Root `package-lock.json` is a **105-byte stub**, not the real lockfile (`shyblack/package-lock.json` is the real one). Committing a stale root lockfile invites confusion and broken `npm ci` runs from the root. (Also noted in SECURITY_REPORT SEC-007.)

### DEP-006 — Engine floor is Node ≥20
- `package.json:38` — fine for 2026 tooling; no action needed, but the Vitest 0.34 test runner predates it and is why `setup.cjs` has to polyfill `Blob`/`crypto` that Node 20 already provides. Another reason to upgrade Vitest.

## 4. Recommended actions

| # | Action | Priority |
|---|--------|----------|
| 1 | Run `npm audit` on the build machine; log results in this file | Before release |
| 2 | Pin/verify Capacitor 5.x and both community plugins still receive updates | Before release |
| 3 | Upgrade Vite + Vitest toolchain (with coverage provider) | Short-term |
| 4 | Bundle tesseract.js assets locally or gate OCR | Short-term |
| 5 | Delete the root `package-lock.json` stub; document `npm ci` in `shyblack/` | Housekeeping |
| 6 | Consider dynamic-import for `jspdf` to keep the Reports chunk small | Short-term (PERFORMANCE-002) |
