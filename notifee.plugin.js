const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Configures AndroidManifest.xml for Notifee v9 (no first-party app.plugin.js):
 *  1. Adds the Notifee boot receiver so scheduled alarms survive reboots.
 *  2. Sets showWhenLocked + turnScreenOn on MainActivity so full-screen intents
 *     actually appear over the lockscreen and wake the display (required by Notifee docs).
 */
function withNotifeeAndroid(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application) return mod;

    // ── 1. Boot receiver ─────────────────────────────────────────────────────
    if (!application.receiver) {
      application.receiver = [];
    }

    const alreadyAdded = application.receiver.some(
      (r) => r.$?.['android:name'] === 'io.invertase.notifee.NotifeeBootReceiver',
    );

    if (!alreadyAdded) {
      application.receiver.push({
        $: {
          'android:name': 'io.invertase.notifee.NotifeeBootReceiver',
          'android:exported': 'true',
          'android:enabled': 'true',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } }],
          },
        ],
      });
    }

    // ── 2. showWhenLocked + turnScreenOn on MainActivity ─────────────────────
    // Required so fullScreenAction notifications appear over the lockscreen and
    // wake the screen. Without these, Android only shows a heads-up notification.
    if (application.activity) {
      const mainActivity = application.activity.find(
        (a) => a.$?.['android:name'] === '.MainActivity',
      );
      if (mainActivity) {
        mainActivity.$['android:showWhenLocked'] = 'true';
        mainActivity.$['android:turnScreenOn'] = 'true';
      }
    }

    return mod;
  });
}

module.exports = withNotifeeAndroid;
