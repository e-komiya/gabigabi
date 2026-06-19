# Expo config-plugins / xcode / uuid upstream 追跡メモ (2026-06)

最終更新: 2026-06-19 (Asia/Tokyo)
対象 issue: #302

## 背景

2026-06-19 時点で `npm audit --omit=dev` に残る moderate 11 件は、ほぼ `@expo/config-plugins -> xcode -> uuid` の連鎖に集中しています。
このメモでは、アプリ側で先に進められる更新経路があるかと、どこから upstream 更新を待つべきかを整理します。

## 依存関係の確認

現在の主要バージョン:

- `expo@56.0.12`
- `expo-sharing@56.0.18`
- `@expo/config-plugins@56.0.9`
- `xcode@3.0.1`
- `uuid@7.0.3` (`xcode` 配下)

`npm view` で確認した依存関係:

- `expo@56.0.12` -> `@expo/config-plugins: ~56.0.9`
- `expo-sharing@56.0.18` -> `@expo/config-plugins: ^56.0.9`
- `@expo/config-plugins@56.0.9` -> `xcode: ^3.0.1`
- `xcode@3.0.1` -> `uuid: ^7.0.3`

## 更新余地の確認

2026-06-19 時点の npm 公開最新版を確認すると、次の通りでした。

- `expo`: `56.0.12` が最新
- `expo-sharing`: `56.0.18` が最新
- `@expo/config-plugins`: `56.0.9` が最新
- `xcode`: `3.0.1` が最新

つまり、アプリ側の package.json を触っても、同一系統の新しい upstream を取り込みに行ける状態ではありません。
`uuid` 自体には新しい版がありますが、直接依存ではなく `xcode` 配下なので、アプリ側から安全に差し替える根拠は薄いです。

## 判断

- Expo 56 系の公開最新版を使っていても `config-plugins -> xcode -> uuid` 連鎖は残る
- 現時点では Expo 本体、`expo-sharing`、`@expo/config-plugins`、`xcode` のいずれかが upstream で更新されるのを待つ色合いが強い
- アプリ側 override で `uuid` だけを先行差し替えるより、Expo 側が取り込む正式更新を待つ方が安全

## 待機条件

次のいずれかを観測したら再着手する。

1. `expo` または `expo-sharing` の更新で `@expo/config-plugins` の参照先が上がる
2. `@expo/config-plugins` の更新で `xcode` の参照先が上がる
3. `xcode` 側で `uuid` の更新が出る

## 結論

2026-06-19 時点では、この残件はアプリ側で今すぐ解消するより upstream 追従待ちとして明文化しておくのが妥当です。
今後は Expo 関連パッケージの更新が出たタイミングで再確認します。
