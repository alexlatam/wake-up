// Register Notifee background event handler before expo-router bootstraps.
// This module-level side effect runs even when the app is killed/headless.
import './src/infrastructure/notifications/notifeeBackground';
import 'expo-router/entry';
