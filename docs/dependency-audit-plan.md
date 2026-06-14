# app 依存の脆弱性棚卸しと Expo 系アップデート計画

最終更新: 2026-06-14 (Asia/Tokyo)
対象: `app/package-lock.json`

## 実施した確認

```bash
cd app
npm ci
npm audit --json
npm outdated --json
```

## 脆弱性サマリ

`npm audit` 時点の件数は以下です。

- critical: 3
- high: 6
- moderate: 26
- low: 2
- total: 37

## critical / high の主な内訳

### 1. React Native CLI 系 (critical)
- `@react-native-community/cli`
- `@react-native-community/cli-server-api`
- `fast-xml-parser`

現状の直接依存:
- `@react-native-community/cli`: `19.0.0`
- `@react-native-community/cli-platform-android`: `19.0.0`
- `@react-native-community/cli-platform-ios`: `19.0.0`

監査上の修正候補:
- パッチで吸収できる候補: `@react-native-community/cli@19.1.2`
- より広い解消候補: `@react-native-community/cli-platform-android@20.1.3` などのメジャー更新

懸念:
- CLI 周りは Expo SDK と React Native 本体の整合性確認が必要
- `cli-platform-*` の 20 系は Expo SDK 55 / RN 0.83 系とまとめて評価した方が安全

### 2. Babel / Jest / ESLint 由来 (high)
- `@babel/plugin-transform-modules-systemjs`
- `minimatch`
- `flatted`
- `picomatch`

観測内容:
- これらは devDependencies とそのトランジティブ依存に偏っている
- `@babel/core`, `@babel/preset-env`, `eslint-config-universe` の更新で一部は追従解消が見込める

### 3. Expo / 設定系依存 (moderate だが件数が多い)
- `@expo/cli`
- `@expo/config`
- `@expo/config-plugins`
- `@expo/prebuild-config`
- `@expo/metro-config`

観測内容:
- Expo SDK 55 系のままでもパッチ更新候補がある
- 一部は Expo SDK 56 系まで上げないと綺麗に解消しない可能性がある

## outdated から見た更新候補

### まず同一メジャー内で上げたいもの
- `expo`: `55.0.2` → `55.0.26`
- `expo-dev-client`: `55.0.9` → `55.0.35`
- `expo-file-system`: `55.0.9` → `55.0.22`
- `expo-notifications`: `0.32.16` → `0.32.17`
- `expo-sharing`: `55.0.18` → `55.0.20`
- `expo-video-thumbnails`: `55.0.14` → `55.0.15`
- `@babel/core`: `7.27.4` → `7.29.7`
- `@babel/preset-env`: `7.27.2` → `7.29.7`
- `@babel/runtime`: `7.27.6` → `7.29.7`
- `eslint-config-universe`: `15.0.3` → `15.2.0`
- `zustand`: `5.0.5` → `5.0.14`
- `react-native-share`: `12.2.5` → `12.3.1`
- `react-native-svg`: `15.15.3` → `15.15.5`
- `@types/react`: `19.2.14` → `19.2.17`
- `react-test-renderer`: `19.2.0` → `19.2.7`

### メジャー更新扱いで別検証に分けたいもの
- `expo`: `55.x` → `56.x`
- `expo-notifications`: `0.32.x` → `56.x` 系対応版
- `@react-native-community/cli-platform-android`: `19.0.0` → `20.1.3`
- `@react-native-community/cli-platform-ios`: `19.0.0` → `20.1.3`
- `@testing-library/react-native`: `13.x` → `14.x`
- `eslint`: `8.x` → `10.x`
- `typescript`: `5.0.4` → `6.x`

## 推奨アップデート方針

### Phase 1. 同一メジャー内の安全更新
目的:
- high / moderate の一部を小さく減らす
- Expo SDK 55 系のまま追従できる差分を先に吸収する

候補:
1. Expo 55 系パッチ更新
2. Babel / eslint-config-universe / 周辺ツール更新
3. `npm audit` 再実行
4. `npm test`, `npm run lint`, Rust テスト確認

### Phase 2. React Native CLI の critical 解消
目的:
- critical 3件の直接的な火消し

候補:
1. `@react-native-community/cli` をまず `19.1.2` へ更新
2. まだ `fast-xml-parser` 系が残る場合、`cli-platform-*` 更新要否を切り分け
3. Expo SDK 55 との互換性が崩れるなら Phase 3 と同時実施

### Phase 3. Expo SDK 56 移行可否の評価
目的:
- Expo 系 moderate をまとめて減らす
- `config-plugins` や `prebuild-config` 周りの古さを解消する

確認項目:
- Expo SDK 56 の breaking change
- React Native / dev client / notifications の互換性
- Android ビルド、EAS Build、通知権限まわりの差分

## 実施順の提案

1. Phase 1 用の小さい PR を作る
2. その結果の `npm audit` 差分を記録する
3. critical が残る React Native CLI 系だけ別 PR で評価する
4. 最後に Expo SDK 56 への移行を検討する

## 2026-06-14 実施結果

### 実施した更新
- `expo` を `55.0.26` へ更新
- `expo-dev-client`, `expo-file-system`, `expo-notifications`, `expo-sharing`, `expo-video-thumbnails` を 55 系 / 0.32 系の最新パッチへ更新
- `@babel/core`, `@babel/preset-env`, `@babel/runtime`, `eslint-config-universe` を更新
- `zustand`, `react-native-share`, `react-native-svg`, `@types/react` を更新
- `react-test-renderer` は `@testing-library/react-native` との整合性を優先し、`19.2.0` を維持

### 脆弱性件数の差分
- 更新前: `critical 4 / high 6 / moderate 27 / low 2 / total 39`
- 更新後: `critical 4 / high 4 / moderate 24 / low 2 / total 34`

### 確認コマンド
```bash
cd app
npm test -- --runInBand
npm run lint
cd ../rust_core
cargo test
```

確認結果:
- `npm test`: 成功
- `npm run lint`: 成功
- `cargo test`: 成功

### 残課題
- critical 4 件は React Native CLI 系に集中しており、同一メジャー更新だけでは解消できなかった
- 次段階として issue #270 で CLI 系を `19.1.2` へ上げる単独 PR を切る価値がある
- Expo 設定系の moderate は issue #271 の SDK 56 評価と合わせて継続判断する

## 完了条件の具体化

この issue は以下が揃えば完了とみなせます。

- 現在の脆弱性件数と主要原因が文書化されている
- critical / high の優先順位が明確になっている
- 同一メジャー更新とメジャー更新が分離されている
- 次に切るべき PR の単位が決まっている
