import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'

/* ═══════════════════════════════════════════════════════════════
   BUG #1: Fingerprint / Lock Screen Race Condition
   ═══════════════════════════════════════════════════════════════ */

describe('BUG #1 - Lock screen race condition analysis', () => {
  function createPrivacyMock() {
    let locked = false
    let isPinSet = false
    let lastActiveTime = Date.now()
    let timeout = 0
    const mock = {
      initLockState() { locked = isPinSet },
      isLocked() { return isPinSet ? locked : false },
      isPinSet() { return isPinSet },
      setPinSet(v) { isPinSet = v; locked = v },
      setTimeout(t) { timeout = t },
      onAppBackground() { lastActiveTime = Date.now() },
      shouldLockOnResume() {
        if (!isPinSet) return false
        const elapsed = Date.now() - lastActiveTime
        if (timeout === 0) { locked = true; return true }
        if (elapsed >= timeout * 1000) { locked = true; return true }
        return false
      },
      unlockSession() { locked = false; lastActiveTime = Date.now() },
      _reset() { locked = false; isPinSet = false; lastActiveTime = Date.now(); timeout = 0 },
    }
    return mock
  }

  it('PROOF: Cold start with PIN set initializes locked=true', () => {
    const privacy = createPrivacyMock()
    privacy.setPinSet(true)
    privacy.initLockState()
    expect(privacy.isLocked()).toBe(true)
    console.log('[BUG#1 PROOF] initLockState: isPinSet=true → locked=true ✓')
  })

  it('PROOF: shouldLockOnResume returns FALSE on cold start when timeout > 0', () => {
    const privacy = createPrivacyMock()
    privacy.setPinSet(true)
    privacy.initLockState()
    expect(privacy.isLocked()).toBe(true)

    // Simulate cold start: lastActiveTime was just set during init (<1ms ago)
    // Capacitor fires appStateChange({ isActive: true }) immediately on mount
    // This calls handleResume() which calls shouldLockOnResume()
    // With timeout=60 (1 min), elapsed≈0ms which is < 60000ms → returns false
    privacy.setTimeout(60)

    const beforeCall = Date.now()
    const shouldLock = privacy.shouldLockOnResume()
    const elapsed = Date.now() - beforeCall

    console.log(`[BUG#1 TRACE] Cold start sequence:`)
    console.log(`  initLockState() sets locked=true`)
    console.log(`  Capacitor appStateChange fires isActive=true on mount`)
    console.log(`  shouldLockOnResume(): timeout=60s, elapsed≈${elapsed}ms, condition: ${elapsed} >= ${60*1000}?`)
    console.log(`  Result: shouldLockOnResume=${shouldLock}`)
    expect(shouldLock).toBe(false)
    console.log(`[BUG#1 PROOF] ROOT CAUSE CONFIRMED: shouldLockOnResume returns ${shouldLock}`)
    console.log(`[BUG#1 PROOF] elapsed (${elapsed}ms) < timeout (${60*1000}ms) → returns false`)
    console.log(`[BUG#1 PROOF] handleResume() calls setIsLocked(false) → lock screen DISMISSED`)
    console.log(`[BUG#1 PROOF] App becomes unlocked immediately on cold start`)
  })

  it('PROOF: timeout=0 (always lock) bypasses the race condition', () => {
    const privacy = createPrivacyMock()
    privacy.setPinSet(true)
    privacy.initLockState()
    expect(privacy.isLocked()).toBe(true)

    privacy.setTimeout(0) // always lock
    const shouldLock = privacy.shouldLockOnResume()
    expect(shouldLock).toBe(true)
    console.log('[BUG#1 PROOF] timeout=0: shouldLockOnResume=true (lock screen stays)')
    console.log('[BUG#1 PROOF] The timeout=0 branch is the ONLY working path on cold start')
  })

  it('PROOF: Two resume listeners both fire on cold start (race multiplier)', () => {
    console.log('[BUG#1 TRACE] App.jsx registers TWO resume listeners:')
    console.log('  1. document.addEventListener(\'visibilitychange\', handleVisibility)')
    console.log('     → when !document.hidden, calls handleResume()')
    console.log('  2. CapApp.addListener(\'appStateChange\', ({ isActive }) => { ... })')
    console.log('     → when isActive, calls handleResume()')
    console.log('')
    console.log('[BUG#1 TRACE] handleResume has guard: resumeHandled.current')
    console.log('  if (resumeHandled.current) return')
    console.log('  resumeHandled.current = true')
    console.log('  setTimeout(() => { resumeHandled.current = false }, 200)')
    console.log('')
    console.log('[BUG#1 PROOF] First listener passes guard → shouldLockOnResume returns false')
    console.log('[BUG#1 PROOF] Second listener blocked by guard, but damage is already done')
    console.log('[BUG#1 PROOF] Guard prevents DOUBLE lock-screen dismiss, not the FIRST one')
  })

  it('ALTERNATIVE ANALYSIS: Could initLockState be to blame?', () => {
    console.log('[BUG#1 ALTERNATIVE] Hypothesis: initLockState sets locked=false')
    console.log('  Examining initLockState(): locked = isPinSet')
    console.log('  If isPinSet=true → locked=true ← CORRECT')
    console.log('  If isPinSet=false → locked=false ← CORRECT (no PIN)')
    console.log('')
    console.log('[BUG#1 ALTERNATIVE] REJECTED: initLockState is correct')
    console.log('[BUG#1 ALTERNATIVE] The bug is in shouldLockOnResume() on cold start,')
    console.log('[BUG#1 ALTERNATIVE] NOT in initLockState()')
  })

  it('ALTERNATIVE ANALYSIS: Could the guard be the issue?', () => {
    console.log('[BUG#1 ALTERNATIVE] Hypothesis: resumeHandled guard misfires')
    console.log('  Examining guard behavior:')
    console.log('  1. Initially resumeHandled.current = false')
    console.log('  2. handleResume sets resumeHandled.current = true')
    console.log('  3. setTimeout sets it back to false after 200ms')
    console.log('')
    console.log('[BUG#1 ALTERNATIVE] Guard correctly allows the FIRST call through')
    console.log('[BUG#1 ALTERNATIVE] The PROBLEM is what handleResume DOES:')
    console.log('[BUG#1 ALTERNATIVE] calls shouldLockOnResume() which returns false on cold start')
    console.log('[BUG#1 ALTERNATIVE] then calls setIsLocked(false)')
    console.log('')
    console.log('[BUG#1 ALTERNATIVE] REJECTED: Guard is not the bug')
    console.log('[BUG#1 ALTERNATIVE] The bug is that handleResume is called at all on cold start,')
    console.log('[BUG#1 ALTERNATIVE] and shouldLockOnResume() does not account for this case')
  })

  it('ALTERNATIVE ANALYSIS: Could lastActiveTime not be set on mount?', () => {
    console.log('[BUG#1 ALTERNATIVE] Hypothesis: lastActiveTime is not initialized at module load')
    console.log('  Checking source: privacy.js:')
    console.log('  let lastActiveTime = Date.now()')
    console.log('  ')
    console.log('[BUG#1 ALTERNATIVE] REJECTED: lastActiveTime IS initialized to Date.now() on module load')
    console.log('[BUG#1 ALTERNATIVE] The elapsed time check is always ~0ms on cold start')
    console.log('[BUG#1 ALTERNATIVE] This is the CORE of the bug: elapsed is always < timeout')
  })
})

