# React Native CLI 系 critical 脆弱性の解消方針

最終更新: 2026-06-14 (Asia/Tokyo)
対象 issue: #270

## 結論

Expo SDK 55 / React Native 0.83 系のままでも、`@react-native-community/cli` 一式を `19.1.2` へ更新する単独 PR で進める方針が妥当です。

## 実施した検証

`app/package.json` の以下を `19.1.2` へ更新して確認しました。

- `@react-native-community/cli`
- `@react-native-community/cli-platform-android`
- `@react-native-community/cli-platform-ios`

確認コマンド:

```bash
cd app
npm test -- --runInBand
npm run lint
npm audit --json
```

## 検証結果

### 監査件数の差分
- 更新前: `critical 4 / high 6 / moderate 27 / low 2 / total 39`
- `19.1.2` 更新後: `critical 0 / high 6 / moderate 26 / low 2 / total 34`

### 動作確認
- `npm test`: 成功
- `npm run lint`: 成功

## 判断理由

1. critical が 4 件から 0 件へ落ち、効果が明確
2. Expo SDK 56 へのメジャー移行を待たずに切り出せる
3. テストと lint が通っており、少なくとも JavaScript 層では破綻が見えていない

## 残るリスク

- Android / iOS のネイティブビルド確認は別途必要
- `fast-xml-parser` の経路は lockfile 更新で吸収されるが、将来の Expo SDK 更新時に再監査したい
- `cli-platform-*` の 20 系は Expo SDK 56 / React Native 0.85 以降とまとめて再評価する方が安全

## 推奨 PR 単位

1. CLI 19.1.2 更新のみの小さい PR
2. CI と実機ビルド確認
3. その後に Expo SDK 56 評価 PR へ進む
