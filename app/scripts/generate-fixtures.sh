#!/bin/bash
# テスト用fixtureファイルを生成するスクリプト
# 事前にffmpegをインストールしておく必要があります

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURES_DIR="$SCRIPT_DIR/../fixtures"

mkdir -p "$FIXTURES_DIR"

echo "Generating fixture files..."

# MP4 (H.264)
ffmpeg -f lavfi -i testsrc=duration=1:size=320x240:rate=1 \
  -c:v libx264 -crf 28 \
  "$FIXTURES_DIR/test.mp4" -y

# WebM (VP9)
ffmpeg -f lavfi -i testsrc=duration=1:size=320x240:rate=1 \
  -c:v libvpx-vp9 \
  "$FIXTURES_DIR/test.webm" -y

# JPEG
ffmpeg -f lavfi -i testsrc=size=320x240 -frames:v 1 \
  "$FIXTURES_DIR/test.jpg" -y

echo "Done! Generated files:"
ls -lh "$FIXTURES_DIR"
