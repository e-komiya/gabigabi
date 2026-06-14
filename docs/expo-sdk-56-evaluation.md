# Expo SDK 56 移行評価メモ

最終更新: 2026-06-14 (Asia/Tokyo)
対象 issue: #271

## 結論

Expo SDK 56 への移行は実施価値が高いですが、CLI critical 解消 PR とは分離し、段階的に進めるのが安全です。

## 現状

- 現在の Expo 依存は SDK 55 系
- アプリは画像選択、共有、通知、FFmpeg、Rust Core 連携を含む
- `app.json` は managed workflow 寄りだが、開発時は `expo run:android` / `expo run:ios` を使う前提

## SDK 56 で押さえるポイント

Expo 公開情報では、SDK 56 は主に以下の変化を含みます。

- React Native 0.85 / React 19.2 への更新
- Hermes v1 が既定
- Expo UI 安定化
- Expo Modules / ネイティブビルド周辺の更新
- Expo 系パッケージ群の再整列

このため、JavaScript 依存だけでなくネイティブビルド面の確認が必要です。

## このアプリで影響が出やすい確認観点

### 1. Android 実機ビルド
- `expo run:android` が通るか
- FFmpeg Kit と Rust Core のネイティブ連携が壊れないか
- 生成 APK / AAB のサイズや起動時間に大きな変化がないか

### 2. 通知
- `expo-notifications` の SDK 56 対応版への追従
- Android 13+ 権限フローや通知チャンネルの既存実装差分
- フォアグラウンド / バックグラウンド通知の挙動

### 3. 共有
- `expo-sharing` の更新後に画像・動画共有が維持されるか
- 共有対象 URI の扱いが変わっていないか

### 4. 画像選択
- `expo-image-picker` と `expo-media-library` の権限ダイアログ差分
- 画像 / 動画の選択結果型が既存処理と整合するか

### 5. Metro / 設定系依存
- `@expo/config*`, `@expo/metro-config`, `@expo/prebuild-config` の更新影響
- 既存の Babel / Jest / lint 設定がそのまま使えるか

## 可否判断

### 前向き材料
- SDK 55 系だけでは moderate が残りやすい
- SDK 56 で Expo 系依存の棚卸しを進めやすい
- React Native 0.85 / React 19.2 へ揃うことで次の保守負債を減らせる

### 注意点
- FFmpeg Kit と Rust Core を含むため、一般的な Expo アプリより検証幅が広い
- CLI 更新、Expo 更新、通知更新を一度に混ぜると切り戻しが難しい

## 推奨分割案

1. 先行 PR: issue #270 で CLI 19.1.2 更新
2. 準備 PR: SDK 56 へ上げ、`npx expo install --fix` と `expo-doctor` で依存整列
3. 検証 PR または同 PR 内の確認:
   - Android ビルド
   - 通知
   - 共有
   - 画像選択
   - FFmpeg / Rust Core 連携
4. 必要なら追補 PR:
   - UI 微修正
   - 権限文言や設定差分吸収

## 完了条件

- SDK 56 へ上げるか見送るか判断できる
- 影響範囲と確認項目が一覧化されている
- 着手しやすい PR 分割案が決まっている
