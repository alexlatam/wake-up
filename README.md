# WakeUp

An Android alarm app that forces you to solve challenges before you can dismiss the alarm. Built with Expo SDK 56, React Native 0.85, and a hexagonal architecture.

## Features

- Schedule alarms on specific days of the week
- Three challenge types to dismiss an alarm: button press, math problem, or image puzzle
- Alarm fires over the lock screen — screen wakes, sound loops, phone vibrates
- Custom ringtone per alarm (pick any audio file from the device)
- Challenges appear one by one; all must be completed before the alarm stops
- Alarms persist across device reboots
- Dark green UI

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 56 (managed workflow) |
| Language | TypeScript |
| Navigation | Expo Router v4 (file-based) |
| Styling | NativeWind v4 (Tailwind CSS) |
| Notifications | Notifee v9 (exact alarms, full-screen intent) |
| Persistence | expo-sqlite + drizzle-orm |
| Audio | expo-audio |
| Architecture | Hexagonal (domain / application / infrastructure / presentation) |
| CI / builds | EAS Build (Expo Application Services) |

---

## Prerequisites

### Local tools

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20+ | |
| npm | 10+ | |
| EAS CLI | latest | `npm install -g eas-cli` |
| Expo account | — | [expo.dev](https://expo.dev) — free tier works |

### One-time EAS login

```bash
eas login
```

You will be prompted for your Expo account credentials. This only needs to be done once per machine.

### Android device (physical)

This app uses native modules (Notifee, SQLite, audio) that do not work in the Android Emulator for alarm-over-lockscreen behavior. **A physical Android device is required for testing.**

---

## Initial setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd wake-up

# 2. Install dependencies
npm install

# 3. Run tests to verify everything is wired up
npm test
```

---

## Testing on a physical device — complete workflow

This section explains how to see your code changes on your Android phone. There are two
different scenarios depending on **what** you changed.

---

### The two types of changes

| Type | Examples | What you need |
|---|---|---|
| **JS/TS only** | Screen UI, business logic, styles, navigation, hooks | Just run Metro — instant hot reload, no rebuild |
| **Native** | New npm package with native code, changes to `app.json` plugins, `notifee.plugin.js`, `AndroidManifest` | Full EAS rebuild + reinstall APK |

---

### One-time setup: install the development APK

The **development APK** is a special build that includes an embedded Metro client. Once installed, it connects to your laptop over Wi-Fi and hot-reloads any JS changes in seconds — no rebuild needed.

**You only need to do this once** (or again after adding a native module).

```bash
npm run build:apk:dev
```

This queues a build on EAS (~10–20 min). When done, download and install the `.apk` on your phone. This replaces the preview APK.

---

### Daily workflow: JS/TS changes (most changes)

**Same Wi-Fi network (fastest):**

```bash
npm start
```

1. Phone and laptop must be on the **same Wi-Fi network**.
2. Open the installed development app on your phone.
3. Tap **"Enter URL manually"** and type the URL shown in the terminal (e.g. `exp://192.168.x.x:8081`), or scan the QR code.
4. The app loads from your laptop. Edit any `.ts` / `.tsx` file → the app reloads automatically.

**Different networks (phone on mobile data, laptop on Wi-Fi, VPN, etc.):**

```bash
npm run device:start
```

Same as above but Metro creates a tunnel through the internet. Slower initial load, but works from anywhere. The QR code / URL in the terminal already points to the tunnel address — just scan it.

---

### Workflow: native changes (new package, plugin, manifest)

Any change that touches native Android code requires a new APK build.

```bash
# 1. Make your native change (install package, edit app.json, edit notifee.plugin.js, etc.)
npx expo install <new-package>   # if adding a package

# 2. Build a new APK on EAS (~10-20 min)
npm run build:apk:dev            # dev APK (connects to Metro — recommended for testing)
# or
npm run build:apk                # preview APK (standalone, no Metro)

# 3. Download and install the new APK on your phone
#    (uninstall the old one first if the package name didn't change and it asks)

# 4. Run Metro and connect
npm start
```

> **Do NOT push to GitHub to trigger a build.** EAS reads your local files directly via the CLI — no CI/CD pipeline is involved. Git is only for version control.

---

### Check build status

```bash
npm run build:status
```

Shows the last 5 builds and their download links. You can also see them at expo.dev.

---

### Starting the Metro dev server (reference)

```bash
npm start          # same Wi-Fi — fastest
npm run android    # same as start, selects Android
npm run device:start  # tunnel — works across networks
```

---

## Build commands

Builds run on EAS cloud servers — you do not need Android Studio or a local build environment.

### `npm run build:apk`

```bash
eas build --platform android --profile preview
```

Builds a **distributable APK** (`.apk` file) that can be directly installed on any Android device. Use this for testing on a real phone.

- Output: direct download link in the terminal and on [expo.dev/accounts/alexlatam/projects/wake-up/builds](https://expo.dev)
- Install: scan the QR code with the device camera, download the APK, and open it

### `npm run build:apk:dev`

```bash
eas build --platform android --profile development
```

Builds a **development APK** that includes the Expo dev client. This version connects to your local Metro server so you can use hot reload and see logs in the terminal. Required once whenever you add or change a native module.

After installing this APK on the device, run `npm start` on your computer and scan the QR code from within the installed app.

### `npm run build:release`

```bash
eas build --platform android --profile production
```

Builds an **Android App Bundle** (`.aab`) intended for uploading to the Google Play Store. Not needed for local testing.

### `npm run build:status`

```bash
eas build:list --platform android --limit 5
```

Shows the last 5 Android builds on EAS — their status (in queue / building / finished), profile, and download links.

> Build times on the free EAS tier are typically 10–20 minutes due to shared queue wait times.

---

## Other commands

### `npm test`

Runs the full test suite (jest, no watch mode). 12 test suites, 67 tests covering domain logic, use cases, and the SQLite repository integration.

### `npm run test:watch`

Runs jest in watch mode — re-runs affected tests on every file save. Use during active development.

### `npm run lint`

Runs ESLint over all `.ts` and `.tsx` files. The project uses `@typescript-eslint` with strict React Hooks rules.

### `npm run type-check`

Runs the TypeScript compiler with `--noEmit` (no output files, type errors only). Useful as a pre-commit sanity check.

---

## Project structure

```
wake-up/
├── app/                        # Expo Router routes (file = route)
│   ├── _layout.tsx             # Root layout: DI init, notification listeners, nav
│   ├── index.tsx               # Alarm list screen
│   ├── ringing.tsx             # Full-screen alarm screen (over lockscreen)
│   └── alarm/
│       └── [id].tsx            # Create / edit alarm screen
│
├── src/
│   ├── domain/                 # Pure business logic — no React, no Expo
│   │   ├── alarm/              # Alarm, AlarmSession, Schedule, Action, MathGenerator
│   │   └── ports/              # Repository + service interfaces (AlarmRepository, etc.)
│   │
│   ├── application/
│   │   └── use-cases/          # One file per use case (CreateAlarm, SyncAlarms, etc.)
│   │
│   └── infrastructure/
│       ├── di/                 # Dependency injection container
│       ├── notifications/      # Notifee scheduler + background event handler
│       ├── persistence/        # SQLite repositories via drizzle-orm
│       │   └── drizzle/        # Schema + migrations
│       ├── http/               # HttpAlarmRepository stub (future backend sync)
│       └── system/             # SystemClock, UuidGenerator
│
├── components/                 # shadcn/ui components (Button, Text, etc.)
├── notifee.plugin.js           # Custom Expo config plugin for Notifee v9 AndroidManifest
├── app.json                    # Expo config (permissions, package name, EAS project ID)
├── eas.json                    # EAS build profiles (preview, development, production)
├── tailwind.config.js          # Tailwind tokens (dark green palette)
├── global.css                  # CSS custom properties for NativeWind
└── babel.config.js             # babel-preset-expo + nativewind/babel preset
```

---

## Alarm firing pipeline

Understanding this is useful when debugging alarm behavior:

```
SyncAlarms (on app start)
  └─ NotifeeNotificationScheduler.schedule()
       └─ notifee.createTriggerNotification()  ← exact alarm registered in Android
            │
            │  [alarm time reached]
            ▼
       EventType.DELIVERED fires
            ├─ App FOREGROUND → onForegroundEvent → router.push('/ringing')
            ├─ App BACKGROUND → onBackgroundEvent → StartAlarmSession (saves RINGING to DB)
            │                                       AppState 'active' → findActive() → router.replace('/ringing')
            └─ App KILLED    → fullScreenAction launches MainActivity
                               getInitialNotification() → router.replace('/ringing')

RingingScreen
  └─ useAlarmSession → StartAlarmSession (idempotent: resumes if session exists)
       └─ renders currentAction (BUTTON / MATH / PUZZLE)
            └─ CompleteAction → advances currentIndex
                 └─ isDismissed() → player.pause() + Vibration.cancel() + DismissAlarm
                                     └─ router.replace('/')
```

---

## Adding a native module

Any new package that includes native code (e.g. `expo-document-picker`, `expo-keep-awake`) requires a **new APK build** — Metro reload alone is not enough.

1. `npx expo install <package-name>` (uses the SDK-compatible version)
2. If the package has an Expo config plugin, add it to `plugins` in `app.json`
3. `npm run build:apk` to compile a new APK
4. Install the new APK on the device

---

## Permissions (Android)

The app declares the following permissions in `app.json`:

| Permission | Why |
|---|---|
| `SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM` | Fire alarms at the exact scheduled time |
| `USE_FULL_SCREEN_INTENT` | Show alarm over the lock screen |
| `RECEIVE_BOOT_COMPLETED` | Re-register alarms after device reboot |
| `VIBRATE` | Vibrate while alarm is ringing |
| `POST_NOTIFICATIONS` | Show the alarm notification (Android 13+) |
| `WAKE_LOCK` | Prevent the CPU from sleeping while the alarm session starts |
| `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | Required by Notifee for reliable background delivery |
| `MODIFY_AUDIO_SETTINGS` | Play audio in silent mode |
