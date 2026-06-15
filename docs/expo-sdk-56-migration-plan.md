# Expo SDK 56 移行計画

最終更新: 2026-06-15 (Asia/Tokyo)
対象: `app/package.json` / `app/package-lock.json`
関連: issue #282, issue #281

## 目的

Expo SDK 55 由来で残っている `expo` / `expo-notifications` / `expo-sharing` / `@expo/config*` 系の moderate 脆弱性を、SDK 56 移行を前提に整理する。

この文書は、実装前に依存更新の範囲、breaking change の確認ポイント、PR 分割方針を決めるための計画書である。

## 2026-06-15 時点の監査結果

`app` 配下で以下を実行した。

```bash
cd app
npm audit --json
```

件数:

- critical: 0
- high: 4
- moderate: 23
- low: 2
- total: 29

Expo 系で残っている主要対象:

- `expo`
- `expo-notifications`
- `expo-sharing`
- `@expo/config`
- `@expo/config-plugins`
- `@expo/metro-config`
- `expo-constants`

`npm audit` 上の修正候補は patch/minor ではなく、実質的に Expo SDK 56 系への更新を伴う。

## 現在の主要バージョン

- `expo`: `^55.0.26`
- `react`: `19.2.0`
- `react-native`: `0.83.2`
- `expo-dev-client`: `^55.0.35`
- `expo-file-system`: `^55.0.22`
- `expo-image-picker`: `^16.1.4`
- `expo-media-library`: `~17.1.6`
- `expo-notifications`: `^0.32.17`
- `expo-sharing`: `^55.0.20`

## SDK 56 で揃える前提の更新候補

`npm audit` と npm レジストリ確認ベースで、少なくとも以下を SDK 56 に合わせて更新候補として扱う。

### 直接依存

- `expo` -> `56.x`
- `expo-dev-client` -> `56.x`
- `expo-file-system` -> `56.x`
- `expo-image-picker` -> `17.x` 相当
- `expo-media-library` -> `18.x` 相当
- `expo-notifications` -> `56.0.17`
- `expo-sharing` -> `14.0.8`
- `expo-video-thumbnails` -> `56.x` 相当

### 整合性確認が必要な依存

- `react-native`
- `react-native-screens`
- `react-native-safe-area-context`
- `react-native-svg`
- `@react-navigation/native`
- `@react-navigation/native-stack`
- `expo-clipboard`

注記:
- Expo 管理下のパッケージは、実装時に `npx expo install --fix` で SDK 56 推奨版へ寄せる。
- `react` / `react-native` は Expo SDK 56 のサポート範囲に揃える。

## breaking changes の確認ポイント

### 1. `expo-notifications`

確認すること:

- Android 13+ の通知権限取得フローが現行実装と齟齬を起こさないか
- トークン取得、permission request、チャンネル設定まわりの API 差分
- バックグラウンド通知受信や初回起動時の分岐に変更が要るか

影響候補:

- 権限ダイアログ表示タイミング
- 通知チャンネル初期化コード
- Expo config plugin 由来の native 設定差分

### 2. `expo-sharing`

確認すること:

- 共有可能 MIME type の扱い
- Android Intent 起動周りの挙動差
- `expo-file-system` から渡す URI の互換性

影響候補:

- 保存済み画像, 変換後画像の共有フロー
- 一時ファイルの配置と共有失敗時のエラーハンドリング

### 3. prebuild / native project 差分

確認すること:

- `npx expo prebuild --platform android --clean` の差分
- AndroidManifest, Gradle, plugin 設定の増減
- `expo-notifications` plugin 更新に伴う Android 設定差分

## PR 分割方針

結論: **1PR ではなく 2 段階以上に分割する**。

理由:

1. SDK 56 本体更新と通知/共有の実機検証を同時に入れると切り戻しが重い
2. `expo-notifications` は runtime 権限と plugin 差分があり、単純な依存更新 PR にしにくい
3. `expo-sharing` は画像共有フローの回帰確認が必要で、UI 操作込みの確認項目が増える

推奨分割:

### PR 1. SDK 56 土台更新

内容:

- `expo` と Expo 管理パッケージの推奨版更新
- lockfile 更新
- `npx expo install --fix` による整合
- `npx expo-doctor`, `npm test`, `npm run lint` 実行
- 必要なら `prebuild` 差分を記録のみ行う

完了条件:

- アプリが起動可能
- JS テストと lint が通る
- Expo 系 moderate の減少を確認

### PR 2. 通知/共有回帰対応

内容:

- `expo-notifications` の権限, token, channel 周りの実装確認と必要修正
- `expo-sharing` を使う共有導線の回帰確認と必要修正
- 実機確認結果を README か docs に追記

完了条件:

- 通知権限取得が期待通り
- 変換後ファイルの共有が失敗しない
- native 設定差分が PR に記録されている

## 実装時の確認コマンド

```bash
cd app
npm install
npx expo install --fix
npx expo-doctor
npm test -- --runInBand
npm run lint
npx expo prebuild --platform android --clean
```

必要に応じて追加:

```bash
cd rust_core
cargo test
```

## リスクと判断

### 先にやらないこと

- SDK 56 移行と別件 UI 改修の同時投入
- `expo-notifications` と `expo-sharing` の挙動変更を未検証のまままとめてリリース
- Android native 差分を未確認のまま EAS Build に進むこと

### 今回の判断

- issue #282 は「移行方針の確定」を目的とし、この段階では実依存更新までは行わない
- 先に issue #281 の React Native CLI 更新 PR を取り込み、その後に SDK 56 の土台 PR を作る
- SDK 56 実装は 1 本ではなく、少なくとも土台更新 PR と通知/共有確認 PR に分ける

## 次に切るべき作業単位

1. issue #281 の PR を先にマージし、Expo 系以外の監査ノイズを減らす
2. SDK 56 土台更新 PR を作成する
3. 通知/共有の実機回帰確認 PR を続ける
