import { useEffect, useRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Text } from '~/components/ui/text';

export function QrCodeActionView({
  qrCodeValue,
  onComplete,
  enableTorch = false,
}: {
  qrCodeValue: string;
  onComplete: () => void;
  enableTorch?: boolean;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [wrongScan, setWrongScan] = useState(false);
  const completedRef = useRef(false);
  const cooldownRef = useRef(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  function handleBarcodeScan({ data }: { data: string }) {
    if (completedRef.current || cooldownRef.current) return;
    if (data === qrCodeValue) {
      completedRef.current = true;
      onComplete();
    } else {
      cooldownRef.current = true;
      setWrongScan(true);
      setTimeout(() => {
        cooldownRef.current = false;
        setWrongScan(false);
      }, 1500);
    }
  }

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-white/50">Requesting camera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center gap-4 px-8">
        <Text className="text-center text-base text-white/70">
          Camera permission required to scan QR code.
        </Text>
        <Pressable
          onPress={requestPermission}
          className="rounded-full bg-white/20 px-8 py-4"
        >
          <Text className="font-semibold text-white">Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <CameraView
        style={{ flex: 1 }}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarcodeScan}
        enableTorch={enableTorch}
      />
      <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
        <View
          style={{
            width: 240,
            height: 240,
            borderWidth: 3,
            borderColor: wrongScan ? '#f87171' : 'white',
            borderRadius: 16,
            backgroundColor: 'transparent',
          }}
        />
      </View>
      <View className="absolute bottom-0 left-0 right-0 items-center pb-8 pt-4">
        <View className="rounded-2xl bg-black/60 px-6 py-3">
          {wrongScan ? (
            <Text className="text-center text-base font-semibold text-red-400">
              Wrong QR code — try again
            </Text>
          ) : (
            <Text className="text-center text-base text-white/80">
              Scan your saved QR code to dismiss
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
