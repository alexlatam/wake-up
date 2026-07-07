# Android Build Setup (sin emulador)

Objetivo: instalar lo mínimo para hacer builds APK e instalarlos en celular físico.

---

## Requisitos de espacio

| Componente | Disco |
|---|---|
| Android Studio | ~1.5 GB |
| Android SDK (platform + build tools) | ~3 GB |
| Gradle cache (crece con el tiempo) | ~2–5 GB |
| **Total mínimo recomendado libre** | **10 GB** |

RAM: 8 GB mínimo. 16 GB recomendado.

---

## 1. Instalar Android Studio

1. Descargar desde: https://developer.android.com/studio
2. Abrir el instalador y seguir el wizard
3. En el paso **"Install Type"**: elegir **Custom**
4. Deseleccionar **Android Virtual Device** (emulador) — no lo necesitamos
5. Seleccionar:
   - Android SDK
   - Android SDK Platform
   - Performance (Intel HAXM) — opcional, solo para emulador
6. Completar instalación

---

## 2. Instalar componentes SDK mínimos

Abrir Android Studio → **More Actions** → **SDK Manager**

### SDK Platforms tab
- Marcar: **Android 15 (API 35)** — o la versión más reciente disponible

### SDK Tools tab
- Marcar:
  - **Android SDK Build-Tools** (versión más reciente)
  - **Android SDK Platform-Tools**
  - **Android SDK Command-line Tools**

Clic en **Apply** → **OK**. Esperar descarga (~3 GB).

---

## 3. Configurar variables de entorno

Agregar al archivo `~/.bashrc` o `~/.zshrc`:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
```

Recargar:

```bash
source ~/.bashrc
# o
source ~/.zshrc
```

Verificar:

```bash
adb --version
# debe mostrar algo como: Android Debug Bridge version 1.0.41
```

---

## 4. Habilitar modo desarrollador en el celular

1. Ir a **Ajustes** → **Acerca del teléfono**
2. Tocar **Número de compilación** 7 veces seguidas
3. Ir a **Ajustes** → **Opciones de desarrollador**
4. Activar **Depuración USB**
5. Conectar el celular por USB
6. Aceptar el popup de autorización que aparece en el celular

Verificar que el dispositivo sea reconocido:

```bash
adb devices
# debe listar tu dispositivo, ej: "emulator-5554 device"
```

---

## 5. Hacer el primer build

Desde la raíz del proyecto:

```bash
# Build debug (más rápido, para pruebas)
npm run android
# equivale a: expo run:android
```

El primer build tarda 5–15 minutos (descarga Gradle + compila todo).
Los siguientes builds son más rápidos (~1–2 min si no cambiaste código nativo).

El APK queda en:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 6. Instalar APK manualmente (sin cable)

Si quieres compartir o reinstalar sin recompilar:

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

O copiar el APK al celular y abrirlo desde el explorador de archivos.
El celular pedirá permiso para "instalar apps de fuentes desconocidas" — aceptar.

---

## Limpiar espacio cuando haga falta

```bash
# Limpiar build del proyecto (~500 MB)
cd android && ./gradlew clean

# Ver tamaño del cache de Gradle
du -sh ~/.gradle/caches

# Limpiar cache de Gradle (libera 2–5 GB, pero el siguiente build es lento)
rm -rf ~/.gradle/caches
```

---

## Troubleshooting rápido

| Problema | Solución |
|---|---|
| `adb: command not found` | Verificar `$ANDROID_HOME/platform-tools` en PATH |
| `ANDROID_HOME is not set` | Ejecutar `source ~/.bashrc` y reintentar |
| Build falla con SDK version error | SDK Manager → instalar la versión que pide el error |
| Celular no aparece en `adb devices` | Cambiar cable USB, aceptar popup en celular, probar `adb kill-server && adb start-server` |
| `app-debug.apk` no instala | Activar "fuentes desconocidas" en Ajustes → Seguridad |
