### Summary
- **ReportsPage.jsx** already exists and is registered as `reports` route
- `Settings.jsx` at line 437 already has a `Reports & Export` → `onNavigate('reports')` link
- **No jsPDF** installed yet; dependency needed
- **No React Router** — navigation is state-based via `pages` map in `App.jsx`
- Analytics utils (`getMonthlyData`, `getCategoryBreakdown`, etc.) are available for reuse
- Dashboard sections are numbered; no Reports link exists yet

### Plan
1. Install `jspdf` + `jspdf-autotable`
2. Create `src/utils/pdfReport.js` — standalone PDF builder with cover, summary cards, charts (drawn natively), transaction summary, and footers
3. Rewrite `src/pages/ReportsPage.jsx` — preserve existing CSV/HTML export, add PDF report type selection (Monthly/Category/Date Range/Annual), config, generate button, preview, download/share
4. Update `src/pages/Dashboard.jsx` — add Reports card in Quick Links section
5. Verify build (0 errors) and all 109 tests

### Build Rule (ALWAYS follow this workflow)
**NEVER use `.\gradlew.bat assembleDebug` directly.** Always follow this sequence:
1. `npm run build` — build the web app (Vite)
2. `npx cap sync android` — sync web assets to Android project
3. Open Android Studio and build APK from there (or use `npx cap run android`)

Do NOT skip steps or use Gradle directly.

