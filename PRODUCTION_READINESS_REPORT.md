# Production Readiness Report — Expense Tracker ShyBlack (finora v1.1.0)

- **Audit date:** 2026-08-02
- **Target:** Android (Capacitor 5), Google Play distribution.
- **Verdict:** **NOT READY** — release is blocked by 2 P0 functional crashes and 1 P0 security issue (leaked signing keystore). Every other dimension (Play-policy hygiene, offline design, data durability) is in good or excellent shape.

---

## 1. Release gates

| Gate | Status | Evidence |
|------|--------|----------|
| G1 — No P0 crashes | **FAIL** | BUG-001 `ReportsPage.jsx:315`, BUG-002 `DocumentVaultPage.jsx:246,664` |
| G2 — No secret leakage | **FAIL** | `shyblack-release-key.jks` tracked in git (SEC-001) |
| G3 — Build & test pass | PASS (assumed from last release) | 547 tests; `npm run build` history clean in git log (recent commits are Play-store fixups) |
| G4 — Play policy compliance | PASS | `allowBackup=false`, exact-alarm + broad-media permissions stripped (`AndroidManifest.xml:5,61-72`), scoped storage respected |
| G5 — Versioning & asset pipeline | PASS | `capacitor.config.json` appId `com.shyblack.finance`; version 1.1.0; logo/assets present |
| G6 — Signing integrity | **FAIL** | Signing key is in the repo (SEC-001) |

**G1 + G2 must be resolved before the next release build.**

---

## 2. Strengths (verified)

- **Offline-first, no network surface.** No backend, no analytics, no tracking SDKs. Ideal for a personal finance app from a privacy standpoint.
- **Play-policy hygiene is unusually clean.** `android:allowBackup="false"` prevents cloud backup of WebView data; `READ_EXTERNAL_STORAGE` capped at API 32; `READ_MEDIA_*` and exact-alarm permissions explicitly stripped with documented rationale in the manifest.
- **Data durability.** Backup generations with checksums + retention (max 10), snapshot recovery before imports, schema validation, integrity audits — production-grade for a client-only app.
- **Biometric + PIN gating** with cooldown/lockout and tamper-resistant reset logic.
- **Real device + release validation docs exist** (`rc2/REAL_DEVICE_TEST_MATRIX.md`, `rc2/RELEASE_BUILD_VALIDATION.md`, `rc2/STRESS_TEST_RESULTS.md`).

## 3. Gaps for production

### 3.1 Functional (blocking)
1. **Reports export scope buttons crash** (BUG-001). The Reports page is a headline feature; any user with ≥1 transaction who taps an export scope hits a blank/crashed screen.
2. **Document Vault viewer cannot open** (BUG-002). Receipt/document storage unusable.

### 3.2 Security (blocking)
3. **Release keystore in git history** (SEC-001). Even if removed now, the key is recoverable from history unless rewritten. If the app is already published with this key, assess whether the *app signing key* or only the *upload key* is at risk and follow Google Play's rotation/disable path accordingly.

### 3.3 Non-blocking but recommended before scaling users
4. **No error-reporting surface.** A blank-screen crash (the P0s) leaves no trace. Add an error boundary + local error log exportable from the existing Diagnostics page.
5. **No CI.** `lint` and `test` exist as scripts but nothing enforces them on commit. Both P0s and the AnimatedNumber/GlassCard bugs are exactly what a CI quality gate would catch.
6. **Toolchain age** (Vite 4 / Vitest 0.34) and the CDN-dependent OCR path (SEC-005/PERFORMANCE-004).
7. **`README_CONTACTS` justification** for Play review (purpose must be declared in the store listing).

## 4. Release checklist (updated)

- [ ] Fix BUG-001 (ReportsPage) and BUG-002 (DocumentVaultPage); add regression tests.
- [ ] Rotate signing key; purge keystore from git history; move signing to an out-of-repo secret store with `keystore.properties` template.
- [ ] Fix BUG-005 (subscriptions pause deletes data) — data-loss UX is a store-review risk.
- [ ] Fix BUG-006 (wrong-month statement) — financial misreporting.
- [ ] Remove `hs_err_pid*.log` and root lockfile stub from git; extend `.gitignore`.
- [ ] Run `npm audit`; record results.
- [ ] Re-run full test suite (`547` cases) + `npm run build` + `cap:sync`.
- [ ] Re-run the manual device matrix in `rc2/REAL_DEVICE_TEST_MATRIX.md`.
- [ ] (Recommended) add CI gate: `npm run lint && npm test`; coverage provider; error boundary + local error log.

## 5. Post-release roadmap (next iteration)

- Encryption at rest for sensitive keys (AES-GCM via platform keystore + biometric auth already present).
- PBKDF2 migration for PIN hashing.
- Vite/Vitest toolchain upgrade with coverage gates.
- FinanceContext split and debt data-model normalisation (ARCHITECTURE_REVIEW 3.1/3.2).
