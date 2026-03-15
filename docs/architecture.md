# 設計思想

## 目標
1. Android 発 → iOS 展開を容易にする。
2. 高速・メモリ安全な画像縮小を実現。
3. UI／ロジック分離で保守性を高める。

## 構成概要 (改訂)
```
+-----------------------------+
| React Native (TypeScript)  |
|    Presentation (UI)       |
+-----------▲----------------+
             | domain/useResizeImage.ts (UseCase)
+-----------+------------------+
|  data/ffmpeg/FfmpegProcessor |  ← 主エンジン: FFmpegKit
|  data/native/RustBridge      |  ← 補助: Rustネイティブモジュール
+------------------------------+
             |
+-----------------------------+
|   Rust Core (image crate)  |  ← 既存コード維持（色量子化等）
|  縮小・再圧縮              |
+-----------------------------+
```
- JS 側は `domain/useResizeImage` UseCase 経由で処理エンジンを選択。
- FFmpegKit を優先使用。失敗時は Rust ネイティブモジュールへフォールバック。
- Android は JNI、iOS は C-ABI/Obj-C で Rust に接続。
- UI からは単純な Promise (`resizeImage(uri, pct)`) を返す API に集約。

## キーポイント
- FFmpegKit を主エンジンとして使い、`scale` フィルタ + `-q:v` でリサイズ＆ガビガビ圧縮を実現。
- Rust コアは既存コードを維持したまま、FFmpegで対応しにくい色量子化等の補助エンジンとして使用。
- Rust 側関数は `fn resize(data: &[u8], scale: f32) -> Vec<u8>` のように **バイト列のみを受け渡し**。UI 実装と完全分離。
- React Native Native Module ⇔ Rust は [jni-rs] / C-ABI で薄いブリッジ。Swift でも同じ DLL を呼べる。
- 画像の読み込み・表示はプラットフォーム側 (Glide/ImageDecoder) に任せ、重い計算だけ FFmpeg/Rust に委譲。
- Clean Architecture を採用し、`domain` が処理エンジン選択ロジックを持ち、`data` 層が具体実装を担当。

## メリット
- **再利用性**: Rust Core は Android/iOS/デスクトップ/WebAssembly に横展開可。
- **安全性**: C/C++ よりメモリバグ発生率が低い。
- **性能**: NEON/SIMD 有効化で純 Kotlin より高速。

## 今後の拡張
- iOS 追加時は Swift Package Manager で Rust ライブラリを組み込み、SwiftUI 画面を実装。
- 高解像度化 (Super-resolution) など高度アルゴリズムを Rust に追加し、共通利用。

## 残タスク・質問
- 解像度指定を **倍率 (%)** と **長辺(px)** どちらで設定するか。
- 変換後ファイルの保存先と命名規則。
- 画面テーマ (Material 3 Light/Dark) の方針。
- iOS 対応タイムラインと優先度。 