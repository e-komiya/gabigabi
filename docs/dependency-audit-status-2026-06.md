# app 依存の監査状況メモ (2026-06)

最終更新: 2026-06-14 (Asia/Tokyo)
対象: `app/package.json`, `app/package-lock.json`

## 背景

同一メジャー更新と React Native CLI の緊急更新を取り込んだ後でも、`npm audit` では Expo 系を中心に moderate 以上の脆弱性が残っています。
このメモは、現時点で残っているものを「今の SDK 55 系で消せるもの」と「SDK 56 移行前提のもの」に分けて、次の着手単位を固定するためのものです。

## 実施コマンド

```bash
cd app
npm audit --json
npm outdated --json
```

## 現在のサマリ

2026-06-14 時点の `npm audit` 件数:

- critical: 4
- high: 6
- moderate: 27
- low: 2
- total: 39

## 既に反映済みの改善

- `@react-native-community/cli` は `19.1.2` に更新済み
- Expo 55 系で追従可能な同一メジャー更新は別 PR で反映済み
- Expo SDK 56 への移行評価メモは別 issue で整理済み

## まだ残る主なグループ

### 1. Expo SDK 55 にぶら下がる設定系依存

主な対象:

- `expo`
- `@expo/cli`
- `@expo/config`
- `@expo/config-plugins`
- `@expo/local-build-cache-provider`
- `@expo/metro-config`
- `expo-manifests`

観測:

- `fixAvailable: true` は出るが、多くは Expo SDK 56 系の組み合わせに寄る
- `expo-notifications` / `expo-sharing` の major 更新だけでは解消しきれない
- SDK 55 のままでは依存木の一部だけが新しくなり、混在状態になりやすい

### 2. React Native CLI platform 系の残件

主な対象:

- `@react-native-community/cli-platform-android`
- `@react-native-community/cli-platform-ios`
- `@react-native-community/cli-platform-apple`
- `fast-xml-parser`

観測:

- direct dependency を `20.1.3` に上げても、依存木の `cli-platform-apple` が 19 系のまま残るケースがある
- 単独更新では critical / high / moderate の件数が変わらず、まとめて整合性確認が必要

### 3. 開発系ツールチェーン由来

主な対象:

- `@babel/plugin-transform-modules-systemjs`
- `minimatch`
- `flatted`
- `picomatch`
- `shell-quote`

観測:

- 多くは devDependencies 側のトランジティブ依存
- Babel / ESLint / Jest 周辺をもう一段上げる検討余地はある
- ただし Expo SDK 56 移行と同時に依存木が大きく変わるため、先に Expo 側の方針を固めた方が差分を二重に追わずに済む

## 今回の結論

- Expo 系の残存脆弱性は、SDK 55 のまま小手先で消すより SDK 56 移行計画とセットで扱う方が安全
- React Native CLI platform 20 系は単独更新の効果が薄く、別 issue で追試する
- 残件は「すぐ全部直す」ではなく、次の 2 系統に分割して進める

1. Expo SDK 56 移行の前提整理と段階分割
2. React Native CLI platform 系の整合性確認

## 次に切る PR 単位

1. Expo SDK 56 に上げるための依存更新 PR
2. `expo-notifications` / `expo-sharing` の追従確認 PR
3. `cli-platform-*` の更新可否を検証する PR

## 完了条件

この issue は以下を満たしたら完了とする。

- 2026-06-14 時点の残存監査項目が文書化されている
- SDK 55 維持では解消しきれない群が分離されている
- 次に作る PR 単位が明文化されている
