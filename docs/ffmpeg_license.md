# FFmpeg ライセンス

## 本プロジェクトのライセンス

本プロジェクトは **GPL v3** ライセンスで公開されています。

## FFmpeg の利用

本アプリは [FFmpegKit](https://github.com/arthenica/ffmpeg-kit) の
コミュニティフォーク（[@wokcito/ffmpeg-kit-react-native](https://www.npmjs.com/package/@wokcito/ffmpeg-kit-react-native)）を使用しています。

### 使用パッケージ

- `io.github.jamaismagic.ffmpeg:ffmpeg-kit-main-16kb:6.1.4`
- main パッケージ（GPLコーデック含む）

### 使用コーデック

| コーデック | ライセンス | 用途 |
|---|---|---|
| libx264 | GPL v2+ | H.264 動画エンコード（MP4/AVI/MOV/MKV） |
| mpeg2video | LGPL | MPG 動画エンコード |
| libvpx-vp9 | BSD | WebM 動画エンコード |
| libvorbis | BSD | WebM 音声エンコード |
| aac (FFmpeg内蔵) | LGPL | MP4/MOV 音声エンコード |
| mp3 (FFmpeg内蔵) | LGPL | AVI 音声エンコード |
| mp2 (FFmpeg内蔵) | LGPL | MPG 音声エンコード |

### GPL 採用の理由

`libx264` は H.264 エンコードの業界標準であり、フォーマット変換の品質に直結します。
本アプリはフォーマット変換をメイン機能の一つとして提供するため、
品質を妥協せず GPL v3 を採用しソースコードを公開する方針としました。

## ソースコード

- GitHub: https://github.com/eisei-komiya/convert2gabigabi
- ライセンス: GPL v3（リポジトリルートの `LICENSE` 参照）

---

最終更新: 2026-03-05
