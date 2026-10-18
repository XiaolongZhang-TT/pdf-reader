#!/bin/sh
# Package the built Paper.app into a compressed DMG.
set -e
cd "$(dirname "$0")/.." || exit 1
. ./scripts/env.sh

APP="src-tauri/target/release/bundle/macos/Paper.app"
VERSION="$(node -p "require('./src-tauri/tauri.conf.json').version")"
ARCH="$(uname -m)"
DMG="src-tauri/target/release/bundle/dmg/Paper_${VERSION}_${ARCH}.dmg"

if [ ! -d "$APP" ]; then
  echo "未找到 $APP，请先运行 ./scripts/build.sh" >&2
  exit 1
fi

STAGE="$(mktemp -d /tmp/paper-dmg.XXXXXX)"
trap 'rm -rf "$STAGE"' EXIT
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
mkdir -p "$(dirname "$DMG")"
rm -f "$DMG"

hdiutil create \
  -volname "Paper" \
  -srcfolder "$STAGE" \
  -fs HFS+ \
  -format UDZO \
  -ov \
  "$DMG"

echo "DMG: $DMG"
