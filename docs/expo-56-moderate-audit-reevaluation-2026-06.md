# Expo 56 反映後の moderate 監査再評価 (2026-06-19)

対象: `app/package.json`, `app/package-lock.json`

## 実施コマンド

```bash
cd app
npm audit --omit=dev --json
npm audit --json
npm ls expo expo-sharing @expo/config-plugins xcode uuid --all
```

## 前提

- issue #297 までの対応後、`npm audit --json` は `high 0 / moderate 12 / low 2 / total 14`
- 2026-06-19 時点の `npm audit --omit=dev --json` は `high 0 / moderate 11 / low 2 / total 13`
- 残る moderate は Expo 設定系の依存連鎖に集中し、non-dev で見ると `ajv` は除外される

## 残存 moderate の整理

### 1. Expo 56 系のままで追跡継続するもの

- `expo`
- `@expo/cli`
- `@expo/config`
- `@expo/config-plugins`
- `@expo/inline-modules`
- `@expo/local-build-cache-provider`
- `@expo/metro-config`
- `@expo/prebuild-config`
- `expo-sharing`

観測:
- `expo@56.0.12` と `expo-sharing@56.0.18` はいずれも `@expo/config-plugins@56.0.9` を共有している
- `@expo/config-plugins@56.0.9` は `xcode@3.0.1` を引き、その先で `uuid@7.0.3` が残る
- `expo-sharing` 側は `@expo/plist -> @xmldom/xmldom` も持つが、これは issue #293 の override で吸収済み
- `npm audit` の `fixAvailable` は `expo@46.0.21` や `expo-sharing@14.0.8` のような非現実的な候補を返しており、そのまま採用不可

判断:
- Expo 56 系の同一メジャー内で lockfile を揺らしても、`config-plugins -> xcode -> uuid` 連鎖は upstream 側更新待ちの可能性が高い
- アプリ側の直接依存だけで片付く粒度ではなく、Expo 本体または `expo-sharing` が新しい `config-plugins` を取り込むまで据え置き候補

### 2. Expo 非依存で個別更新を再確認したもの

- `ajv`
- `compression`
- `on-headers`

観測:
- `ajv@6.12.6` は `eslint@8.57.1` と `@eslint/eslintrc@2.1.4` から参照されており、prod 監査には出ない
- `compression@1.8.0` は `@expo/cli@56.1.16` と `@react-native-community/cli-server-api@20.1.3` の双方から参照されている
- `on-headers@1.0.2` は `compression@1.8.0` 配下で残っている
- `brace-expansion`, `js-yaml`, `yaml` は issue #297 で解消済み

判断:
- `ajv` は dev 依存に閉じているので、次回は ESLint 系更新可否の確認を単独 issue として切り出すのが妥当
- `compression` / `on-headers` は low かつ Expo CLI と React Native CLI の共通下位依存なので、override を急ぐより upstream 追従確認を優先する

## 追加更新で減らせるもの / 据え置くもの

### 追加更新で減らせる可能性があるもの

- `ajv`
- `compression`
- `on-headers`

理由:
- `ajv` は dev 依存なので、解消価値はあるがリリース阻害度は高くない
- `compression` / `on-headers` は prod 監査に残る low だが、依存元が CLI 側に寄っておりアプリ本体コードからは触りにくい
- いずれも「まず separate issue で更新条件を固定し、その後 PR 化」の順が安全

### 現状据え置くもの

- `expo`
- `@expo/cli`
- `@expo/config`
- `@expo/config-plugins`
- `@expo/inline-modules`
- `@expo/local-build-cache-provider`
- `@expo/metro-config`
- `@expo/prebuild-config`
- `expo-sharing`
- `xcode`
- `uuid`

理由:
- `config-plugins -> xcode -> uuid` の依存連鎖が Expo 側パッケージ更新に閉じており、アプリ側だけで安全に差し替える根拠が薄い

## 次の PR 粒度

1. `ajv` を含む ESLint 系更新可否を検証する PR
2. `compression` / `on-headers` の CLI 依存更新可否を確認する PR
3. Expo / `expo-sharing` / `config-plugins` / `xcode` / `uuid` の upstream 追跡メモ更新 PR

## 結論

- 2026-06-19 時点で `npm audit --omit=dev` の残件は `moderate 11 / low 2 / total 13`
- prod 残件の主因は `@expo/config-plugins -> xcode -> uuid` を含む Expo 設定系連鎖
- dev を含めると `ajv@6.12.6` が 1 件追加されるが、これは `eslint` 系の更新判断とセットで扱うのが妥当
- 次に着手するべき実装単位は「Expo upstream 追従待ちの残件整理」「CLI 配下 low 依存の更新条件整理」「ajv を ESLint 系更新込みで扱うかの判断」
