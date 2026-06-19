# CLI 依存の `compression` / `on-headers` 追跡メモ (2026-06)

最終更新: 2026-06-19 (Asia/Tokyo)
対象 issue: #301

## 背景

`npm audit --omit=dev --json` に残っていた low 2 件は、`compression@1.8.0` と `on-headers@1.0.2` が原因でした。
依存元は `@expo/cli@56.1.16` と `@react-native-community/cli-server-api@20.1.3` で、アプリ本体コードから直接 import しているわけではありません。

## 今回確認したこと

- `@expo/cli@56.1.16` の dependency は `compression: ^1.7.4`
- `@react-native-community/cli-server-api@20.1.3` の dependency は `compression: ^1.7.1`
- `compression` 最新は `1.8.1`
- `on-headers` 最新は `1.1.0`

このため、アプリ側の direct dependency を増やさなくても、lockfile の再解決だけで修正版へ寄せられる余地がありました。

## 実施内容

- `npm update compression on-headers --ignore-scripts` を実行
- lockfile 上の解決結果を次のように更新
  - `compression`: `1.8.0` -> `1.8.1`
  - `on-headers`: `1.0.2` -> `1.1.0`
- `npm run lint` を再実行
- `npm test -- --runInBand` を再実行
- `npm audit --omit=dev` を再実行

## 結果

- lint と test は通過
- `npm audit --omit=dev` では low が消え、残件は Expo 設定系由来の moderate 11 件のみになった
- つまり `compression` / `on-headers` は override なし、lockfile 更新のみで安全に解消できた

## 結論

この issue で扱うべき low 2 件は、CLI 側 dependency range の範囲内更新で吸収できました。
今後は `@expo/config-plugins -> xcode -> uuid` 連鎖の upstream 追跡に集中してよい状態です。
