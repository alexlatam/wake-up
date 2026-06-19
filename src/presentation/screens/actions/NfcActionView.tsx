import { useEffect, useRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { Text } from '~/components/ui/text';

type Status = 'idle' | 'scanning' | 'wrong' | 'error' | 'unsupported';

export function NfcActionView({
  nfcTagId,
  onComplete,
}: {
  nfcTagId: string;
  onComplete: () => void;
}) {
  const [status, setStatus] = useState<Status>('idle');
  const completedRef = useRef(false);
  const scanningRef = useRef(false);

  useEffect(() => {
    initAndScan();
    return () => {
      NfcManager.cancelTechnologyRequest().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initAndScan() {
    const supported = await NfcManager.isSupported();
    if (!supported) {
      setStatus('unsupported');
      return;
    }
    await NfcManager.start();
    scan();
  }

  async function scan() {
    if (scanningRef.current || completedRef.current) return;
    scanningRef.current = true;
    setStatus('scanning');
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      const tagId = (tag?.id ?? '').toLowerCase();
      if (tagId === nfcTagId.toLowerCase()) {
        completedRef.current = true;
        onComplete();
      } else {
        setStatus('wrong');
      }
    } catch (_) {
      setStatus('error');
    } finally {
      scanningRef.current = false;
      NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  }

  if (status === 'unsupported') {
    return (
      <View className="flex-1 items-center justify-center gap-6 px-8">
        <Text className="text-8xl">📡</Text>
        <Text className="text-center text-base text-white/70">
          NFC is not supported on this device.
        </Text>
        <Pressable
          onPress={onComplete}
          className="rounded-full bg-white/20 px-10 py-4"
        >
          <Text className="font-semibold text-white">Dismiss anyway</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center gap-8 px-8">
      <View className="items-center gap-4">
        <Text className="text-8xl">📡</Text>
        <Text className="text-center text-2xl font-bold text-white">
          Tap your NFC tag
        </Text>
        <Text className="text-center text-sm text-white/50">
          Hold your phone near the tag to dismiss the alarm
        </Text>
      </View>

      {status === 'wrong' && (
        <View className="rounded-2xl bg-red-500/20 px-6 py-3">
          <Text className="text-center text-base font-semibold text-red-400">
            Wrong tag — try again
          </Text>
        </View>
      )}

      {status === 'error' && (
        <View className="rounded-2xl bg-yellow-500/20 px-6 py-3">
          <Text className="text-center text-base text-yellow-400">
            Scan timed out — try again
          </Text>
        </View>
      )}

      {(status === 'wrong' || status === 'error' || status === 'idle') && (
        <Pressable
          onPress={scan}
          className="rounded-full bg-white/20 px-10 py-4"
        >
          <Text className="font-semibold text-white">Scan again</Text>
        </Pressable>
      )}
    </View>
  );
}
