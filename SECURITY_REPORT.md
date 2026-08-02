# Security Report — Expense Tracker ShyBlack (finora v1.1.0)

- **Audit date:** 2026-08-02
- **Scope:** All source under `shyblack/`, Android native config, and the git repository root.
- **Threat model:** Client-only finance app (no backend, no network API). Data lives in the device WebView's `localStorage`/IndexedDB. Primary attacker: anyone with (a) access to the git repository / build artifacts, or (b) physical or filesystem access to an unlocked or rooted device.

Severity: **P0** = release-blocking, **P1** = high, **P2** = medium, **P3** = low.

---

## P0 — Critical

### SEC-001 — Android release signing keystore is committed to the repository
- **File:** `<repo root>/shyblack-release-key.jks` (2,668 bytes, tracked in git).
- **Evidence:** `git ls-files` lists `shyblack-release-key.jks`. It was added in commit `11f2be7` ("Various updates and cleanup"). `.gitignore` (`shyblack/.gitignore:26-28`) lists `android/keystore.properties`, `*.jks`, `*.keystore` — but `.gitignore` only affects *untracked* files, so the keystore remains tracked and is present in the repository and its history. No `keystore.properties` file was found, which means the keystore is likely being referenced directly (or copied into `android/`) for signing builds.
- **Impact:** Anyone with repository access (or access to any clone, backup, or CI artifact of the repo) possesses the production signing key. They can sign a malicious build that the Android system / Play Store update mechanism will accept as the legitimate app — i.e. silent app replacement / persistent backdoor on users' devices, plus forgery of future updates. This is the single most severe issue in the project.
- **Remediation (must ship with the release):**
  1. Assume the keystore is compromised. Generate a fresh keypair and a **new alias/keystore**, or — if the app is already published — you must keep the same signing identity (Google Play App Signing: upload key vs. app signing key; if only the *upload* key leaked, rotate it via Play Console; if the *app signing* key leaked, contact Google Play support).
  2. `git rm --cached shyblack-release-key.jks`, add a `.gitignore` entry (already present), and **rewrite history** (BFG / `git filter-repo`) because the key still lives in old commits.
  3. Store the keystore outside the repo (secret manager / offline vault). Add a `keystore.properties` template that is committed and whose real values are injected at build time.
  4. Remove `hs_err_pid13080.log` (JVM crash dump) from the repo for hygiene (see SEC-007).

---

## P1 — High

### SEC-002 — PIN lock is not backed by a KDF; hash is brute-forceable
- **File:** `shyblack/src/utils/privacy.js:48-52`
- **Details:** `pinHash = SHA-256(pinSalt + pin)`, single pass. A 4–6 digit PIN space is ~10⁴–10⁶; even offline this is enumerable in seconds with WebCrypto, and in milliseconds with GPU/hashcat. The salt prevents rainbow tables but not brute force.
- **Mitigations already present (good):** malformed-hash detection forces `requiresReset` instead of clearing data (`privacy.js:20-26`), 5-failure 30s cooldown and 10-failure lockout (`privacy.js:5-7`), PIN hash only (plaintext PIN never stored).
- **Recommendation:** Migrate to PBKDF2-SHA256 (≥100k iterations) via WebCrypto; keep the existing cooldown/lockout and `requiresReset` logic. Note that full protection of on-device data requires real encryption at rest (see SEC-004) — a PIN hash alone is a deterrent, not confidentiality.

### SEC-003 — Financial data stored in plaintext in localStorage / IndexedDB
- **Files:** `shyblack/src/utils/safeStorage.js`, `storageAdapter.js`, `schema.js`
- **Details:** All transactions, budgets, debts, EMIs, documents, wealth assets, and backups are serialised and stored without encryption (adapter-backed `shyblack_*` keys; document files as data URIs under `shyblack_document_files`). "Privacy mode" only hides balances on screen; it does not encrypt data.
- **Impact:** On a rooted/compromised device, or via WebView cache/snapshot extraction, all financial history is readable. For a client-only app this is common, but for a finance app the data is highly sensitive (transaction history, contacts linked to debts, scanned receipts/documents).
- **Recommendation (roadmap):** Add optional encryption at rest using the WebCrypto AES-GCM key stored via the Capacitor platform keystore / biometric auth (`@aparajita/capacitor-biometric-auth` is already a dependency). Encrypt at least `transactions`, `documents`, `document_files`, `debts`, `wealth_assets`. Keep backwards-compatible migration for existing plaintext keys.

---

## P2 — Medium

