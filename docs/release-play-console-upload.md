# Google Play Console 登録・AABアップロード手順（Issue #14）

本ドキュメントは `e-komiya/gabigabi` の Android アプリを Google Play Console に登録し、初回リリースの内部テスト提出までを確実に進めるための運用手順です。

## 事前準備

- Google Play Developer アカウント登録済み
- AAB 生成済み（例: `app/android/app/build/outputs/bundle/release/app-release.aab`）
- パッケージID: `com.convert2gabigabi`
- プライバシーポリシーURL:
  `https://eisei-komiya.github.io/convert2gabigabi/privacy-policy.html`

## Play Console 作業手順

1. Play Console で「アプリを作成」
2. 下記の値で初期設定
   - アプリ名: `GabiGabi - 画像・動画ガビガビ化&指定サイズ圧縮 -`
   - デフォルト言語: 日本語
   - 種別: アプリ
   - 料金: 無料
3. 「テストとリリース」→「内部テスト」で新しいリリースを作成
4. AAB をアップロード
5. ストア掲載情報を入力
   - 説明文・スクリーンショットは Issue #15 の成果物を使用
6. アプリのコンテンツ（対象年齢/広告/データセーフティなど）を入力
7. 送信前チェックの警告を解消し、審査提出

## 提出前チェックリスト

- [ ] AAB が最新コミット由来である
- [ ] バージョンコード/バージョン名が前回提出より増えている
- [ ] ストア掲載情報（説明/画像）が最新
- [ ] プライバシーポリシーURLが有効
- [ ] 内部テスターでインストール確認済み

## keystore 運用（重要）

`gabigabi-release.keystore` はアプリ更新に必須。紛失時は同一パッケージで更新不能になるため、以下を徹底する。

- [ ] 安全な場所へバックアップ（最低2系統）
- [ ] パスワード管理ツールへ保管情報を記録
- [ ] 復旧手順（保管場所・所有者）をチームで共有