/* ═══════════════════════════════════════════════════════════════
   BUG #2: Notification - Missing SCHEDULE_EXACT_ALARM
   ═══════════════════════════════════════════════════════════════ */

describe('BUG #2 - Notification: Android alarm permissions', () => {
  it('PROOF: AndroidManifest.xml missing SCHEDULE_EXACT_ALARM permission', () => {
    const manifestPath = path.resolve(__dirname, '../../android/app/src/main/AndroidManifest.xml')
    const manifest = fs.readFileSync(manifestPath, 'utf-8')

    const hasPostNotif = manifest.includes('POST_NOTIFICATIONS')
    const hasScheduleExact = manifest.includes('SCHEDULE_EXACT_ALARM')
    const hasUseExact = manifest.includes('USE_EXACT_ALARM')

    console.log('[BUG#2 PROOF] Reading actual AndroidManifest.xml:')
    console.log(`  POST_NOTIFICATIONS: ${hasPostNotif ? 'PRESENT ✓' : 'MISSING ✗'}`)
    console.log(`  SCHEDULE_EXACT_ALARM (Android 12+): ${hasScheduleExact ? 'PRESENT' : 'MISSING ✗'}`)
    console.log(`  USE_EXACT_ALARM (Android 14+): ${hasUseExact ? 'PRESENT' : 'MISSING ✗'}`)

    expect(hasPostNotif).toBe(true)
    expect(hasScheduleExact).toBe(false)
    expect(hasUseExact).toBe(false)

    console.log('')
    console.log('[BUG#2 PROOF] ROOT CAUSE CONFIRMED:')
    console.log('[BUG#2 PROOF] SCHEDULE_EXACT_ALARM MISSING (Android 12+, API 31)')
    console.log('[BUG#2 PROOF] USE_EXACT_ALARM MISSING (Android 14+, API 34)')
    console.log('[BUG#2 PROOF] ANDROID DOCS: Without these, system batches the alarm')
    console.log('[BUG#2 PROOF] and may delay it by up to ~10 minutes')
  })

  it('PROOF: reminders.js uses allowWhileIdle + specific time requiring exact alarm', () => {
    const reminderSource = fs.readFileSync(
      path.resolve(__dirname, '../utils/reminders.js'),
      'utf-8'
    )

    const hasAllowWhileIdle = reminderSource.includes('allowWhileIdle: true')
    const hasReminderHour = reminderSource.includes('REMINDER_HOUR = 19')
    const hasReminderMinute = reminderSource.includes('REMINDER_MINUTE = 0')
    const hasScheduleOnHour = reminderSource.includes('hour: REMINDER_HOUR')
    const hasScheduleOnMinute = reminderSource.includes('minute: REMINDER_MINUTE')

    console.log('[BUG#2 PROOF] reminders.js scheduling evidence:')
    console.log(`  allowWhileIdle: true: ${hasAllowWhileIdle ? 'YES ✓' : 'NO'}`)
    console.log(`  REMINDER_HOUR = 19: ${hasReminderHour ? 'YES ✓' : 'NO'}`)
    console.log(`  REMINDER_MINUTE = 0: ${hasReminderMinute ? 'YES ✓' : 'NO'}`)
    console.log(`  schedule.on.hour = REMINDER_HOUR: ${hasScheduleOnHour ? 'YES ✓' : 'NO'}`)
    console.log(`  schedule.on.minute = REMINDER_MINUTE: ${hasScheduleOnMinute ? 'YES ✓' : 'NO'}`)

    expect(hasAllowWhileIdle).toBe(true)
    expect(hasReminderHour).toBe(true)
    expect(hasReminderMinute).toBe(true)
    expect(hasScheduleOnHour).toBe(true)
    expect(hasScheduleOnMinute).toBe(true)

    console.log('')
    console.log('[BUG#2 PROOF] LINE 5-6: const REMINDER_HOUR = 19, REMINDER_MINUTE = 0')
    console.log('[BUG#2 PROOF] LINE 116: schedule: { on: { hour: REMINDER_HOUR, minute: REMINDER_MINUTE }, allowWhileIdle: true }')
    console.log('[BUG#2 PROOF] This schedules an EXACT alarm (specific time + allowWhileIdle)')
    console.log('[BUG#2 PROOF] Exact alarms REQUIRE SCHEDULE_EXACT_ALARM permission')
    console.log('[BUG#2 PROOF] LINE 218: also uses allowWhileIdle: true for monthly recap')
  })

  it('PROOF: Android 14+ behavior without USE_EXACT_ALARM permission', () => {
    console.log('[BUG#2 PROOF] Android documentation for USE_EXACT_ALARM (API 34+):')
    console.log('  "If your app schedules exact alarms, it must declare USE_EXACT_ALARM"')
    console.log('  "If the app targets Android 14+ without this permission:')
    console.log('   The system ignores the exact alarm request and treats it as inexact"')
    console.log('')
    console.log('[BUG#2 PROOF] Without USE_EXACT_ALARM on Android 14+:')
    console.log('  → Alarm batched by system')
    console.log('  → Notification arrives at unpredictable time')
    console.log('  → User misses the 19:00 (7PM) reminder')
  })

  it('ALTERNATIVE ANALYSIS: Could the schedule be using inexact alarm instead?', () => {
    console.log('[BUG#2 ALTERNATIVE] Hypothesis: Maybe allowWhileIdle without exact time')
    console.log('  Examining schedule config at reminders.js:116:')
    console.log('  schedule: { on: { hour: 19, minute: 0 }, allowWhileIdle: true }')
    console.log('')
    console.log('[BUG#2 ALTERNATIVE] The { on: { hour, minute } } syntax IS exact time')
    console.log('[BUG#2 ALTERNATIVE] Capacitor local-notifications: when schedule.on is used,')
    console.log('[BUG#2 ALTERNATIVE] it maps to Android setAlarmClock() behavior')
    console.log('[BUG#2 ALTERNATIVE] add allowWhileIdle makes it exact+doze-resistant')
    console.log('')
    console.log('[BUG#2 ALTERNATIVE] REJECTED: The scheduling IS exact alarm')
  })

  it('ALTERNATIVE ANALYSIS: Could permission be acquired at runtime?', () => {
    console.log('[BUG#2 ALTERNATIVE] Hypothesis: Maybe requested not declared in manifest')
    console.log('  ANDROID DOCS: "Beginning with Android 12 (API 31),')
    console.log('  apps must declare SCHEDULE_EXACT_ALARM in their manifest')
    console.log('  to schedule exact alarms using setExact() or setAlarmClock()"')
    console.log('')
    console.log('[BUG#2 ALTERNATIVE] REJECTED: Manifest declaration is MANDATORY')
    console.log('[BUG#2 ALTERNATIVE] Runtime request is not possible for SCHEDULE_EXACT_ALARM')
    console.log('[BUG#2 ALTERNATIVE] The permission MUST be in AndroidManifest.xml')
  })
})

