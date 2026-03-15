# Multi-stage build for convert2gabigabi development environment
FROM ubuntu:22.04 AS base

# 基本パッケージとツールのインストール
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Node.js 20 のインストール (公式バイナリ)
RUN curl -fsSL https://nodejs.org/dist/v20.19.2/node-v20.19.2-linux-x64.tar.xz | tar -xJ -C /usr/local --strip-components=1

# Yarn のインストール
RUN npm install -g yarn@1.22.22

# Rust のインストール
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# 作業ディレクトリの設定
WORKDIR /workspace

# package.json系ファイルをコピーして依存関係を事前インストール
COPY app/package.json app/yarn.lock ./app/
RUN cd app && yarn install --frozen-lockfile

# Rustプロジェクトの依存関係を事前ビルド
COPY rust_core/Cargo.toml rust_core/Cargo.lock ./rust_core/
RUN cd rust_core && cargo fetch

# 全ソースコードをコピー
COPY . .

# Metro server用ポート
EXPOSE 8081
EXPOSE 3000

# 開発サーバー起動用のスクリプト
CMD ["bash", "-c", "cd app && yarn expo"] 