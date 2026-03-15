#!/usr/bin/env bash
set -euo pipefail

DEVICE="192.168.0.173:5555"
PKG="com.convert2gabigabi"
APP_DIR="${APP_DIR:-$HOME/build/conv-app/app}"

cd "$APP_DIR"

echo "==> Pulling latest master..."
git checkout master && git pull

echo "==> Bundling JS..."
mkdir -p android/app/src/main/assets
npx react-native bundle \
  --platform android --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res/

echo "==> Building APK..."
cd android
rm -rf app/build
./gradlew assembleDebug

echo "==> Installing on device..."
adb -s "$DEVICE" install -r app/build/outputs/apk/debug/app-debug.apk

echo "==> Launching app..."
adb -s "$DEVICE" shell am force-stop "$PKG"
adb -s "$DEVICE" shell am start -n "$PKG/.MainActivity"

echo "==> Done!"
