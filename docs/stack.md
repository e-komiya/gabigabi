# 技術スタック

## 目的
端末内およびクリップボードの JPEG/PNG 画像を、ユーザーが指定した縮小率で低解像度へ変換する Android アプリ。

## 言語
- **TypeScript 5.x + React Native 0.73**  
  型安全な JS 環境。クロスプラットフォーム UI を実装。

## UI
- **React Native + React Navigation 7 + Material 3 Design**  
  宣言的 UI。Expo Vector Icons でシンプルな白基調デザイン。

## 画像処理
- **FFmpegKit (`ffmpeg-kit-react-native`)**  
  主要な画像縮小・JPEG再圧縮エンジン。LGPL ビルドの .so を APK に同梱して完全オフライン動作。
  `scale` フィルタでリサイズ、`-q:v` で圧縮品質を調整してガビガビ化を実現。
- **Rust (image + jpeg-encoder)**  
  FFmpegで対応しきれない高精度な色量子化・ポスタリゼーション処理に使用。
  既存コードを維持し、必要な場合に JNI/C-ABI 経由で呼び出す。
- **android.graphics.Bitmap API**  
  変換前後の Bitmap 生成とプレビュー表示用途のみ。
- **Glide 4.x**  
  読み込み・キャッシュ・EXIF 自動回転を担当。

## 主要ライブラリ／ツール
- **react-native-fs**：ファイルシステムアクセス
- **ffmpeg-kit-react-native**：FFmpeg経由の画像処理（リサイズ・圧縮）
- **@react-native-clipboard/clipboard**：クリップボード操作
- **react-native-image-resizer**：ネイティブ→Rust ブリッジ参考実装
- **react-navigation**：画面遷移
- **zustand**：状態管理 (軽量)
- **MMKV**：設定保存（倍率プリセット）
- **JNI-rs / jni-android-sys**：RN NativeModule から Rust へ橋渡し
- **cbindgen / cargo-ndk**：Rust ライブラリのビルド支援

## ビルド
- **Yarn (npm) + Gradle (Android), Xcode (iOS)**
- EAS Build / GitHub Actions で CI

## テスト
- **JUnit 5**（ユニット）
- **Espresso**（UI）

## 最低対応 API
- **API 24 (Android 7.0)**  
  Compose/Glide が API21 以上を要求。Clipboard 画像 URI も API16+ で動作。

## 拡張余地
- ML Kit Super-resolution 等との併用で高解像度化も実装可
- 将来的に Flutter/Kotlin Multiplatform へ移行して多平台対応も検討可 