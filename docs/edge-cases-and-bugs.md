## Bug Inventory — WakeUp Alarm App

> All bugs below have a corresponding test prefixed with `BUG:` that is intentionally RED.
> Fix the source code to make these tests pass.

### Critical (can prevent alarm from functioning)

**BUG-001: QR_CODE unsolvable when saved without scanning**
- File: src/infrastructure/persistence/AlarmMapper.ts (toDomain), src/presentation/screens/AlarmEditScreen.tsx (handleSave)
- Behavior: null imageUri → qrCodeValue='' in domain. No real QR barcode can ever equal ''. Alarm becomes permanently unsolvable.
- Desired: AlarmEditScreen should block saving a QR_CODE action without a qrCodeValue, OR QrCodeActionView should bypass when qrCodeValue is empty.
- Test: src/presentation/screens/actions/__tests__/QrCodeActionView.test.tsx — "BUG: qrCodeValue='' results in unsolvable challenge"
- Severity: CRITICAL

**BUG-002: SHAKE sensor missing → silent soft-lock**
- File: src/presentation/screens/actions/ShakeActionView.tsx
- Behavior: If expo-sensors/build/Accelerometer require() throws (native module not built), useEffect catches and returns silently. No UI feedback. Timer never advances. Alarm is permanently ringing with no escape.
- Desired: Show a fallback bypass button when sensor is unavailable.
- Test: src/presentation/screens/actions/__tests__/ShakeActionView.test.tsx — "BUG: when expo-sensors module is unavailable, should show a fallback dismiss button"
- Severity: CRITICAL

**BUG-003: WALK permission denied → silent soft-lock**
- File: src/presentation/screens/actions/WalkActionView.tsx
- Behavior: Pedometer.requestPermissionsAsync returns granted=false → async effect returns. No steps ever count. No escape.
- Desired: Show bypass/dismiss button when permission denied or pedometer unavailable.
- Test: src/presentation/screens/actions/__tests__/WalkActionView.test.tsx — "BUG: when permission denied, should show bypass/dismiss button"
- Severity: CRITICAL

**BUG-004: Session currentIndex overflow → RingingScreen soft-lock**
- File: src/presentation/hooks/useAlarmSession.ts
- Behavior: If an alarm's actions are reduced (e.g., 3→1) after a session was already started, the recovered session's currentIndex may be >= actions.length. currentAction becomes null. RingingScreen renders no challenge. Audio loops forever. No exit.
- Desired: Hook should detect index overflow and auto-dismiss or set an error state.
- Test: src/presentation/hooks/__tests__/useAlarmSession.test.ts — "BUG: currentIndex >= actions.length causes currentAction to be null"
- Severity: CRITICAL

**BUG-005: DB init failure → permanent boot spinner**
- File: app/_layout.tsx
- Behavior: initDatabase() rejection is only console.error'd. The app stays stuck on ActivityIndicator forever with no error UI.
- Desired: Show an error screen/message with retry option when DB init fails.
- Note: No automated test for this (app/_layout tests not yet written). Manual test required.
- Severity: CRITICAL

### High

**BUG-006: Optimistic toggle not reverted on sync failure**
- File: src/presentation/hooks/useAlarms.ts (toggle)
- Behavior: toggle() calls setAlarms(flip) optimistically before awaiting persistence. If sync throws, the UI switch stays flipped but the alarm was NOT rescheduled. State permanently desynced.
- Desired: On any error, revert the optimistic flip.
- Test: src/presentation/hooks/__tests__/useAlarms.test.ts — "BUG: toggle optimistic update not reverted on sync failure"
- Severity: HIGH

**BUG-007: iOS crash — settings.android undefined**
- File: src/presentation/hooks/useAlarmPermissions.ts
- Behavior: `settings.android.alarm` — on iOS, notifee may return settings where android is undefined. This throws TypeError and crashes the hook.
- Desired: Guard with optional chaining: `settings.android?.alarm`
- Test: src/presentation/hooks/__tests__/useAlarmPermissions.test.ts — "BUG: on iOS settings.android is undefined"
- Severity: HIGH (iOS crash)

**BUG-008: Battery optimization banner never shown**
- File: src/presentation/screens/AlarmListScreen.tsx (and useAlarmPermissions.ts)
- Behavior: useAlarmPermissions computes batteryOptimized and exposes openBatterySettings but AlarmListScreen never renders a banner for it. Android users are never warned that battery optimization may silently kill their alarm.
- Desired: Add a battery optimization warning banner (orange) matching the pattern of notifications/exactAlarm banners.
- Note: No automated test for this screen. Bug confirmed by static analysis.
- Severity: HIGH (silent alarm failure on most Android devices)

**BUG-009: NFC empty nfcTagId matches empty/no-id tags**
- File: src/presentation/screens/actions/NfcActionView.tsx + AlarmMapper.ts
- Behavior: null nfcTagId → '' in domain. When NFC is supported, a tag with empty id matches '' and dismisses alarm. Also, an NFC action saved without scanning is trivially bypassed.
- Desired: Reject saving NFC action with empty nfcTagId. Or validate on dismiss.
- Test: src/presentation/screens/actions/__tests__/NfcActionView.test.tsx — "BUG: empty nfcTagId matches empty tag id"
- Severity: HIGH

**BUG-010: Stale sessions (>8h) never cleaned up from DB**
- File: src/infrastructure/persistence/SqliteAlarmSessionRepository.ts (findActive)
- Behavior: findActive ignores sessions older than 8h by in-memory filter, but never deletes them. DB accumulates stale RINGING sessions. findByAlarmId still returns the oldest non-dismissed session — which may be a day-old ringing session — and StartAlarmSession would "recover" it, dropping user into a stale session.
- Desired: findActive (or a periodic cleanup) should DELETE sessions older than 8h, not just ignore them.
- Test: src/infrastructure/persistence/__tests__/SqliteAlarmSessionRepository.integration.test.ts — "BUG: stale >8h RINGING session still recoverable via findByAlarmId"
- Severity: HIGH

### Medium

**BUG-011: RingingScreen empty-state message hard-coded Spanish**
- File: app/ringing.tsx
- Behavior: When no alarmId param, shows "Sin alarma activa." (Spanish) regardless of app language.
- Desired: Use i18n key.
- Severity: MEDIUM

**BUG-012: RingingScreen error state hard-coded English**
- File: src/presentation/screens/RingingScreen.tsx
- Behavior: Error message "Failed to load alarm session" and "Go back" are hard-coded English.
- Desired: Use i18n keys.
- Severity: MEDIUM

**BUG-013: Challenge route header titles hard-coded English**
- File: app/challenges/[type].tsx
- Behavior: NAMES map is hard-coded English. Stack.Screen title ignores i18n.
- Desired: Use i18n challenge name keys.
- Severity: MEDIUM

**BUG-014: PHOTO_MATCH aHash threshold too loose (23% bit error tolerance)**
- File: src/presentation/screens/actions/PhotoMatchActionView.tsx
- Behavior: Hamming distance ≤ 15 out of 64 bits (~23%) may match visually different photos.
- Desired: Consider tightening threshold or providing user feedback on match confidence.
- Severity: MEDIUM (security/correctness)

**BUG-015: Missing ringtone cache URI → silent alarm**
- File: src/presentation/screens/RingingScreen.tsx
- Behavior: Ringtone stored as copyToCacheDirectory URI. Cache can be evicted by OS. Audio player receives missing URI and fails silently — alarm fires with no sound.
- Desired: Fall back to a default ringtone when URI fails to load.
- Severity: MEDIUM
