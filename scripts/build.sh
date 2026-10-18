#!/bin/sh
# Build the macOS .app bundle (and a .dmg when the host allows disk images).
set -e
cd "$(dirname "$0")/.." || exit 1
. ./scripts/env.sh

node node_modules/@tauri-apps/cli/tauri.js build --bundles app "$@"

APP="src-tauri/target/release/bundle/macos/Paper.app"
if [ -d "$APP" ]; then
  echo ""
  echo "App bundle: $APP"
  sh ./scripts/make-dmg.sh || {
    echo "提示：当前环境不允许创建磁盘映像，可稍后在本机运行 ./scripts/make-dmg.sh 生成 DMG。"
  }
fi