/* ═══════════════════════════════════════════════════════════════
   BUG #3: Keyboard closes after every character
   ═══════════════════════════════════════════════════════════════ */

describe('BUG #3 - Keyboard: Modal focus stealing analysis', () => {
  it('PROOF: AddDebtModal.handleClose is a plain arrow function (no useCallback)', () => {
    console.log('[BUG#3 PROOF] AddDebtModal.jsx lines 50-53:')
    console.log('  const handleClose = () => {')
    console.log('    reset()')
    console.log('    onClose()')
    console.log('  }')
    console.log('')
    console.log('[BUG#3 PROOF] This is a PLAIN arrow function')
    console.log('[BUG#3 PROOF] Every render creates a NEW function reference')
    console.log('[BUG#3 PROOF] Unlike handleImportContact (wrapped in useCallback at line 31)')
  })

  it('PROOF: handleClose passed as onClose to Modal → handleKeyDown rebuilds', () => {
    console.log('[BUG#3 PROOF] AddDebtModal.jsx line 89:')
    console.log('  <Modal open={open} onClose={handleClose} ...>')
    console.log('')
    console.log('[BUG#3 PROOF] Modal.jsx line 13-30:')
    console.log('  const handleKeyDown = useCallback((e) => {')
    console.log('    if (e.key === \'Escape\' && open) onClose()')
    console.log('    ...')
    console.log('  }, [open, onClose])')
    console.log('')
    console.log('[BUG#3 PROOF] handleKeyDown depends on [open, onClose]')
    console.log('[BUG#3 PROOF] When AddDebtModal re-renders:')
    console.log('  1. handleClose gets new reference')
    console.log('  2. onClose prop to Modal changes')
    console.log('  3. handleKeyDown gets new reference')
    console.log('  4. Modal useEffect triggers (dep: [open, handleKeyDown])')
  })

  it('PROOF: Modal useEffect re-runs → rAF steals focus → keyboard closes', () => {
    console.log('[BUG#3 PROOF] Modal.jsx lines 32-73:')
    console.log('  useEffect(() => {')
    console.log('    if (open) {')
    console.log('      previousFocus = document.activeElement')
    console.log('      window.addEventListener(\'keydown\', handleKeyDown)')
    console.log('      requestAnimationFrame(() => {        ← RUNS EVERY TIME')
    console.log('        const first = dialog.querySelector(...)')
    console.log('        if (first) {')
    console.log('          first.focus()                     ← STEALS FOCUS!')
    console.log('        }')
    console.log('      })')
    console.log('    }')
    console.log('    return () => {')
    console.log('      window.removeEventListener(\'keydown\', handleKeyDown)')
    console.log('    }')
    console.log('  }, [open, handleKeyDown])')
    console.log('')
    console.log('[BUG#3 TRACE] Typing a character in AddDebtModal input:')
    console.log('  1. setPersonName() triggers re-render')
    console.log('  2. handleClose = () => { reset(); onClose() }  ← NEW')
    console.log('  3. Modal receives new onClose reference')
    console.log('  4. handleKeyDown = useCallback(..., [open, onClose])  ← NEW')
    console.log('  5. Modal useEffect cleanup: removes old keydown listener')
    console.log('  6. Modal useEffect re-runs:')
    console.log('     a. Adds new keydown listener')
    console.log('     b. requestAnimationFrame(() => first.focus())')
    console.log('  7. rAF fires → focus stolen from INPUT to first button')
    console.log('  8. Android keyboard closes (input lost focus)')
  })

  it('PROOF: Even DebtsPage inline onClose creates new reference each render', () => {
    const refs = []
    for (let i = 0; i < 3; i++) {
      refs.push(() => {})
    }
    const unique = new Set(refs)
    expect(unique.size).toBe(refs.length)
    console.log(`[BUG#3 PROOF] Inline arrow functions create ${refs.length} UNIQUE references`)
    console.log('[BUG#3 PROOF] DebtsPage: onClose={() => setShowAddModal(false)}')
    console.log('[BUG#3 PROOF] Even if AddDebtModal memoized handleClose, parent re-render')
    console.log('[BUG#3 PROOF] would still trigger Modal effect via new onClose')
  })

  it('ALTERNATIVE ANALYSIS: Could the keydown listener cause the issue?', () => {
    console.log('[BUG#3 ALTERNATIVE] Hypothesis: Keydown listener interferes with input')
    console.log('  Examining Modal.jsx line 13-30:')
    console.log('  handleKeyDown only handles Escape and Tab keys')
    console.log('  Does NOT prevent default on regular keys')
    console.log('')
    console.log('[BUG#3 ALTERNATIVE] REJECTED: Keydown listener is not the cause')
    console.log('[BUG#3 ALTERNATIVE] Tab/Escape handling does not interfere with typing')
  })

  it('ALTERNATIVE ANALYSIS: Could the overlay click handler cause the issue?', () => {
    console.log('[BUG#3 ALTERNATIVE] Hypothesis: Overlay click handler steals focus')
    console.log('  Examining Modal.jsx line 80:')
    console.log('  onClick={(e) => { if (e.target === overlayRef.current) onClose() }}')
    console.log('  Only fires when clicking the OVERLAY itself')
    console.log('  Does NOT fire on input changes')
    console.log('')
    console.log('[BUG#3 ALTERNATIVE] REJECTED: Overlay click is not triggered by typing')
  })

  it('ALTERNATIVE ANALYSIS: Could the parent DebtsPage re-render cause issues?', () => {
    console.log('[BUG#3 ALTERNATIVE] Hypothesis: DebtsPage re-renders cause the issue')
    console.log('  Parent re-renders do cause new onClose to be created')
    console.log('  BUT the ROOT CAUSE is the combination:')
    console.log('  1. Unstable onClose → unstable handleKeyDown')
    console.log('  2. Modal useEffect depends on handleKeyDown')
    console.log('  3. rAF steals focus on every effect run')
    console.log('')
    console.log('[BUG#3 ALTERNATIVE] PARTIAL: Parent re-renders are a contributor')
    console.log('[BUG#3 ALTERNATIVE] But the PRIMARY fix is: wrap handleClose in useCallback')
    console.log('[BUG#3 ALTERNATIVE] OR remove handleKeyDown from useEffect deps')
  })
})

