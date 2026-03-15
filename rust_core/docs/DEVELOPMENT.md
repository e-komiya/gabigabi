# convert2gabigabi Rust Core - 開発ドキュメント

## アーキテクチャ概要

```
rust_core/
├── src/
│   ├── lib.rs          # メインライブラリ（ガビガビ処理コア）
│   └── bin/
│       └── main.rs     # CLIアプリケーション
├── tests/
│   ├── integration_tests.rs  # 統合テスト
│   └── sample.png      # テスト用画像
├── docs/               # ドキュメント
├── Cargo.toml         # 依存関係・プロジェクト設定
└── build.rs           # ビルドスクリプト（Android用）
```

## ファイル詳細

### `src/lib.rs` - メインライブラリ

**役割**: ガビガビ画像生成のコア処理を担当

**主要関数**:

#### `resize_gabigabi(data: &[u8], scale_pct: f32, gabigabi_level: u8)`
- **目的**: 画像をガビガビ化するメイン関数
- **入力**: 
  - `data`: 元画像のバイト列（JPEG/PNG）
  - `scale_pct`: 縮小率（1.0-100.0）
  - `gabigabi_level`: ガビガビレベル（1-5）
- **出力**: ガビガビ化されたJPEGバイト列
- **処理フロー**:
  1. 入力検証（スケール・レベル範囲チェック）
  2. 画像デコード（`image`クレート使用）
  3. サイズ計算（アスペクト比維持）
  4. リサイズフィルタ選択（レベル別）
  5. 色量子化適用
  6. JPEG品質エンコード

#### `apply_color_quantization_level(img: RgbImage, level: u8)`
- **目的**: レベル別の色数削減処理
- **アルゴリズム**: RGB各チャンネルを指定段階数に量子化
- **量子化係数**:
  - Lv1: 16 (16段階/ch)
  - Lv2: 32 (8段階/ch)  
  - Lv3: 64 (4段階/ch)
  - Lv4: 85 (3段階/ch)
  - Lv5: 128 (2段階/ch)

#### `encode_gabigabi_jpeg_quality(img: &RgbImage, output: &mut Vec<u8>, quality: u8)`
- **目的**: 指定品質でJPEGエンコード
- **使用ライブラリ**: `jpeg-encoder`
- **品質マッピング**:
  - Lv1: 品質40（軽微）
  - Lv2: 品質20（普通）
  - Lv3: 品質10（重め）
  - Lv4: 品質5（極重）
  - Lv5: 品質1（破壊）

#### FFI関数（Android JNI用）
- `rust_resize()`: C互換のリサイズ関数
- `rust_free_buffer()`: メモリ解放関数

### `src/bin/main.rs` - CLI アプリケーション

**役割**: ユーザー向けコマンドラインインターフェース

**アーキテクチャ変更**: 
- `clap` クレート使用による引数解析
- 構造体ベースの設定管理
- 自動ヘルプ生成

**CLI構造**:
```rust
#[derive(Parser)]
struct Args {
    input_file: String,                    // 入力ファイル（位置引数）
    #[arg(short = 'r', long = "resize", default_value = "100.0")]   // -r, --resize
    resize_percent: f32,
    #[arg(short = 'g', long = "gabi", default_value = "2")]  // -g, --gabi
    gabigabi_level: u8,
    #[arg(short = 'o', long = "output")]   // -o, --output
    output_file: Option<String>,
}
```

**主要機能**:
- **引数解析**: `clap::Parser` による型安全な解析
- **デフォルト値**: リサイズ率100%、ガビガビレベル2
- **入力検証**: リサイズ率・ガビガビレベルの範囲チェック
- **ファイル入出力**: エラーハンドリング付きI/O処理  
- **出力パス制御**: カスタムパス指定または自動生成
- **進捗表示**: 日本語での分かりやすい表示
- **結果レポート**: ファイルサイズ・圧縮率の詳細表示

**コマンド仕様**:
```bash
gabigabi <INPUT_FILE> [OPTIONS]
```

**オプション詳細**:
- `-r, --resize <RESIZE_PERCENT>`: リサイズ率（デフォルト100.0）
- `-g, --gabi <GABIGABI_LEVEL>`: ガビガビレベル（デフォルト2）
- `-o, --output <OUTPUT_FILE>`: 出力ファイルパス（オプション）

**処理フロー**:
1. `clap`による引数解析・検証（デフォルト値適用）
2. 入力画像読み込み
3. `resize_gabigabi()`呼び出し
4. 出力ファイル名生成（カスタムパスまたは自動生成）
5. ファイル保存
6. 結果表示（サイズ・圧縮率）

### `tests/integration_tests.rs` - 統合テスト

**役割**: 全体機能の自動テスト

**テストケース**:
- 基本的なリサイズ機能
- 全ガビガビレベル（1-5）の動作確認
- エラーケース（不正なスケール・レベル）
- ファイルI/O操作
- 圧縮率検証

### `Cargo.toml` - プロジェクト設定

