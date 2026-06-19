import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { Text } from '~/components/ui/text';

const HASH_HTML = `<!DOCTYPE html><html><body><script>
async function compare(b64a, b64b) {
  async function getGray(b64) {
    return new Promise(function(res) {
      var img = new Image();
      img.onload = function() {
        var c = document.createElement('canvas');
        c.width = 8; c.height = 8;
        var ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, 8, 8);
        var d = ctx.getImageData(0, 0, 8, 8).data;
        var g = [];
        for (var i = 0; i < 64; i++) {
          g.push(0.299 * d[i*4] + 0.587 * d[i*4+1] + 0.114 * d[i*4+2]);
        }
        res(g);
      };
      img.src = 'data:image/png;base64,' + b64;
    });
  }
  var g1 = await getGray(b64a);
  var g2 = await getGray(b64b);
  var avg1 = g1.reduce(function(a,b){return a+b;},0)/64;
  var avg2 = g2.reduce(function(a,b){return a+b;},0)/64;
  var h1 = g1.map(function(v){return v>=avg1?1:0;});
  var h2 = g2.map(function(v){return v>=avg2?1:0;});
  var dist = h1.reduce(function(acc,v,i){return acc+(v!==h2[i]?1:0);},0);
  window.ReactNativeWebView.postMessage(JSON.stringify({distance:dist,match:dist<=15}));
}
window.__compare=compare;
<\/script></body></html>`;

export function PhotoMatchActionView({
  photoUri,
  onComplete,
}: {
  photoUri: string;
  onComplete: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<'viewfinder' | 'processing' | 'no_match'>('viewfinder');
  const [refBase64, setRefBase64] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const webViewRef = useRef<WebView>(null);
  const capturingRef = useRef(false);

  useEffect(() => {
    if (!photoUri) {
      onComplete();
      return;
    }
    if (!permission?.granted) requestPermission();
    manipulateAsync(photoUri, [{ resize: { width: 8, height: 8 } }], {
      format: SaveFormat.PNG,
      base64: true,
    })
      .then((r) => setRefBase64(r.base64 ?? null))
      .catch(() => onComplete());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCapture() {
    if (capturingRef.current || !cameraRef.current || !refBase64) return;
    capturingRef.current = true;
    try {
      setPhase('processing');
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.3 });
      const resized = await manipulateAsync(
        photo.uri,
        [{ resize: { width: 8, height: 8 } }],
        { format: SaveFormat.PNG, base64: true },
      );
      webViewRef.current?.injectJavaScript(
        `window.__compare("${refBase64}","${resized.base64 ?? ''}");true;`,
      );
    } catch {
      capturingRef.current = false;
      setPhase('viewfinder');
    }
  }

  function handleMessage(event: WebViewMessageEvent) {
    capturingRef.current = false;
    try {
      const { match } = JSON.parse(event.nativeEvent.data);
      if (match) {
        onComplete();
      } else {
        setPhase('no_match');
      }
    } catch {
      setPhase('viewfinder');
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
          Camera permission required to take a photo.
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
      <CameraView ref={cameraRef} className="flex-1" facing="back" />

      {/* Reference photo thumbnail */}
      {photoUri ? (
        <View className="absolute left-4 top-4">
          <Image
            source={{ uri: photoUri }}
            style={{ width: 80, height: 80, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)' }}
            resizeMode="cover"
          />
          <Text className="mt-1 text-center text-xs text-white/70">Target</Text>
        </View>
      ) : null}

      {/* Processing overlay */}
      {phase === 'processing' && (
        <View className="absolute inset-0 items-center justify-center bg-black/60">
          <ActivityIndicator color="white" size="large" />
          <Text className="mt-3 text-base text-white">Comparing…</Text>
        </View>
      )}

      {/* No-match overlay */}
      {phase === 'no_match' && (
        <View className="absolute inset-0 items-center justify-center bg-black/70">
          <Text className="mb-2 text-5xl">❌</Text>
          <Text className="mb-1 text-xl font-bold text-white">No match</Text>
          <Text className="mb-6 px-8 text-center text-sm text-white/60">
            Point at the same spot shown in the thumbnail
          </Text>
          <Pressable
            onPress={() => setPhase('viewfinder')}
            className="rounded-full bg-white/20 px-8 py-4"
          >
            <Text className="font-semibold text-white">Try Again</Text>
          </Pressable>
        </View>
      )}

      {/* Shutter button */}
      {phase === 'viewfinder' && (
        <View className="absolute bottom-0 left-0 right-0 items-center pb-8">
          <View className="mb-5 rounded-2xl bg-black/60 px-6 py-3">
            <Text className="text-center text-sm text-white/80">
              Point at the same location and take a photo
            </Text>
          </View>
          <Pressable
            onPress={handleCapture}
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              borderWidth: 4,
              borderColor: 'white',
              backgroundColor: 'rgba(255,255,255,0.3)',
            }}
          />
        </View>
      )}

      {/* Hidden WebView — perceptual hash computation */}
      <WebView
        ref={webViewRef}
        source={{ html: HASH_HTML }}
        onMessage={handleMessage}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
        javaScriptEnabled
        originWhitelist={['*']}
      />
    </View>
  );
}