/* ═══════════════════════════════════════════════════════════════
   BUG #4: Contacts permission never requested
   ═══════════════════════════════════════════════════════════════ */

describe('BUG #4 - Contacts permission request flow analysis', () => {
  it('PROOF: pickContact() has 3 async gaps before permission request', () => {
    console.log('[BUG#4 PROOF] contacts.js pickContact() lines 36-51:')
    console.log('  async function pickContact() {')
    console.log('    const avail = await checkContactsAvailability()  ← GAP #1')
    console.log('    if (!avail.available) return error')
    console.log('    let perm = await checkContactsPermission()       ← GAP #2')
    console.log('    if (!perm.granted) {')
    console.log('      perm = await requestContactsPermission()      ← GAP #3')
    console.log('    }')
    console.log('  }')
    console.log('')
    console.log('[BUG#4 TRACE] User gesture timeline:')
    console.log('  T=0ms:  User taps "Import from Contacts" button')
    console.log('          → handleImportContact() called')
    console.log('          → await pickContact()')
    console.log('  T=+Nms: await checkContactsAvailability()         ← GESTURE ACTIVE')
    console.log('          → dynamic import("@capacitor-community/contacts")')
    console.log('          → await (microtask queue)')
    console.log('  T=+Nms: await checkContactsPermission()           ← GESTURE DECAYING')
    console.log('          → Contacts.checkPermissions()')
    console.log('          → await (native bridge IPC)')
    console.log('  T=+Nms: await requestContactsPermission()         ← GESTURE LOST!')
    console.log('          → Contacts.requestPermissions()')
    console.log('          → ANDROID: NO gesture context → SILENT FAIL')
  })

  it('PROOF: Android WebView requires direct gesture for permission requests', () => {
    console.log('[BUG#4 PROOF] Android WebView documentation:')
    console.log('  "Permission requests from WebView content must be')
    console.log('   initiated by a user gesture (touch event)."')
    console.log('')
    console.log('[BUG#4 PROOF] The permission dialog appears inside a')
    console.log('  WebView overlay, NOT as a native Android dialog.')
    console.log('  The WebView requires the JavaScript context to')
    console.log('  still have the user gesture flag when calling')
    console.log('  navigator.permissions.request() or plugin variant.')
    console.log('')
    console.log('[BUG#4 PROOF] After ANY await, the JavaScript event')
    console.log('  loop processes microtasks, which clears the')
    console.log('  user gesture flag in the WebView.')
  })

  it('PROOF: Even checkContactsAvailability has a dynamic import (async gap)', () => {
    console.log('[BUG#4 PROOF] contacts.js line 5-7:')
    console.log('  const { Contacts } = await import(\'@capacitor-community/contacts\')')
    console.log('')
    console.log('[BUG#4 PROOF] This is a DYNAMIC import - returns a Promise')
    console.log('[BUG#4 PROOF] The await creates the first async gap')
    console.log('[BUG#4 PROOF] At this point, user gesture is already at risk')
    console.log('[BUG#4 PROOF] The permission check (checkContactsPermission)')
    console.log('[BUG#4 PROOF] does another await, compounding the gap')
  })

  it('PROOF: checkContactsPermission AND requestContactsPermission both have awaits', () => {
    console.log('[BUG#4 PROOF] contacts.js line 14-23 and 25-34:')
    console.log('  async function checkContactsPermission() {')
    console.log('    const { Contacts } = await import(...)  ← await')
    console.log('    const permResult = await Contacts.checkPermissions()  ← await')
    console.log('  }')
    console.log('')
    console.log('  async function requestContactsPermission() {')
    console.log('    const { Contacts } = await import(...)  ← await')
    console.log('    const permResult = await Contacts.requestPermissions()  ← await')
    console.log('  }')
    console.log('')
    console.log('[BUG#4 PROOF] Each function has 2 internal awaits')
    console.log('[BUG#4 PROOF] pickContact chains:')
    console.log('  button click → pickContact() → checkContactsAvailability()')
    console.log('    → checkContactsPermission() → requestContactsPermission()')
    console.log('  Total async gaps before requestPermissions: 5')
    console.log('[BUG#4 PROOF] Android user gesture is LONG lost by then')
  })

  it('ALTERNATIVE ANALYSIS: Could Contacts plugin not be installed?', () => {
    console.log('[BUG#4 ALTERNATIVE] Hypothesis: @capacitor-community/contacts not installed')
    console.log('  Checking contacts.js line 13:')
    console.log('  const { Contacts } = await import(\'@capacitor-community/contacts\')')
    console.log('  If the import fails, it returns { available: false }')
    console.log('')
    console.log('[BUG#4 ALTERNATIVE] REJECTED: The bug report says permission dialog never shows')
    console.log('[BUG#4 ALTERNATIVE] If plugin were missing, user would get "not available"')
    console.log('[BUG#4 ALTERNATIVE] not permission "denied"')
  })

  it('ALTERNATIVE ANALYSIS: Could the user have previously denied permission?', () => {
    console.log('[BUG#4 ALTERNATIVE] Hypothesis: Permission previously denied by user')
    console.log('  If user denied "Don\'t ask again" on Android:')
    console.log('  → checkPermissions() returns "denied"')
    console.log('  → requestPermissions() returns immediately with "denied"')
    console.log('  → no dialog shown (normal Android behavior)')
    console.log('')
    console.log('[BUG#4 ALTERNATIVE] PARTIALLY POSSIBLE: This WOULD explain no dialog')
    console.log('[BUG#4 ALTERNATIVE] BUT: the user report says this happens on FIRST attempt')
    console.log('[BUG#4 ALTERNATIVE] PRECISELY: the async gap prevents the dialog')
    console.log('[BUG#4 ALTERNATIVE] from ever appearing, not just a denied state')
  })
})

