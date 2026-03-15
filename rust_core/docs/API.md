# convert2gabigabi Rust Core - API仕様書

## 公開API

### 関数一覧

#### `resize_gabigabi`

**シグネチャ**:
```rust
pub fn resize_gabigabi(data: &[u8], scale_pct: f32, gabigabi_level: u8) -> anyhow::Result<Vec<u8>>
```

**説明**:  
画像データを指定されたスケールとガビガビレベルで変換する。

**パラメータ**:
- `data: &[u8]` - 入力画像データ（JPEG/PNG形式のバイト列）
- `scale_pct: f32` - 縮小率（パーセント）。範囲: (0.0, 100.0]
- `gabigabi_level: u8` - ガビガビレベル。範囲: [1, 5]

**戻り値**:
- `Ok(Vec<u8>)` - 変換されたJPEG画像データ
- `Err(anyhow::Error)` - エラー時

**エラーケース**:
- `scale_pct`が範囲外の場合
- `gabigabi_level`が範囲外の場合  
- 入力データが無効な画像形式の場合
- メモリ不足の場合

**使用例**:
```rust
let input_data = std::fs::read("input.jpg")?;
let output_data = resize_gabigabi(&input_data, 75.0, 3)?;
std::fs::write("output_gabigabi.jpg", output_data)?;
```

---

#### `resize` (レガシー関数)

**シグネチャ**:
```rust
pub fn resize(data: &[u8], scale_pct: f32) -> anyhow::Result<Vec<u8>>
```

**説明**:  
画像データをガビガビレベル2（普通）で変換する。`resize_gabigabi`の簡易版。

**パラメータ**:
- `data: &[u8]` - 入力画像データ
- `scale_pct: f32` - 縮小率（パーセント）

**戻り値**:  
`resize_gabigabi(data, scale_pct, 2)`と同等

---

### FFI (Foreign Function Interface) API

Android JNI や他言語バインディング用の C 互換関数。

#### `rust_resize`

**シグネチャ**:
```rust
#[no_mangle]
pub extern "C" fn rust_resize(
    data_ptr: *const u8,
    data_len: usize,
    scale_pct: f32,
    output_len: *mut usize
) -> *mut u8
```

**説明**:  
C言語から呼び出し可能な画像リサイズ関数。

**パラメータ**:
- `data_ptr: *const u8` - 入力画像データのポインタ
- `data_len: usize` - 入力データサイズ
- `scale_pct: f32` - 縮小率
- `output_len: *mut usize` - 出力データサイズ格納先

**戻り値**:
- 成功時: 出力画像データのポインタ（要`rust_free_buffer`で解放）
- 失敗時: `null`

**注意**:
- 戻り値のポインタは必ず`rust_free_buffer`で解放すること
- C側でのメモリ管理が必要

---

#### `rust_free_buffer`

**シグネチャ**:
```rust
#[no_mangle]
pub extern "C" fn rust_free_buffer(ptr: *mut u8, len: usize)
```

**説明**:  
`rust_resize`で確保されたメモリを解放する。

**パラメータ**:
- `ptr: *mut u8` - 解放するメモリのポインタ
- `len: usize` - メモリサイズ

**注意**:
- `rust_resize`で取得したポインタのみ解放可能
- 二重解放禁止

---

## CLI仕様

### コマンド形式
```bash
gabigabi <INPUT_FILE> [OPTIONS]
```

### オプション詳細
- `<INPUT_FILE>`: 入力画像ファイル（必須・位置引数）
- `-r, --resize <RESIZE_PERCENT>`: リサイズ率（オプション・1-100・デフォルト100.0）
- `-g, --gabi <GABIGABI_LEVEL>`: ガビガビレベル（オプション・1-5・デフォルト2）
- `-o, --output <OUTPUT_FILE>`: 出力ファイルパス（オプション・省略時は自動生成）
- `-h, --help`: ヘルプ表示
- `-V, --version`: バージョン表示

