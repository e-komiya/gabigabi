# expo-notifications / expo-sharing major 更新の評価メモ

最終更新: 2026-06-14 (Asia/Tokyo)
対象: `app/package.json`, `app/package-lock.json`

## 背景

`npm audit` では `expo-notifications` と `expo-sharing` の更新候補として、以下の major update が提示されています。

- `expo-notifications` -> `56.0.17`
- `expo-sharing` -> `14.0.8`

この issue では、Expo SDK 55 のまま先行更新できるかを確認しました。

## 実施した確認

### 1. 一時的に更新して install を実行

以下の変更を一時適用し、`npm install --legacy-peer-deps` を実行しました。

```json
{
  "expo-notifications": "56.0.17",
  "expo-sharing": "14.0.8"
}
```

### 2. 観測結果

- install 自体は成功
- `npm audit` の件数は `39` -> `37` に減少
- ただし依存木は Expo 55 系と Expo 56 系が混在する

実際に混在した代表例:

- `expo`: `55.0.2`
- `expo-notifications`: `56.0.17`
- `expo-sharing`: `14.0.8`
- `expo-constants`: `55.0.7` と `56.0.18` が共存
- `@expo/config-plugins`: `55.0.8` が残る

## 解釈

### 良かった点

- 監査件数は少し減る
- install が即座に壊れるわけではない

### 懸念点

- Expo SDK 55 本体の上に Expo 56 向け依存が部分的に混ざる
- 通知権限、config plugin、prebuild の生成物が SDK 混在前提になり得る
- `npm audit` の削減効果が限定的で、残る Expo 系の moderate は依然多い

## 現時点の判断

- Expo SDK 55 のまま `expo-notifications` / `expo-sharing` だけ先行更新するのは見送り
- これらは Expo SDK 56 移行 PR の一部としてまとめて上げる
- 単独 PR にせず、SDK 本体・config plugin・関連モジュールの整合性を同時に確認する

## 次回の確認観点

1. Expo SDK 56 へ更新した状態で `expo-notifications` / `expo-sharing` を公式推奨値に揃える
2. `expo prebuild` 相当の生成差分確認
3. Android 実機で通知権限と共有シートの動作確認
4. `npm audit` の差分を再計測

## 完了条件

この issue は以下を満たしたら完了とする。

- SDK 55 のまま先行更新した結果が記録されている
- 監査件数は減るが SDK 混在リスクがあることが明文化されている
- SDK 56 移行 PR に統合する判断が共有されている