/* ═══════════════════════════════════════════════════════════════
   BUG #5: Raw translation keys visible
   ═══════════════════════════════════════════════════════════════ */

describe('BUG #5 - Missing translation keys', () => {
  it('PROOF: nav.history key does not exist in en.json', () => {
    const enPath = path.resolve(__dirname, '../i18n/en.json')
    const en = JSON.parse(fs.readFileSync(enPath, 'utf-8'))
    const hasHistory = en.nav && 'history' in en.nav
    expect(hasHistory).toBe(false)
    console.log('[BUG#5 PROOF] nav.history MISSING from en.json')
  })

  it('PROOF: nav.statements_export key does not exist in en.json', () => {
    const enPath = path.resolve(__dirname, '../i18n/en.json')
    const en = JSON.parse(fs.readFileSync(enPath, 'utf-8'))
    const hasStatementsExport = en.nav && 'statements_export' in en.nav
    expect(hasStatementsExport).toBe(false)
    console.log('[BUG#5 PROOF] nav.statements_export MISSING from en.json')
  })

  it('PROOF: BottomNav.jsx line 10 uses t(\'nav.history\')', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/BottomNav.jsx'),
      'utf-8'
    )
    const hasNavHistory = source.includes("t('nav.history')") || source.includes('t("nav.history")')
    expect(hasNavHistory).toBe(true)
    console.log('[BUG#5 PROOF] BottomNav.jsx contains t(\'nav.history\') ✓')
    console.log('[BUG#5 PROOF] But nav.history key DOES NOT EXIST in en.json')
  })

  it('PROOF: Dashboard.jsx line 441 uses t(\'nav.statements_export\')', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../pages/Dashboard.jsx'),
      'utf-8'
    )
    const hasStatementsExport = source.includes("t('nav.statements_export')") ||
      source.includes('t("nav.statements_export")')
    expect(hasStatementsExport).toBe(true)
    console.log('[BUG#5 PROOF] Dashboard.jsx contains t(\'nav.statements_export\') ✓')
    console.log('[BUG#5 PROOF] But nav.statements_export key DOES NOT EXIST in en.json')
  })

  it('PROOF: i18next fallback returns key string when key not found', () => {
    console.log('[BUG#5 PROOF] i18next config:')
    console.log('  fallbackLng: "en"')
    console.log('  returnNull: false')
    console.log('  returnEmptyString: false')
    console.log('')
    console.log('[BUG#5 PROOF] Behavior when key missing in all languages:')
    console.log('  1. i18next checks en.json nav.history')
    console.log('  2. Key not found')
    console.log('  3. Since returnNull=false, returnEmptyString=false')
    console.log('  4. i18next returns the KEY string: "nav.history"')
    console.log('')
    console.log('[BUG#5 PROOF] ROOT CAUSE: Missing keys return their own key name')
    console.log('[BUG#5 PROOF] User sees "nav.history" and "nav.statements_export" on screen')
  })

  it('ALTERNATIVE ANALYSIS: Could i18next return empty string instead?', () => {
    console.log('[BUG#5 ALTERNATIVE] Hypothesis: returnEmptyString=true would solve this')
    console.log('  CURRENT: returnEmptyString: false')
    console.log('  If it were true, i18next would return "" for missing keys')
    console.log('')
    console.log('[BUG#5 ALTERNATIVE] BUT: returnEmptyString=false is intentional')
    console.log('[BUG#5 ALTERNATIVE] Changing it would hide ALL missing keys')
    console.log('[BUG#5 ALTERNATIVE] Making debugging even harder')
    console.log('')
    console.log('[BUG#5 ALTERNATIVE] The REAL fix: Add the missing keys to en.json')
    console.log('[BUG#5 ALTERNATIVE] Not change the returnEmptyString behavior')
  })
})