### SEC-004 — No Content-Security-Policy header/meta
- **File:** `shyblack/index.html` — no `<meta http-equiv="Content-Security-Policy" ...>`.
- **Details:** The app is bundled into a Capacitor WebView; there are no third-party origins loaded at runtime except tesseract.js worker assets (see SEC-005). The main risk is self-XSS through the *exported HTML reports*.
- **Note:** `exportWithChartsToHTML` (`exports.js:200-296`) and `generateStatementHTML` (`exports.js:504-546`) interpolate transaction `note`/category/label text into generated HTML files. A note containing HTML/script markup is rendered when the exported file is opened. Because the data is the user's own, this is self-XSS only — but it is a vector if a document/export is shared with another person. Sanitise note text (escape `<`, `>`, `&`) when embedding into HTML.
- **Recommendation:** HTML-escape all user text in generated reports and add a restrictive CSP meta to `index.html` (e.g. `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'`).

### SEC-005 — tesseract.js downloads OCR assets at runtime (network dependence + supply chain)
- **File:** `shyblack/package.json:35` — `tesseract.js ^7.0.0`
- **Details:** By default `tesseract.js` fetches the worker, WASM core, and language traineddata from a CDN. This app is **offline-first** (no network APIs elsewhere), so receipt OCR will fail without connectivity unless the assets are bundled locally. Fetching from a CDN also means a runtime network dependency in a privacy-focused app.
- **Recommendation:** Bundle the traineddata/WASM assets into the app (`capacitor assets` or static `public/`) and point `createWorker('eng', 1, { langPath, workerPath, corePath })` at local paths, or gate OCR behind a connectivity check. (See PERFORMANCE-004.)

### SEC-006 — `READ_CONTACTS` permission declared
- **File:** `shyblack/android/app/src/main/AndroidManifest.xml:43`
- **Details:** `android.permission.READ_CONTACTS` is declared and `@capacitor-community/contacts` is a dependency. Used for person pickers (debt/relationship contacts).
- **Impact:** Broadest-scope permission in the app; Google Play requires a declared purpose. Ensure the Play Store listing states the purpose and that the permission is only requested when the user explicitly invokes contact linking (not on launch).
- **Good already:** `android:allowBackup="false"` (`AndroidManifest.xml:5`), storage permissions capped by `maxSdkVersion` (`:46,48`), broad media permissions stripped (`:70-72`), and exact-alarm permissions stripped (`:61-62`) — all correct choices for this app and Play policy.

### SEC-007 — Build-machine crash logs and stale artifacts committed
- **Files:** `<repo root>/hs_err_pid13080.log`, `<repo root>/package-lock.json` (105 bytes), `<repo root>/PRODUCTION_AUDIT_REPORT.md`
- **Details:** A JVM crash dump is tracked at the repo root (can expose machine paths / JVM config). The root `package-lock.json` is a 105-byte stub that is not the real lockfile (the real one is `shyblack/package-lock.json`) — stale lockfile confusion in the repo root.
- **Remediation:** `git rm` the crash log and root lockfile stub; extend `.gitignore` with `hs_err_pid*.log`, `*.log`.

### SEC-008 — No runtime crash reporting or integrity checks in production build
- **Details:** No crash-reporting SDK (deliberately — privacy-friendly), but also no in-app capture of uncaught exceptions. The two P0 crashes (BUG-001, BUG-002) would surface only as blank screens with no diagnostic trail.
- **Recommendation:** Add a minimal in-app error boundary + error log that writes to `safeStorage` (`shyblack_errors`) and can be exported from the Diagnostics page (a `DiagnosticsPage.jsx` already exists). Do not add third-party telemetry.

---

## Security Strengths (verified)

- No `dangerouslySetInnerHTML`, `eval`, or dynamic code execution found anywhere in `src/` (agent scan of all components/pages).
- `android:allowBackup="false"` — WebView data is not cloud-backed up by default.
- Exact-alarm and broad-media permissions explicitly stripped from the manifest.
- PIN lockout/cooldown and tamper-resistant `requiresReset` handling in `privacy.js`.
- No analytics/tracking SDKs; fully offline; no backend endpoints exist.
- `@aparajita/capacitor-biometric-auth` available for biometric gating of the lock screen.

---

## Priority Action List

| # | Action | Severity | Owner |
|---|--------|----------|-------|
| 1 | Rotate the leaked release keystore; purge from git history | P0 | Release owner |
| 2 | Fix BUG-001 / BUG-002 (crashes) before any release | P0 | Dev |
| 3 | PBKDF2 migration for PIN hashing | P1 | Dev |
| 4 | HTML-escape user text in exported reports; add CSP meta | P2 | Dev |
| 5 | Bundle tesseract.js OCR assets (no CDN) or gate behind connectivity | P2 | Dev |
| 6 | Optional AES-GCM encryption at rest for sensitive keys | P1 (roadmap) | Dev |
| 7 | Remove `hs_err_pid*.log` + root lockfile stub from git; extend `.gitignore` | P3 | Dev |
| 8 | Justify `READ_CONTACTS` in Play listing; request only on explicit action | P3 | Release owner |