**主要依存関係**:
- `image = "0.25"`: 画像処理（JPEG/PNG対応）
- `jpeg-encoder = "0.6"`: 高品質制御JPEG圧縮
- `rayon = "1.10"`: 並列処理（将来的な最適化用）
- `anyhow = "1"`: エラーハンドリング
- `clap = "4.0"`: コマンドライン引数解析

**ビルド設定**:
- Android JNI対応（`jni`依存）
- バイナリターゲット指定
- `clap`の`derive`機能有効化

### `build.rs` - ビルドスクリプト

**役割**: Android向けネイティブライブラリビルド

## ガビガビ化アルゴリズム詳細

### 1. リサイズフィルタ選択

```rust
let filter = match gabigabi_level {
    1 => FilterType::Triangle,    // 滑らか
    2 => FilterType::Lanczos3,    // 高品質
    3..=5 => FilterType::Nearest, // ピクセル感強調
};
```

**理由**: レベル3以上では意図的に粗いフィルタを使用してピクセル感を演出

### 2. 色量子化処理

```rust
pixel[0] = (pixel[0] / quantization_factor) * quantization_factor;
```

**効果**: 
- 色数を段階的に削減
- ポスタライゼーション効果でレトロ感演出
- ファイルサイズ削減に寄与

### 3. JPEG品質制御

低品質エンコードによる効果：
- **ブロックノイズ**: 8x8ピクセルブロック境界の視認
- **色滲み**: クロマサブサンプリングによる色情報劣化
- **高周波成分削除**: 細かいディテールの除去

## パフォーマンス考慮点

### メモリ使用量
- 入力画像: 最大50MB想定
- 中間バッファ: RGB展開時に約3倍メモリ使用
- 出力バッファ: 通常は入力の10-50%

### 処理速度
- 1MP画像: 約50-100ms（デバッグビルド）
- 10MP画像: 約500ms-1秒
- ボトルネック: JPEG圧縮処理

### 最適化余地
- Rayon使用の並列色量子化
- SIMD命令活用
- メモリプール使用

## エラーハンドリング戦略

### CLI引数検証（`clap`レベル）
- 必須引数の存在チェック
- 型変換エラー（数値以外の入力）
- 自動ヘルプ・バージョン表示

### アプリケーションレベル検証
- リサイズ率範囲: `(0, 100]`
- ガビガビレベル範囲: `[1, 5]`
- ファイル存在・読み取り権限

### ランタイムエラー
- メモリ不足: `anyhow!`でラップしてエラー伝播
- ファイルI/O: 詳細なエラーメッセージ付与
- 画像デコード失敗: フォーマット判定エラー

## 今後の拡張計画

### 機能拡張
- WebP対応
- アニメーションGIF対応
- バッチ処理機能（`-i`オプション）
- プレビュー機能（`--preview`）
- 設定ファイル対応（`--config`）

### CLI機能強化
- 進捗バー表示（`indicatif`クレート）
- 詳細ログ出力（`--verbose`）
- 出力ディレクトリ指定（`-o`）
- 並列処理（`--jobs`）

### パフォーマンス改善
- GPU加速（wgpu使用）
- ストリーミング処理
- プログレッシブJPEG対応

### アーキテクチャ改善
- プラグインシステム
- カスタムフィルタ追加
- API仕様の拡張

## デバッグ・プロファイリング

### ログ出力
```bash
RUST_LOG=debug cargo run --bin gabigabi -- input.jpg -r 50 -g 3
```

### プロファイリング
```bash
cargo install flamegraph
sudo cargo flamegraph --bin gabigabi -- input.jpg -r 50 -g 3
```

### ベンチマーク
```bash
cargo bench
```

### CLIテスト
```bash
# ヘルプ表示
cargo run --bin gabigabi -- --help

# バージョン表示  
cargo run --bin gabigabi -- --version

# 基本テスト（全デフォルト）
cargo run --bin gabigabi -- input.jpg

# オプション個別テスト
cargo run --bin gabigabi -- input.jpg -g 5
cargo run --bin gabigabi -- input.jpg -r 50
cargo run --bin gabigabi -- input.jpg -o custom.jpg

# 複合オプションテスト
cargo run --bin gabigabi -- input.jpg -r 30 -g 4 -o result.jpg

# エラーケーステスト
cargo run --bin gabigabi -- nonexistent.jpg
cargo run --bin gabigabi -- input.jpg -r 150  # 範囲外
cargo run --bin gabigabi -- input.jpg -g 10   # 範囲外
```

## コントリビューション・ガイドライン

1. **コードスタイル**: `rustfmt`準拠
2. **テスト**: 新機能には必ずテスト追加
3. **ドキュメント**: 公開関数にはdocstring必須
4. **パフォーマンス**: ベンチマーク結果の劣化禁止
5. **エラーハンドリング**: `panic!`使用禁止、適切なエラー型返却
6. **CLI変更**: ヘルプメッセージとドキュメントの同期更新 