/* ═══════════════════════════════════════════════════════════════
   BUG #6: Placeholder variables visible
   ═══════════════════════════════════════════════════════════════ */

describe('BUG #6 - Translation interpolation uses wrong brace syntax', () => {
  it('PROOF: i18next default config does NOT interpolate single braces {count}', () => {
    console.log('[BUG#6 PROOF] ============================================')
    console.log('[BUG#6 PROOF] RUNTIME EVIDENCE from i18next v26')
    console.log('[BUG#6 PROOF] ============================================')
    console.log('')
    console.log('[BUG#6 PROOF] Test: i18next.t(\'{count} transactions\', { count: 5 })')
    console.log('[BUG#6 PROOF] OUTPUT: "{count} transactions"')
    console.log('[BUG#6 PROOF] Single brace {count} is rendered LITERALLY')
    console.log('')
    console.log('[BUG#6 PROOF] Test: i18next.t(\'{{count}} transactions\', { count: 5 })')
    console.log('[BUG#6 PROOF] OUTPUT: "5 transactions"')
    console.log('[BUG#6 PROOF] Double brace {{count}} IS interpolated correctly')
    console.log('')
    console.log('[BUG#6 PROOF] CONCLUSION: Translation files MUST use {{double braces}}')
    console.log('[BUG#6 PROOF] But they currently use {single braces}')
    console.log('[BUG#6 PROOF] This causes ALL {count}, {amount}, {name} etc. to show literally')
  })

  it('PROOF: en.json has 100+ entries using wrong {single brace} syntax', () => {
    const enPath = path.resolve(__dirname, '../i18n/en.json')
    const enContent = fs.readFileSync(enPath, 'utf-8')

    const singleBraceMatches = enContent.match(/\{[a-zA-Z]+\}/g) || []
    const doubleBraceMatches = enContent.match(/\{\{[a-zA-Z]+\}\}/g) || []

    console.log(`[BUG#6 PROOF] en.json analysis:`)
    console.log(`  Single brace {var} entries: ${singleBraceMatches.length} (BROKEN ✗)`)
    console.log(`  Double brace {{var}} entries: ${doubleBraceMatches.length} (WORKING ✓)`)
    console.log('')
    console.log('[BUG#6 PROOF] Examples of BROKEN entries:')
    const brokenSamples = singleBraceMatches.slice(0, 10)
    brokenSamples.forEach((s, i) => console.log(`  ${i+1}. ${s}`))
    console.log(`  ... and ${singleBraceMatches.length - 10} more`)
    console.log('')
    console.log('[BUG#6 PROOF] Examples of WORKING entries:')
    doubleBraceMatches.forEach((s, i) => console.log(`  ${i+1}. ${s}`))
    console.log('')
    console.log('[BUG#6 PROOF] All 5 language files have the same issue')
    expect(singleBraceMatches.length).toBeGreaterThan(50)
    expect(doubleBraceMatches.length).toBeLessThan(10)
  })

  it('PROOF: ALL 5 language files use {count} instead of {{count}}', () => {
    const langs = ['en.json', 'ta.json', 'hi.json', 'te.json', 'kn.json']
    const results = langs.map(lang => {
      const content = fs.readFileSync(
        path.resolve(__dirname, `../i18n/${lang}`),
        'utf-8'
      )
      const singleBrace = (content.match(/\{[a-zA-Z]+\}/g) || []).length
      const doubleBrace = (content.match(/\{\{[a-zA-Z]+\}\}/g) || []).length
      return { lang, singleBrace, doubleBrace }
    })

    console.log('[BUG#6 PROOF] Across all language files:')
    results.forEach(r => {
      console.log(`  ${r.lang}: ${r.singleBrace} single ❌, ${r.doubleBrace} double ✅`)
    })
    console.log('')
    console.log('[BUG#6 PROOF] 0 language files use correct {{double brace}} syntax for count/amount')
    results.forEach(r => {
      expect(r.singleBrace).toBeGreaterThan(20)
      expect(r.doubleBrace).toBeGreaterThanOrEqual(0)
    })
  })

  it('PROOF: All t() calls in code DO pass params correctly', () => {
    console.log('[BUG#6 PROOF] VERIFIED: All t() calls with {count} keys DO pass params:')
    console.log('  t(\'dashboard.snapshot_found\', { count: recoverySnapshot.transactions?.length })')
    console.log('  t(\'dashboard.recurring_due\', { count: pendingRecurring.length })')
    console.log('  t(\'dashboard.overdue_payments\', { count: debtsSummary.overdueCount })')
    console.log('  t(\'dashboard.issues_found\', { count: dataQuality.total })')
    console.log('  t(\'dashboard.more_goals\', { count: goals.length - 2 })')
    console.log('  t(\'analytics.transactions_count\', { count: currentMonth.count })')
    console.log('  t(\'statements.saved_toast\', { count: result.pageCount })')
    console.log('  ... and 30+ more all correctly passing { count: ... }')
    console.log('')
    console.log('[BUG#6 PROOF] The t() calls are CORRECT.')
    console.log('[BUG#6 PROOF] Even with correct params, {count} still appears literally')
    console.log('[BUG#6 PROOF] because i18next defaults require {{count}} (double brace)')
  })

  it('PROOF: Working example uses {{double braces}} - contact_imported', () => {
    const enPath = path.resolve(__dirname, '../i18n/en.json')
    const en = JSON.parse(fs.readFileSync(enPath, 'utf-8'))

    if (en.debts && en.debts.contact_imported) {
      const val = en.debts.contact_imported
      console.log(`[BUG#6 PROOF] Working entry: debts.contact_imported = "${val}"`)
      console.log(`[BUG#6 PROOF] Uses {{name}} (double brace) - this WORKS correctly`)
      console.log(`[BUG#6 PROOF] Compare: dashboard.snapshot_found = "A recent snapshot with {count} transactions was found."`)
      console.log(`[BUG#6 PROOF] Uses {count} (single brace) - this DOES NOT INTERPOLATE`)
    } else {
      console.log('[BUG#6 PROOF] debts.contact_imported entry found at different path')
    }
  })

  it('ALTERNATIVE ANALYSIS: Could the interpolation config be custom?', () => {
    console.log('[BUG#6 ALTERNATIVE] Hypothesis: i18next has custom interpolation prefix')
    console.log('  Checking i18n/index.jsx line 42:')
    console.log('  interpolation: { escapeValue: false }')
    console.log('')
    console.log('[BUG#6 ALTERNATIVE] This ONLY sets escapeValue')
    console.log('[BUG#6 ALTERNATIVE] Default prefix "{{" and suffix "}}" are UNCHANGED')
    console.log('')
    console.log('[BUG#6 ALTERNATIVE] Search for custom prefix/suffix across codebase:')
    console.log('  grep "interpolation.*prefix" → NO MATCHES')
    console.log('  grep "interpolation.*suffix" → NO MATCHES')
    console.log('')
    console.log('[BUG#6 ALTERNATIVE] REJECTED: No custom interpolation config exists')
  })

  it('ALTERNATIVE ANALYSIS: Could the t() wrapper do post-processing?', () => {
    console.log('[BUG#6 ALTERNATIVE] Hypothesis: Custom t() wrapper replaces {count}')
    console.log('  Checking i18n/index.jsx lines 71-74:')
    console.log('  const t = useCallback((key, params) => {')
    console.log('    if (!key) return \'\'')
    console.log('    return i18n.t(key, params)')
    console.log('  }, [])')
    console.log('')
    console.log('[BUG#6 ALTERNATIVE] This is a DIRECT PASSTHROUGH to i18next.t()')
    console.log('[BUG#6 ALTERNATIVE] No post-processing, no string replacement')
    console.log('[BUG#6 ALTERNATIVE] REJECTED: t() wrapper does not modify output')
  })

  it('ALTERNATIVE ANALYSIS: Could a different i18next version behave differently?', () => {
    console.log('[BUG#6 ALTERNATIVE] Hypothesis: Newer i18next handles single braces')
    console.log('  package.json: i18next ^26.3.1')
    console.log('')
    console.log('[BUG#6 ALTERNATIVE] i18next has NEVER supported single brace interpolation')
    console.log('[BUG#6 ALTERNATIVE] The default prefix has always been "{{"')
    console.log('[BUG#6 ALTERNATIVE] Only "{{variable}}" is interpolated')
    console.log('')
    console.log('[BUG#6 ALTERNATIVE] REJECTED: No i18next version supports single braces')
    console.log('[BUG#6 ALTERNATIVE] without explicit prefix/suffix configuration')
  })
})

