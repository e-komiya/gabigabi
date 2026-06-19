# app 依存の監査状況メモ (2026-06)

最終更新: 2026-06-19 (Asia/Tokyo)
対象: `app/package.json`, `app/package-lock.json`

## 背景

Expo SDK 56 反映と React Native CLI の緊急更新を取り込んだ後でも、`npm audit` では Expo 系を中心に moderate 以上の脆弱性が残っています。
このメモは、現時点で残っているものを「アプリ側ですぐ消せる可能性があるもの」と「upstream 追従待ちのもの」に分けて、次の着手単位を固定するためのものです。

## 実施コマンド

```bash
cd app
npm audit --omit=dev --json
npm audit --json
npm outdated --json
```

## 現在のサマリ

2026-06-19 時点の `npm audit` 件数:

- `npm audit --omit=dev --json`: critical 0 / high 0 / moderate 11 / low 2 / total 13
- `npm audit --json`: critical 0 / high 0 / moderate 12 / low 2 / total 14

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

## 2026-06-18 issue #293 対応結果

実施内容:
- `package.json` に `overrides` を追加し、`@xmldom/xmldom`, `flatted`, `minimatch`, `picomatch`, `ws` を脆弱性修正版へ固定
- `package-lock.json` を更新し、開発系ツールチェーン配下の high を解消
- `npm test -- --runInBand` と `npm run lint` を再実行して回帰がないことを確認

依存元の切り分け:
- `@xmldom/xmldom`: `expo-sharing -> @expo/config-plugins -> xcode -> simple-plist -> plist`
- `flatted`: `eslint -> file-entry-cache -> flat-cache`
- `minimatch`: `eslint`, `jest`, `@react-native/jest-preset` 周辺のトランジティブ依存
- `picomatch`: `jest`, `react-native`, `eslint-config-universe` 周辺のトランジティブ依存
- `ws`: `react-native`, `@react-native-community/cli`, `expo` CLI / Metro 周辺のトランジティブ依存

`npm audit` 件数差分:
- 対応前: `high 5 / moderate 15 / low 2 / total 22`
- 対応後: `high 0 / moderate 15 / low 2 / total 17`

判断:
- high 5 件は Expo SDK のメジャー更新なしでも `overrides` で安全に吸収できた
- まだ残る moderate は Expo 設定系とその周辺依存に集中しており、次段階は Expo 系の据え置き可否を整理する作業に寄せる

## 2026-06-18 issue #297 対応結果

実施内容:
- `package.json` の `overrides` に `brace-expansion@1.1.15`, `js-yaml@4.2.0`, `yaml@2.9.0` を追加
- `package-lock.json` を再生成し、non-Expo moderate のうち override で安全に吸収できる範囲を先行解消
- `npm test -- --runInBand` と `npm run lint` を再実行して回帰がないことを確認

件数差分:
- 対応前: `high 0 / moderate 15 / low 2 / total 17`
- 対応後: `high 0 / moderate 12 / low 2 / total 14`

依存元の整理:
- `brace-expansion`: `eslint`, `jest`, `expo` / `expo-sharing` が共有する `minimatch` / `glob` 系のトランジティブ依存
- `js-yaml`: `eslint` と `@react-native-community/cli`、および `babel-plugin-istanbul` 配下の設定読込依存
- `yaml`: `@react-native-community/cli-doctor` と `expo -> @expo/metro -> metro-config` 配下の依存
- `ajv`: `eslint -> @eslint/eslintrc` 由来で、現行系列では v6 から v8 への差し替え影響が読みにくいため今回は据え置き

据え置き理由:
- Expo 系の moderate は引き続き `@expo/config-plugins -> xcode -> uuid` 連鎖に集中しており、アプリ側 override だけで安全に片付ける根拠が薄い
- `ajv` は fix が v8 系前提で、`eslint@8` 周辺の互換性確認なしに override するのはリスクが高い

## 2026-06-19 issue #299 対応結果

実施内容:
- `npm audit --omit=dev --json` と `npm audit --json` を再実行し、prod と dev を分けて残件を再棚卸し
- `package-lock.json` から `ajv`, `compression`, `on-headers`, `@expo/config-plugins`, `xcode`, `uuid` の依存元を再確認
- 残件を 3 つの次アクション, つまり `ajv` 検証, `compression` / `on-headers` 追跡, Expo upstream 追跡に分解

依存元の再整理:
- `ajv@6.12.6`: `eslint@8.57.1`, `@eslint/eslintrc@2.1.4`
- `compression@1.8.0`: `@expo/cli@56.1.16`, `@react-native-community/cli-server-api@20.1.3`
- `on-headers@1.0.2`: `compression@1.8.0`
- `@expo/config-plugins@56.0.9`: `expo@56.0.12`, `expo-sharing@56.0.18` など
- `xcode@3.0.1`: `@expo/config-plugins@56.0.9`
- `uuid@7.0.3`: `xcode@3.0.1`

判断:
- prod 残件は依然として Expo 設定系が中心で、アプリコード単体の修正だけで減らせる余地は小さい
- `ajv` は dev 限定なので、lint 系の更新検証を独立作業として扱うのが安全
- `compression` / `on-headers` は low かつ CLI 系の共通依存なので、upstream 更新可否の監視を優先する

## 今回の結論

- critical / high は解消済みで、残件は Expo 系 moderate と少数の dev / low 依存に絞られた
- prod 観点の残件は `@expo/config-plugins -> xcode -> uuid` を含む Expo 設定系連鎖が主因
- 残件は「一括修正」ではなく、次の 3 系統に分割して進める

1. `ajv` を含む ESLint 系更新可否の確認
2. `compression` / `on-headers` の CLI 依存更新可否の確認
3. Expo / `expo-sharing` / `config-plugins` / `xcode` / `uuid` の upstream 追跡

## 次に切る PR 単位

1. `ajv` を含む ESLint 系更新可否を検証する PR
2. `compression` / `on-headers` の CLI 依存更新可否を確認する PR
3. Expo upstream 追跡メモを更新する PR

## 完了条件

この issue は以下を満たしたら完了とする。

- 2026-06-19 時点の残存監査項目が prod / dev 別に文書化されている
- アプリ側で先に触れる候補と upstream 追従待ちの候補が分離されている
- 次に作る PR 単位が明文化されている
