# convert2gabigabi

画像・動画の変換・圧縮・ガビガビ化ツール（React Native / Expo）

---

## アプリ概要

**convert2gabigabi** は Android / iOS 向けのメディア変換アプリです。

- 🎨 **ガビガビ化**: 画像・動画をモザイク（ブロック）エフェクトで劣化させる
- 🗜️ **指定サイズ圧縮**: 目標ファイルサイズに収まるよう自動で圧縮
- 🔄 **フォーマット変換**: 画像・動画のフォーマット変換（JPEG, PNG, WebP, MP4, MOV など）
- 📋 **変換履歴**: 過去の変換結果を一覧表示・個別削除・全削除

---

## セットアップ

### 必要な環境

- Node.js 18 以上
- React Native 開発環境（[Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) 参照）
- Android Studio（Android ビルド時）または Xcode（iOS ビルド時）

### インストール

```sh
git clone https://github.com/e-komiya/gabigabi.git
cd gabigabi/app
npm install
```

---

## 実行方法

### Metro 起動

```sh
npm start
```

### Android

```sh
npm run android
```

### iOS

```sh
npm run ios
```

---

## 主な機能

| 機能 | 説明 |
|------|------|
| ガビガビ化 | 画像・動画をブロックノイズで劣化 |
| 指定サイズ圧縮 | 目標バイト数に合わせて自動圧縮 |
| フォーマット変換 | 画像・動画の形式変換 |
| 変換履歴 | 変換結果の閲覧・削除・フィルタリング |
| 多言語対応 | 日本語・英語 |

---

## ライセンス

[GNU General Public License v3.0](../LICENSE)
