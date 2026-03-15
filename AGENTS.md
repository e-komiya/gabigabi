# AGENTS.md — convert2gabigabi AI開発ガイド

このファイルはAIエージェント（OpenClaw, Gemini, Copilot等）向けの開発ガイドラインです。
自律的なコード変更・デザイン修正・バグ修正を行う際の指針をまとめています。

---

## 🏗️ プロジェクト構成

```
app/src/
├── data/
│   ├── ffmpeg/           # FFmpegProcessor, FfmpegCompressor, FfmpegConverter
│   └── native/           # RustBridge（フォールバック用）
├── domain/               # UseCase層（ビジネスロジック）
│   ├── useResizeImage.ts   # ガビガビ化
│   ├── useConvertImage.ts  # フォーマット変換
│   └── useDiscordCompress.ts # Discord10MB圧縮
├── screens/
│   └── MainScreen.tsx    # メイン画面（現状ここに全UI）
├── components/           # 再利用コンポーネント
│   ├── ImagePicker.tsx
│   ├── ResizeSlider.tsx
│   └── FileSizeLabel.tsx
└── state/
    └── store.ts          # Zustandストア
```

**基本原則: Clean Architecture**
- ロジックは `domain/`、I/Oは `data/`、UIは `screens/`・`components/` に分離
- `screens/` から直接 `data/` を呼ばない（必ず `domain/` を経由）

---

## 🛠️ 技術スタック

| 項目 | 内容 |
|---|---|
| フレームワーク | React Native 0.83 + Expo SDK 55 |
| 言語 | TypeScript 5.x |
| 画像処理 | FFmpegKit (`ffmpeg-kit-react-native`) |
| 補助処理 | Rust (`rust_core/`) + JNI |
| 状態管理 | Zustand 5.x |
| ファイルシステム | `expo-file-system`（`react-native-fs`は使わない） |
| 画像選択 | `expo-image-picker` |
| メディア保存 | `expo-media-library` |

---

## 📋 コーディング規約

### TypeScript / React Native

- **UIコンポーネントは関数コンポーネント + Hooks**
- **Expo SDKを優先** — `expo-file-system`, `expo-image-picker` 等を使い、bare React Nativeの同等品を避ける
- **新しいネイティブモジュールを追加しない** — 既存のFFmpegKit・expo系・Rustブリッジで対応できるか先に検討
- `react-native-fs` は使わない（`expo-file-system` に統一）
- スタイルは `StyleSheet.create()` を使う
- 変数名は短くても意味が伝わるもの（`img`, `pct` 等OK）
- 三項演算子は可読性が下がる場合は `if` 文を使う

### 状態管理

Zustand ストアは `app/src/state/store.ts` に集約。
新しい状態はここに追加する：

```typescript
// store.tsの典型パターン
interface AppState {
  selectedImage: string | null;
  setSelectedImage: (uri: string | null) => void;
  // ... 追加する場合はここ
}
```

### FFmpeg処理

新しい変換処理を追加する場合：
1. `app/src/data/ffmpeg/` に新ファイル（例: `FfmpegNewProcessor.ts`）を作成
2. `app/src/domain/` に対応するUseCase（例: `useNewFeature.ts`）を作成
3. `screens/MainScreen.tsx` からはUseCaseを経由して呼び出す

---

## 🔨 ビルド手順

### 開発時（コード変更のみ — ネイティブ変更なし）

```bash
cd app
npx react-native start
# → スマホでアプリを開くとホットリロードが効く
```

### ネイティブ変更後（package.json に新パッケージ追加など）

```bash
cd app
npx expo run:android
# → Android実機に再ビルド＆インストール（10〜20分）
```

### EAS Build（配布用APK）

```bash
cd app
eas build --profile preview --platform android
# → 手動実行のみ。CIでは自動実行しない。
```

> ⚠️ **重要**: `.github/workflows` にあるCIは `workflow_dispatch`（手動トリガー）のみ。
> PRやコミットでCIを自動実行するような変更は加えないこと。

---

## 🎨 UIデザイン変更ガイド

現在のUIは `app/src/screens/MainScreen.tsx` に集中している。

### UIを変更する際のルール

1. **既存コンポーネントを活用** — `ImagePicker`, `ResizeSlider`, `FileSizeLabel` を再利用
2. **新しいUI要素はコンポーネント化** — 再利用できるものは `components/` に分離
3. **スタイルは末尾の `StyleSheet.create()` にまとめる**
4. **ダークテーマ対応** — ハードコードの白/黒は避け、変数化を検討

### ビジュアル確認方法

UIの変更は **EAS Build + 実機確認** が確実だが、軽微な変更は以下でも確認可能：

```bash
# Metroサーバー起動 + Wi-Fi接続済みスマホでホットリロード
cd app && npx react-native start
```

---

## 🐛 よくある落とし穴

| 落とし穴 | 対処法 |
|---|---|
| `react-native-fs` インポートエラー | `expo-file-system` に置き換える |
| 画像URIが `content://` 形式で FFmpeg が処理できない | `expo-file-system` でキャッシュディレクトリにコピーしてから渡す |
| `expo-image-picker` が権限エラー | `requestMediaLibraryPermissionsAsync()` を事前に呼ぶ |
| 新パッケージ追加後にアプリが起動しない | `npx expo run:android` で再ビルド必要 |
| FFmpegのコマンドが通らない | `FFmpegKit.executeAsync` の戻り値でreturnCodeを確認 |

---

## 📝 変更時のチェックリスト

- [ ] `domain/` → `data/` の依存方向になっているか（逆は NG）
- [ ] `expo-file-system` を使っているか（`react-native-fs` ではなく）
- [ ] 新しいネイティブパッケージを追加した場合、ドキュメントに記載したか
- [ ] `docs/tasklist.md` に変更を反映したか
- [ ] コミットメッセージに `fix:`, `feat:`, `docs:`, `chore:` 等のプレフィックスをつけたか

---

## 📂 参考ドキュメント

- [`docs/local-dev-android.md`](docs/local-dev-android.md) — Android開発環境セットアップ
- [`docs/architecture.md`](docs/architecture.md) — 設計思想・構成概要
- [`docs/stack.md`](docs/stack.md) — 技術スタック詳細
- [`docs/ffmpeg_license.md`](docs/ffmpeg_license.md) — FFmpegライセンス情報
- [`GEMINI.md`](GEMINI.md) — 追加の開発ルール（コーディング規約・環境設定等）
