# Google Play申請アセット準備ガイド（Issue #17）

Google Play Console 申請時に必要なアセットを、リポジトリ上で管理しやすい形で整理する。

## 保存先

```
app/assets/store-listing/
  icon-512.png
  feature-graphic-1024x500.png
  screenshots/
    phone-ja-01.png
    phone-ja-02.png
    phone-en-01.png
    phone-en-02.png
```

- 実ファイルは上記配置を推奨（ファイル名は用途が分かる命名にする）
- スクリーンショットは最低2枚、推奨8枚以上

## 必須アセットの要件

- ストアアイコン: 512x512 PNG
- フィーチャーグラフィック: 1024x500 PNG/JPG
- スクリーンショット: 最低2枚（スマホ）
- 短い説明: 80文字以内
- 詳細説明: 4000文字以内
- カテゴリ: ツール

## 説明文テンプレート（日本語）

### 短い説明（80字以内）

画像と動画を手軽に圧縮・劣化。SNS投稿向けに容量をすばやく調整できます。

### 詳細説明（4000字以内）

gabigabi は、画像・動画の容量を手軽に小さくできる圧縮アプリです。

- 画像の圧縮・リサイズ・形式変換（JPEG / PNG / WebP など）
- 動画の圧縮（ビットレート・解像度の調整）
- SNS投稿向けの容量調整（例: Discord向け）
- 直感的なUIで、スマホだけで完結

「すぐ軽くしたい」「画質を調整したい」といった用途に向けて、最短手順で変換できる体験を目指しています。

## 説明文テンプレート（英語）

### Short description (<= 80 chars)

Compress photos and videos quickly for social media uploads.

### Full description (<= 4000 chars)

gabigabi is a lightweight app to reduce image and video file sizes.

- Image compression, resize, and format conversion (JPEG / PNG / WebP)
- Video compression with bitrate and resolution tuning
- Presets for social sharing workflows (e.g. Discord uploads)
- Fast and simple UI designed for one-handed mobile use

It helps you quickly prepare media for sharing when file size limits get in the way.

## 進捗チェック

- [x] ストアアイコン（512x512）
- [ ] フィーチャーグラフィック（1024x500）
- [ ] スクリーンショット（最低2枚）
- [x] 説明文テンプレート（短い説明 / 詳細説明）
- [x] カテゴリ（ツール）

## 次にやること

1. 実機スクリーンショットを取得して `app/assets/store-listing/screenshots/` に追加
2. フィーチャーグラフィックを作成して保存
3. Play Console のストア掲載情報へ転記
