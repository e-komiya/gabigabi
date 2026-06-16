# Expo SDK 56 土台更新メモ

issue: #285

## 実施内容

- `expo` を `^56.0.0` へ更新
- Expo 管理パッケージを SDK 56 推奨版へ更新
- `react`, `react-native`, `react-native-safe-area-context`, `react-native-screens`, `react-native-svg`, `typescript` を整合版へ更新
- `expo-sharing` の config plugin を `app.json` に追加
- React Native 0.85 系で Jest が失敗しないように `@react-native/jest-preset` を追加し、`jest.config.js` を更新

## 実行結果

### 依存更新

```bash
npm install
npx expo install expo@^56.0.0
npx expo install --fix
```

### 検証

```bash
npx expo-doctor
npm test -- --runInBand
npm run lint
npx expo prebuild --platform android --clean
```

- `npm test -- --runInBand`: 成功
- `npm run lint`: 成功
- `npx expo-doctor`: 一部未解消
- `npx expo prebuild --platform android --clean`: 失敗

## 未解消事項

### expo-doctor

以下 2 点で失敗した。

1. `app.json` の `splash` など、native ディレクトリ併用時に同期されない設定がある警告
2. `./assets/icon.png` / `./assets/adaptive-icon.png` が存在せず、設定参照先が欠けている

### prebuild

`./assets/icon.png` が存在しないため Android prebuild が失敗した。

```text
Error: [android.dangerous]: withAndroidDangerousBaseMod: ENOENT: no such file or directory, open './assets/icon.png'
```

## 監査メモ

- 2026-06-15 の計画書時点: `total 29`（moderate 23 / high 4 / low 2）
- 今回更新後の `npm audit --json`: `total 22`（moderate 15 / high 5 / low 2）

moderate は減少したが、high が 1 件増えているため追加調査が必要。

## 次に見ること

- icon / adaptive icon など不足アセットの整理
- native ディレクトリ運用方針に合わせた `app.json` の見直し
- issue #286 で通知と共有フローの実機回帰確認
