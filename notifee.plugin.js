const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Adds Notifee's boot receiver to AndroidManifest.xml.
 * Notifee v9 has no app.plugin.js — this replaces what a first-party plugin would do.
 */
function withNotifeeAndroid(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application) return mod;

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

    return mod;
  });
}

module.exports = withNotifeeAndroid;
