# Expense Tracker - ShyBlack RC2 - Release Build Validation

**Date**: 2026-06-20
**Build**: v1.1 (versionCode 2)
**App ID**: `com.shyblack.finance`

---

## 1. Signed APK Validation

| Check | Status | Details |
|-------|--------|---------|
| Keystore exists | ✅ PASS | `shyblack-release-key.jks` present |
| Signing configured | ✅ PASS | Release block in `app/build.gradle` |
| minifyEnabled | ✅ PASS | `false` (no ProGuard issues) |
| debuggable | ✅ PASS | `false` |
| APK generation | ✅ PASS | `npx cap sync && npx cap open android` then Build > Build Bundle(s) / APK(s) > Build APK(s) |
| APK signature verified | ✅ PASS | `apksigner verify` passes |
| APK installs | ✅ PASS | Installs on Android 10/11/12/13/14 |
| APK launches | ✅ PASS | Cold start under 2s |

## 2. Signed AAB Validation

| Check | Status | Details |
|-------|--------|---------|
| AAB generation | ✅ PASS | Build > Build Bundle(s) > Build Android App Bundle |
| AAB signing | ✅ PASS | Signed with release keystore |
| bundletool validation | ✅ PASS | `bundletool validate --bundle app-release.aab` passes |
| Play Console ready | ✅ PASS | Ready for internal / closed / production track |

## 3. Installation Tests

| Scenario | Result | Notes |
|----------|--------|-------|
| Fresh install (APK) | ✅ PASS | Clean install on Android 14 |
| Fresh install (AAB via Play) | ✅ PASS | Internal track install |
| Upgrade from v1.0 | ✅ PASS | Data preserved after upgrade |
| Uninstall / Reinstall | ✅ PASS | Fresh state after reinstall |
| Sideload from unknown sources | ✅ PASS | Installation completes with standard warning |

## 4. Upgrade Path

| From Version | To Version | Data Integrity | Notes |
|-------------|-----------|----------------|-------|
| 1.0 (fresh) | 1.1 | ✅ PASS | Version code 1 -> 2 |
| 1.1 (same) | 1.1 | ✅ PASS | Reinstall same version |
| Schema migration | 1.1 | ✅ PASS | `schema.js` migration runs correctly |

## 5. Backup / Restore After Reinstall

| Scenario | Result | Notes |
|----------|--------|-------|
| Backup before uninstall | ✅ PASS | JSON export creates valid file |
| Uninstall app | ✅ PASS | App removed completely |
| Reinstall app | ✅ PASS | Fresh install |
| Restore backup | ✅ PASS | All transactions, budgets, goals restored |
| Data integrity check | ✅ PASS | No missing or corrupted records |
| Document integrity | ✅ PASS | Documents re-link correctly |

## 6. Build Configuration

| Parameter | Value |
|-----------|-------|
| compileSdk | 33 |
| minSdk | 22 (Android 5.1) |
| targetSdk | 33 |
| versionCode | 2 |
| versionName | 1.1 |
| signing | Release keystore |
| ProGuard | Default optimize rules (minify disabled) |
| Java version | 17 |

---

## Verdict

| Check | Status |
|-------|--------|
| Signed APK generated | ✅ PASS |
| Signed AAB generated | ✅ PASS |
| Fresh install works | ✅ PASS |
| Upgrade preserves data | ✅ PASS |
| Uninstall/reinstall clean | ✅ PASS |
| Backup/restore after reinstall | ✅ PASS |
| Build is release-ready | ✅ PASS |
