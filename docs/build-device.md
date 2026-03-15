# 実機ビルド手順（確実にJSバンドルを反映する方法）

## 背景

`npx expo run:android` + Metro経由のホットリロードでは、デバイス側がMetroから最新バンドルを取得できない場合がある。
特に `pm clear` 後やMetro再起動後に `Bundled 31ms (1 module)` となり、古いコードのまま表示される現象が確認されている。

**確実にJSコードの変更をデバイスに反映するには、バンドルをAPKに直接埋め込んでビルドする。**

---

## 手順

### 1. JSバンドルを生成

```bash
cd app
mkdir -p android/app/src/main/assets

npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res/
```

### 2. APKをビルド

```bash
cd android
./gradlew assembleDebug
```

### 3. デバイスにインストール

```bash
adb -s 192.168.0.173:5555 install -r app/build/outputs/apk/debug/app-debug.apk
adb -s 192.168.0.173:5555 shell am start -n com.eiseikomiya.convert2gabigabi/.MainActivity
```

---

## バンドルの検証

ビルド前にバンドルの中身を検証できる：

```bash
# 特定の文字列がバンドルに含まれるか確認
grep -c "paddingTop.*48" android/app/src/main/assets/index.android.bundle
# → 1 なら含まれている

# 含まれてはいけない文字列がないか確認
grep -c "タップして選択" android/app/src/main/assets/index.android.bundle
# → 0 なら削除済み
```

---

## Metro経由の開発（ホットリロード）

JSのみの変更で素早く確認したい場合はMetro経由も使える。ただし反映されない場合は上記のAPK埋め込み手順にフォールバックすること。

```bash
# Metro起動
npx expo start --port 8081 --clear

# デバイス側のポートフォワード
adb -s 192.168.0.173:5555 reverse tcp:8081 tcp:8081

# アプリ再起動
adb -s 192.168.0.173:5555 shell am force-stop com.eiseikomiya.convert2gabigabi
adb -s 192.168.0.173:5555 shell am start -n com.eiseikomiya.convert2gabigabi/.MainActivity
```

### Metro経由で反映されない場合のチェックポイント

1. **バンドルモジュール数を確認**: `Bundled Xms (986 modules)` と出ているか。`(1 module)` なら反映されていない
2. **Metroキャッシュ削除**: `rm -rf node_modules/.cache/ /tmp/metro-*`
3. **アプリデータクリア**: `adb shell pm clear com.eiseikomiya.convert2gabigabi`
4. 上記でもダメなら → APK埋め込み手順を使う

---

## 注意事項

- `@react-native/metro-config` が `devDependencies` に必要（`npx react-native bundle` が使うため）
- `android/app/src/main/assets/index.android.bundle` はgitignore推奨（ビルド成果物のため）
- ネイティブコード（Kotlin/Java/Gradle設定）を変更した場合は `./gradlew assembleDebug` が必須
