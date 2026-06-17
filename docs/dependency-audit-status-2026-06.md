# app 依存の監査状況メモ (2026-06)

最終更新: 2026-06-17 (Asia/Tokyo)
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

2026-06-17 時点の `npm audit` 件数:

- critical: 0
- high: 5
- moderate: 15
- low: 2
- total: 22

## 既に反映済みの改善

- `@react-native-community/cli` は `19.1.2` に更新済みで、critical は解消済み
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

### 2. 開発系ツールチェーン由来

主な対象:

- `@xmldom/xmldom`
- `minimatch`
- `flatted`
- `picomatch`
- `ws`

観測:

- `@xmldom/xmldom`, `ws`, `minimatch`, `flatted`, `picomatch` が high を構成している
- 多くは Expo CLI / Metro / ESLint 周辺のトランジティブ依存
- Expo SDK 56 移行と同時に依存木が大きく変わるため、先に Expo 側の方針を固めた方が差分を二重に追わずに済む

## 今回の結論

- critical はすでに解消済みで、残件は Expo 55 系にぶら下がる moderate と開発系 high が中心
- Expo 系の残存脆弱性は、SDK 55 のまま小手先で消すより SDK 56 移行計画とセットで扱う方が安全
- 残件は「すぐ全部直す」ではなく、次の 2 系統に分割して進める

1. Expo SDK 56 移行の前提整理と段階分割
2. 開発系ツールチェーン更新の切り分け

## 次に切る PR 単位

1. Expo SDK 56 に上げるための依存更新 PR
2. `expo-notifications` / `expo-sharing` の追従確認 PR
3. `@xmldom/xmldom` / `ws` を引いている開発系依存の更新可否を検証する PR

## 完了条件

この issue は以下を満たしたら完了とする。

- 2026-06-17 時点の残存監査項目が文書化されている
- critical 解消後に残った群が整理されている
- 次に作る PR 単位が明文化されている