### 使用例
```bash
# 最もシンプルな使用（全デフォルト）
gabigabi input.jpg

# ガビガビレベルのみ指定
gabigabi input.png -g 5

# リサイズ率とレベル指定
gabigabi input.jpg -r 50 -g 3

# 出力ファイルパス指定
gabigabi input.png -o custom_gabigabi.jpg

# 全オプション指定
gabigabi input.jpg -r 30 -g 4 -o /path/to/output.jpg

# オプション順序自由
gabigabi -g 4 -o result.jpg -r 75 image.jpeg
```

---

## ガビガビレベル仕様

| レベル | JPEG品質 | 色量子化係数 | フィルタ | 効果 |
|--------|----------|-------------|----------|------|
| 1 | 40 | 16 | Triangle | 軽微な圧縮 |
| 2 | 20 | 32 | Lanczos3 | 標準的な圧縮 |
| 3 | 10 | 64 | Nearest | 重い圧縮 + ピクセル感 |
| 4 | 5 | 85 | Nearest | 極重圧縮 + 強いピクセル感 |
| 5 | 1 | 128 | Nearest | 破壊的圧縮 + 最大ピクセル感 |

## サポート画像形式

### 入力形式
- **JPEG** (.jpg, .jpeg)
  - ベースライン、プログレッシブ対応
  - EXIF情報は保持されない
- **PNG** (.png)
  - RGB、RGBA対応
  - 透過情報は削除（JPEG変換のため）

### 出力形式
- **JPEG のみ**
  - 最大圧縮効率のため統一
  - RGB色空間
  - ベースラインエンコード

## パフォーマンス特性

### 時間計算量
- **O(W × H)**: 画像の幅×高さに比例
- 色量子化: O(W × H)
- JPEG圧縮: O(W × H × log(W × H))（近似）

### 空間計算量
- **入力バッファ**: 入力画像サイズ
- **デコードバッファ**: W × H × 3 bytes (RGB)
- **出力バッファ**: 通常、入力サイズの10-50%

### 推奨使用範囲
- 画像サイズ: 最大 50MP (8000×6000)
- メモリ: 最小 1GB RAM
- 処理時間: 1MP画像で約100ms（リリースビルド）

## エラー型定義

### `anyhow::Error`を使用

一般的なエラーメッセージ:
- `"scale_pct must be within (0,100]"` - スケール範囲エラー
- `"gabigabi_level must be 1-5"` - レベル範囲エラー
- `"Unsupported image format"` - 画像形式エラー
- JPEG/PNG デコードエラー（詳細はimageクレート依存）

### CLI固有エラー
- `"リサイズ率は 0-100 の範囲で指定してください"` - CLI引数エラー
- `"ガビガビレベルは 1-5 の範囲で指定してください"` - CLI引数エラー
- `"入力ファイルが読み込めません"` - ファイルI/Oエラー

## ビルド要件

### Rust バージョン
- **最小**: Rust 1.70.0
- **推奨**: 最新安定版

### 依存クレート
```toml
[dependencies]
image = { version = "0.25", features = ["png", "jpeg"] }
jpeg-encoder = "0.6"
anyhow = "1"
rayon = "1.10"
clap = { version = "4.0", features = ["derive"] }

[target.'cfg(target_os = "android")'.dependencies]
jni = "0.21"
```

### コンパイラフラグ（推奨）
```bash
# リリースビルド最適化
cargo build --release

# ターゲット指定（Android）
cargo build --target aarch64-linux-android --release

# CLIのみビルド
cargo build --bin gabigabi --release
```

## スレッドセーフティ

- **すべての公開関数はスレッドセーフ**
- 内部で可変状態を持たない
- 並列実行可能（異なる画像データに対して）

## メモリ安全性

- **`#![forbid(unsafe_code)]`** を設定（FFI部分除く）
- FFI関数のみ`unsafe`ブロック使用
- メモリリークなし（自動テストで検証）

## 設定・環境変数

### 環境変数
- `RUST_LOG`: ログレベル設定（`debug`, `info`, `warn`, `error`）

### CLI設定例
```bash
# デバッグログ有効化
RUST_LOG=debug gabigabi input.jpg -r 50 -g 3

# エラーログのみ
RUST_LOG=error gabigabi input.jpg -r 50
``` 