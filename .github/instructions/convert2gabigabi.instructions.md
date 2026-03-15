---
applyTo: '**'
---

# convert2gabigabi 開発ルール

## 基本方針
- **クロスプラットフォーム最優先**  
  React Native で UI/ロジックを共有し、Android 固有 API への直接依存を避ける。
- **コア処理は Rust**  
  画像縮小・圧縮など計算ヘビー処理は Rust に集約し、Native Module (JNI/Obj-C) 経由で呼び出す。
- **Clean Architecture**  
  `presentation` (React UI)、`domain` (TS UseCase)、`data` (Native Bridge) を分離。
- **デザイン**  
  白基調 + Material 3 指針。ダウンロードボタン・コピー(クリップボード)ボタン必須。
- **画像変換仕様**  
  - 入力: JPEG/PNG、端末ファイル or クリップボード
  - 変換比率: **倍率 (%) 指定のみ**、アスペクト比維持
  - 出力ファイル名: `<元名>_gabigabi.<拡張子>`
  - メタデータ: 回転 EXIF・カラー情報保持

## コーディング規約 (TypeScript/React Native)
- 変数名は出来る限り短くても意味が伝わる範囲で良い (`img`, `pct` 等)
- 三項演算子は可読性が下がる場合は避け、`if` 文を使用。
- Hooks ベースで状態管理 (`zustand` or `useState`)
- OS 依存分岐は Platform API に限定し、ネイティブコードに押し込める。

## コーディング規約 (Rust)
- `#![forbid(unsafe_code)]` を基本。パフォーマンス重視箇所のみ `unsafe` 記載し理由を書く。
- C 互換シグネチャでバイト列とスカラー値のみやり取り。

## ドキュメント／タスク管理
- **tasklist.md** を常に最新化し、
  - 現在作業中 / 完了 / 残タスク を明示。
- **stack.md / architecture.md** は技術・設計変更が発生した都度更新。
- 主要変更のコミットメッセージは日本語 + プレフィックス `[feat]`, `[fix]` 等。

## テスト
- Rust: `cargo test` (アルゴリズム)
- JS/TS: Jest + React Native Testing Library

## CI/CD
- GitHub Actions で
  - Rust ライブラリ (android-aarch64, ios-aarch64) ビルド
  - React Native JS Lint/Test
  - Android APK 自動ビルド

## 依存管理
- JS: Yarn v3 plug'n'play
- Rust: cargo
- Dependabot で依存監視

## 環境設定
おこなった環境設定はenv.logに記録として残しておいてください。(別PCで行えるようにするため。)
のちのちdockerでできるようにします。

## 注意事項
ターミナルは自動でwslになるようにしています。
パスの記法がunixと違うので、注意してください。
今自分がどこにいるかわからなくなったら、気軽にpwdを打ってください。


