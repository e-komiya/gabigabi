# convert2gabigabi

画像を「ガビガビ」に劣化させる Android アプリ — React Native + Expo + Rust

| 機能 | 説明 |
|---|---|
| ガビガビ化 | 指定した縮小率とガビガビレベルで画像を低解像度に変換 |
| フォーマット変換 | JPEG / PNG / WebP への変換 + 品質指定 |
| Discord圧縮 | ファイルを10MB以下に自動圧縮 |
| 保存 / 共有 | 変換後の画像をギャラリー保存またはシェア |

---

## セットアップ・ビルド

初回ビルドや Android 実機での開発手順は [`docs/local-dev-android.md`](docs/local-dev-android.md) を参照してください。

### クイックスタート

```bash
# 1. リポジトリクローン
git clone https://github.com/eisei-komiya/convert2gabigabi.git
cd convert2gabigabi/app

# 2. 依存インストール
npm install

# 3. Android実機へビルド＆インストール（初回）
npx expo run:android

# 4. 2回目以降は開発サーバーだけ起動
npx react-native start
```

> このアプリは `expo-dev-client` を使っているため **Expo Goでは動作しません**。
> 必ず `npx expo run:android` でカスタム dev client をビルドしてください。

### EAS Build（実機配布用）

```bash
cd app
eas build --profile preview --platform android
```

> CI は手動トリガー (`workflow_dispatch`) のみ。PR や push では自動実行されません。

---

## プロジェクト構成

```
convert2gabigabi/
├── app/                          # React Native / Expo アプリ
│   ├── src/
│   │   ├── data/
│   │   │   ├── ffmpeg/           # FFmpegProcessor（主エンジン）
│   │   │   └── native/           # RustBridge（フォールバック）
│   │   ├── domain/               # UseCases
│   │   │   ├── useResizeImage.ts   # ガビガビ化
│   │   │   ├── useConvertImage.ts  # フォーマット変換
│   │   │   └── useDiscordCompress.ts # Discord用圧縮
│   │   ├── screens/              # 画面
│   │   │   └── MainScreen.tsx
│   │   ├── components/           # 再利用コンポーネント
│   │   │   ├── ImagePicker.tsx
│   │   │   ├── ResizeSlider.tsx
│   │   │   └── FileSizeLabel.tsx
│   │   └── state/                # Zustand ストア
│   └── package.json
├── rust_core/                    # Rust 画像処理ライブラリ（色量子化等）
│   ├── src/
│   └── Cargo.toml
├── docs/
│   ├── local-dev-android.md      # Android開発環境セットアップ
│   ├── architecture.md           # 設計思想
│   ├── stack.md                  # 技術スタック詳細
│   └── ffmpeg_license.md         # FFmpegライセンス情報
└── GEMINI.md                     # AIエージェント向け開発ルール
```

---

## アーキテクチャ

**Clean Architecture** を採用:

```
UI (screens / components)
         ↓
   domain / UseCase       ← 処理エンジン選択ロジック
    /          \
data/ffmpeg    data/native
(FFmpegKit)   (RustBridge)
```

- **FFmpegKit** が主エンジン。`scale` フィルタ + `-q:v` でリサイズ＆ガビガビ化。
- **Rust コア** は FFmpeg で対応しにくい色量子化等の補助エンジン（フォールバック）。
- UseCase 層がエンジン選択を隠蔽し、UI は単純な Promise API を呼ぶだけ。

詳細は [`docs/architecture.md`](docs/architecture.md) 参照。

---

## 技術スタック

| カテゴリ | 採用技術 |
|---|---|
| UI フレームワーク | React Native 0.83 + Expo SDK 55 |
| 言語 | TypeScript 5.x |
| 画像処理 | FFmpegKit (`ffmpeg-kit-react-native`) |
| 補助処理 | Rust (`image` crate) + JNI ブリッジ |
| 状態管理 | Zustand |
| ナビゲーション | React Navigation 7 |
| ファイルシステム | expo-file-system |
| メディア | expo-image-picker, expo-media-library |

---

## 開発参加

コードベースの詳細・開発ルールは [`GEMINI.md`](GEMINI.md) を参照してください。
