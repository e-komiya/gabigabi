# Expo 56 反映後の moderate 監査再評価 (2026-06-18)

対象: `app/package.json`, `app/package-lock.json`

## 実施コマンド

```bash
cd app
npm audit --json
npm ls expo expo-sharing @expo/config-plugins xcode uuid --all
```

## 前提

- issue #293 の `overrides` 対応後、`npm audit` は `high 0 / moderate 15 / low 2 / total 17`
- 残る moderate は Expo 設定系の依存連鎖と、その周辺の古いユーティリティに集中している

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
- `npm audit` の `fixAvailable` は Expo 46 など非現実的な候補を返しており、そのまま採用不可

判断:
- Expo 56 系の同一メジャー内で lockfile を揺らしても、`config-plugins -> xcode -> uuid` 連鎖は upstream 側更新待ちの可能性が高い
- アプリ側の直接依存だけで片付く粒度ではなく、Expo 本体または `expo-sharing` が新しい `config-plugins` を取り込むまで据え置き候補

### 2. Expo 非依存で個別更新できるもの

- `ajv`
- `brace-expansion`
- `compression`
- `on-headers`
- `js-yaml`
- `yaml`

観測:
- `brace-expansion`, `js-yaml`, `yaml` は override だけで更新でき、2026-06-18 の issue #297 対応で実際に解消できた
- `compression` / `on-headers` は low で、React Native CLI 側の追従を待っても優先度は低い
- `ajv` は `eslint -> @eslint/eslintrc` 配下の v6 依存で、fixAvailable が v8 系を指すため互換性確認なしの override は避けたい

判断:
- Expo 連鎖とは分離して扱えるもののうち、まず `brace-expansion`, `js-yaml`, `yaml` を先行で減らすのが安全
- `ajv` は ESLint 系の更新や upstream 追従とセットで扱う方が無難

## 追加更新で減らせるもの / 据え置くもの

### 追加更新で減らせる可能性が高いもの

- `ajv`
- `compression`
- `on-headers`

理由:
- `brace-expansion`, `js-yaml`, `yaml` は issue #297 で解消済み
- 残る `ajv` は技術的には候補だが、ESLint 系の互換性確認が前提
- `compression` / `on-headers` は low のため、優先度は一段低い

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

1. non-Expo moderate を `overrides` で減らせるか検証する PR
2. Expo / `expo-sharing` / `config-plugins` の upstream 更新可否を追跡するメモ更新 PR

## 結論

- Expo 56 反映後も残る moderate の主因は `@expo/config-plugins -> xcode -> uuid` 連鎖
- non-Expo moderate のうち `brace-expansion`, `js-yaml`, `yaml` は issue #297 で先行解消できた
- 次に着手するべき実装単位は「Expo upstream 追従待ちの残件整理」と「ajv を ESLint 系更新込みで扱うかの判断」