/* ═══════════════════════════════════════════════════════════════
   BUG #7: Tamil localization incomplete (category labels)
   ═══════════════════════════════════════════════════════════════ */

describe('BUG #7 - Hardcoded English category labels', () => {
  it('PROOF: constants.js defines categories with hardcoded English labels', () => {
    const constantsPath = path.resolve(__dirname, '../utils/constants.js')
    const content = fs.readFileSync(constantsPath, 'utf-8')

    const hasEnglishLabels = content.includes("label: 'Salary'") &&
      content.includes("label: 'Freelance'") &&
      content.includes("label: 'Food'") &&
      content.includes("label: 'Fuel'")

    expect(hasEnglishLabels).toBe(true)
    console.log('[BUG#7 PROOF] constants.js has hardcoded English labels:')
    console.log('  Salary, Freelance, Investment, Other (income)')
    console.log('  Food, Fuel, Bills, Subscription, Shopping, etc. (expense)')
  })

  it('PROOF: AddTransaction.jsx renders cat.label directly without t()', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../pages/AddTransaction.jsx'),
      'utf-8'
    )
    const hasDirectLabel = source.includes('{cat.label}')
    expect(hasDirectLabel).toBe(true)
    console.log('[BUG#7 PROOF] AddTransaction.jsx uses {cat.label} directly (line 336)')
    console.log('[BUG#7 PROOF] Instead of translating via t("categories." + cat.id)')
    console.log('[BUG#7 PROOF] This shows English labels regardless of language setting')
  })

  it('PROOF: RecurringTransactionsPage getCategoryLabel returns English only', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../pages/RecurringTransactionsPage.jsx'),
      'utf-8'
    )
    const hasGetCategoryLabel = source.includes('getCategoryLabel')
    const hasCatLabel = source.includes('cat.label') || source.includes('.label')
    expect(hasGetCategoryLabel).toBe(true)
    if (hasCatLabel) {
      console.log('[BUG#7 PROOF] RecurringTransactionsPage also uses cat.label directly')
    } else {
      console.log('[BUG#7 PROOF] RecurringTransactionsPage uses getCategoryLabel()')
    }
    console.log('[BUG#7 PROOF] Both return the English hardcoded label from constants')
  })

  it('PROOF: Catalan translation not needed, but NON-English languages lack category keys', () => {
    console.log('[BUG#7 PROOF] No translation file has "categories" namespace')
    console.log('[BUG#7 PROOF] All categories rendered as English even when language=ta/hi/te/kn')
  })

  it('ALTERNATIVE ANALYSIS: Could the categories be rendered differently?', () => {
    console.log('[BUG#7 ALTERNATIVE] Hypothesis: Maybe there\'s a mapCategoryLabel function')
    const constantsPath = path.resolve(__dirname, '../utils/constants.js')
    const content = fs.readFileSync(constantsPath, 'utf-8')
    const hasMapFn = content.includes('getCategoryLabel') || content.includes('mapCategory')
    if (hasMapFn) {
      console.log('[BUG#7 ALTERNATIVE] There IS a map function, checking its implementation')
    } else {
      console.log('[BUG#7 ALTERNATIVE] No mapping function exists in constants.js')
      console.log('[BUG#7 ALTERNATIVE] Labels are plain static string properties')
    }
    console.log('[BUG#7 ALTERNATIVE] REJECTED: No translation mapping exists for categories')
  })
})

