# Android実機開発環境 完全セットアップガイド（ゼロから動くまで）

このドキュメントは、何もない状態からAndroid実機でhot reloadができるまでの全手順を記録したものです。
実際に環境構築しながら確認した手順なので、同じ問題に当たった場合の対処法も含まれています。

---

## 前提環境

- OS: Linux（Fedora 43確認済み）
- Node.js: v22以上
- Java: OpenJDK 21（Temurin推奨）
- Android SDK: インストール済み

---

## Step 1: 必要なツールのインストール確認

```bash
# Javaの確認（17以上必須、21推奨）
java -version

# Node.jsの確認（18以上必須）
node -v
npm -v

# Android SDKの確認
echo $ANDROID_HOME   # パスが設定されていること
echo $ANDROID_SDK_ROOT

# ADBの確認
adb version
```

### Android SDKが未インストールの場合

[Android Studio](https://developer.android.com/studio)をインストールするか、コマンドラインツールだけインストールする。

```bash
# ANDROID_HOME環境変数をセット（~/.bashrc or ~/.zshrcに追加）
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_SDK_ROOT=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
```

---

## Step 2: スマホの開発者向けオプションを有効化

1. スマホの **設定 → デバイス情報（または端末情報）** を開く
2. **ビルド番号**を**7回タップ** → 「開発者になりました」と表示される
3. **設定 → 開発者向けオプション** を開く
4. **USBデバッグ** をONにする

---

## Step 3: スマホをUSBでPCに接続

1. USBケーブルでスマホとPCを接続
2. スマホに「**このPCのUSBデバッグを許可しますか？**」と表示されたら → **許可**
3. 接続確認：

```bash
adb devices
# 以下のように表示されればOK
# List of devices attached
# XXXXXXXXXX    device
```

`unauthorized` と表示された場合はスマホ側でもう一度許可が必要。

---

## Step 4: 依存関係のインストール

```bash
cd app
npm install
# または
yarn install
```

---

## Step 5: 初回ビルド＆インストール

**USBを繋いだ状態で**実行します。

```bash
cd app
npx expo run:android
```

- 初回は**10〜20分**かかります（Gradle依存関係のダウンロード）
- 2回目以降はキャッシュが効いて**1分以内**

### このプロジェクト固有の注意点

このプロジェクトは `expo-dev-client` を使っているため、**Expo Goアプリでは動作しません**。
必ず `npx expo run:android` でカスタムdev clientをビルドしてください。

### RN 0.80 + Hermesの既知バグ（`require` エラー）

**症状：** アプリ起動時に赤いエラー画面で以下が表示される
```
Property 'require' doesn't exist
ReferenceError: Property 'require' doesn't exist
```

**原因：** React Native 0.80のデフォルト設定（`lazy=true` + New Architecture）との組み合わせ問題

**対処法1: `gradle.properties` の修正**
```bash
# app/android/gradle.properties
newArchEnabled=false  # true から false に変更
```

**対処法2: `metro.config.js` の修正**
```js
const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: false,
      },
    }),
  },
};
```

**対処法3: Metro起動コマンドの変更**
```bash
# NG（lazy bundlingが有効になりエラーになる）
npx expo start

# OK（これを使う）
npx react-native start
```

3つとも適用して `npx expo run:android` で再ビルドしてください。

---

## Step 6: Wi-Fi経由でHot Reload設定

初回ビルド後、USBなしでWi-Fi経由でコード変更を即反映させます。

### 6-1. PCのIPアドレスを調べる

```bash
ip route get 1 | awk '{print $7; exit}'
# または
hostname -I | awk '{print $1}'
# 例: 192.168.0.42
```

### 6-2. スマホのIPアドレスを調べる

```bash
# USB接続中にadbで確認
adb shell ip route | awk '{print $9}'
# 例: 192.168.0.173
```

または、スマホ本体で：設定 → Wi-Fi → 接続中のネットワーク → IPアドレス

### 6-3. Wi-Fiデバッグを有効化（USB接続中に実行）

```bash
# ①Wi-FiデバッグモードをON
adb tcpip 5555

# ②スマホのIPでWi-Fi接続（IPは自分の環境のものに変更）
adb connect 192.168.0.173:5555
# → "connected to 192.168.0.173:5555" と表示されればOK

# ③ポートフォワード設定（localhost:8081をスマホに転送）
adb -s 192.168.0.173:5555 reverse tcp:8081 tcp:8081
# → "8081" と表示されればOK
```

**ここでUSBを抜いてOK！**

### 6-4. 開発サーバーを起動

```bash
cd app
npx react-native start
```

スマホでアプリを開けば接続完了。コードを変更するとWi-Fi経由でスマホに即反映されます。

---

## 毎回の開発フロー（セットアップ済みの場合）

```bash
# ① Wi-Fi接続を確認（切れてる場合は再接続）
adb devices
# 表示されなければ以下を実行：
adb connect 192.168.0.173:5555   # スマホIPは環境に応じて変更
adb -s 192.168.0.173:5555 reverse tcp:8081 tcp:8081

# ② 開発サーバー起動
cd app
npx react-native start
```

スマホでアプリを起動すれば開発開始！

---

## 再ビルドが必要なケース

以下の場合はUSBを繋いで `npx expo run:android` を再実行：

- `package.json` に新しいネイティブライブラリを追加した
- Expo SDKのバージョンを上げた
- `android/` や `ios/` 配下のネイティブコードを直接変更した

**通常のJS/TSコードの変更（画面レイアウト、ロジック等）は再ビルド不要**です。

---

## トラブルシューティング

### `adb devices` でスマホが表示されない / `unauthorized`

```bash
# USBを抜き差し、スマホの画面に許可ダイアログが出たら許可
adb kill-server
adb start-server
adb devices
```

### 「Could not connect to development server」

```bash
# Metroが起動しているか確認
curl http://localhost:8081/status
# "packager-status:running" と表示されればOK

# ポートフォワードを再設定
adb -s 192.168.0.173:5555 reverse tcp:8081 tcp:8081
```

### Wi-Fi接続が切れた（PC/スマホ再起動後）

Wi-Fi接続とポートフォワードはPC再起動でリセットされます。
再度「Step 6-3」の手順を実行してください（USBを一時的に繋ぐ必要あり）。

### アプリが黒/白い画面のまま

```bash
# アプリを強制終了して再起動
adb shell am force-stop com.app
adb shell am start -n com.app/.MainActivity
```
