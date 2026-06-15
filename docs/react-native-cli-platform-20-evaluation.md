# React Native CLI platform 20 系の検証メモ

最終更新: 2026-06-14 (Asia/Tokyo)
対象: `app/package.json`, `app/package-lock.json`

## 背景

`@react-native-community/cli` 本体は `19.1.2` へ更新済みですが、監査結果には `cli-platform-android` / `cli-platform-ios` とその配下の `fast-xml-parser` が残っています。
このメモでは、Expo SDK 55 / React Native 0.83.2 のまま `20.1.3` へ上げられるかを簡易検証した結果を残します。

## 実施した確認

### 1. 現在値の確認

`app/package.json` の現行 direct dependency:

- `@react-native-community/cli-platform-android`: `19.0.0`
- `@react-native-community/cli-platform-ios`: `19.0.0`
- `@react-native-community/cli`: `19.1.2`

### 2. lockfile だけでの追試

以下の変更を一時的に適用して `npm install --package-lock-only --legacy-peer-deps` を実行しました。

```json
{
  "@react-native-community/cli-platform-android": "20.1.3",
  "@react-native-community/cli-platform-ios": "20.1.3"
}
```

観測結果:

- lockfile 更新自体は成功
- ただし脆弱性件数は `39` のままで改善なし
- 依存木を見ると `@react-native-community/cli-platform-apple` が `19.0.0` のまま残る
- `fast-xml-parser` も `4.5.3` のままで、監査上の残件解消には直結しなかった

## 解釈

### なぜ単独更新で解消しないか

- `cli-platform-ios` 側だけを上げても、CLI 全体の系列が 19 系で揃っているため配下が古いまま残る
- Expo SDK 55 / RN 0.83.2 前提の開発ツール群が 19 系寄りの依存解決を取りやすい
- そのため `platform-android` / `platform-ios` だけを上げる PR は、監査件数の改善に対して効果が薄い

## 現時点の判断

- Expo SDK 55 維持のまま `cli-platform-*` だけを 20 系へ上げるのは見送り
- 先に Expo SDK 56 移行側の整合性を固め、その後で CLI 系をまとめて再評価する
- 再評価時は `@react-native-community/cli`, `cli-platform-*`, `cli-platform-apple`, `fast-xml-parser` をセットで確認する

## 次回の確認観点

1. Expo SDK 56 で生成される依存木に CLI 20 系が自然に乗るか
2. `npx expo run:android` / `npx expo run:ios` のネイティブ生成に差分が出ないか
3. `npm audit` の critical / high がどこまで減るか

## 完了条件

この issue は以下を満たしたら完了とする。

- `20.1.3` 単独更新の効果が薄いことが記録されている
- Expo SDK 移行後に再評価する判断理由が文書化されている