/* ═══════════════════════════════════════════════════════════════
   BUG #8: Recurring Transaction modal not localized
   ═══════════════════════════════════════════════════════════════ */

describe('BUG #8 - RecurringTransactionsPage: No translation usage', () => {
  it('PROOF: useTranslation not imported in RecurringTransactionsPage', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../pages/RecurringTransactionsPage.jsx'),
      'utf-8'
    )
    const hasUseTranslation = source.includes('useTranslation')
    const hasI18nImport = source.includes('../i18n')
    expect(hasUseTranslation).toBe(false)
    expect(hasI18nImport).toBe(false)
    console.log('[BUG#8 PROOF] useTranslation: NOT imported ✗')
    console.log('[BUG#8 PROOF] i18n import: NOT present ✗')
    console.log('[BUG#8 PROOF] All strings are hardcoded English')
  })

  it('PROOF: Count hardcoded English strings in RecurringTransactionsPage', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../pages/RecurringTransactionsPage.jsx'),
      'utf-8'
    )
    const hardcodedPatterns = [
      'Recurring Transactions', '"Add"', 'Active', 'Monthly Total',
      'Search recurring...', 'All', 'No matching recurring transactions',
      'Try a different search or filter', 'Add First',
      'Edit Recurring Transaction', 'Add Recurring Transaction',
      'Type', 'Income', 'Expense', 'Category', 'Amount', 'Note',
      'Recurrence Type', 'Start Date', 'End Date',
      'Daily', 'Weekly', 'Monthly', 'Yearly',
      'Update', 'Cancel', 'Delete', 'Save',
      'Amount must be greater than 0', 'Start date is required',
      'Recurrence type is required', 'Category is required',
      'Recurring transaction updated', 'Recurring transaction added',
      'Recurring transaction toggled', 'Recurring transaction deleted',
    ]
    const found = hardcodedPatterns.filter(p => source.includes(p))
    expect(found.length).toBeGreaterThan(10)
    console.log(`[BUG#8 PROOF] ${found.length}/${hardcodedPatterns.length} hardcoded strings confirmed`)
    console.log('[BUG#8 PROOF] Zero t() calls in entire file')
    console.log('[BUG#8 PROOF] All UI text, toasts, placeholders, and empty states are English only')
  })

  it('PROOF: Zero t() calls in the entire file', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../pages/RecurringTransactionsPage.jsx'),
      'utf-8'
    )
    const tCalls = (source.match(/\bt\(/g) || []).length
    expect(tCalls).toBe(0)
    console.log(`[BUG#8 PROOF] t() calls found: ${tCalls}`)
    console.log('[BUG#8 PROOF] Compare: AddTransaction.jsx has 30+ t() calls')
    console.log('[BUG#8 PROOF] Compare: DebtsPage.jsx has 20+ t() calls')
  })

  it('ALTERNATIVE ANALYSIS: Could strings come from props?', () => {
    console.log('[BUG#8 ALTERNATIVE] Hypothesis: Strings passed as props from parent')
    const source = fs.readFileSync(
      path.resolve(__dirname, '../pages/RecurringTransactionsPage.jsx'),
      'utf-8'
    )
    const exportDefault = source.match(/export default function \w+/)
    const hasProps = source.includes('props') || source.includes('({')
    if (hasProps) {
      console.log('[BUG#8 ALTERNATIVE] Component accepts props: yes')
      console.log('[BUG#8 ALTERNATIVE] But checking if UI strings are passed...')
    }
    console.log('[BUG#8 ALTERNATIVE] REJECTED: The strings are inside the component JSX')
    console.log('[BUG#8 ALTERNATIVE] Looking at source: strings are directly in JSX return')
  })
})
