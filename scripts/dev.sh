#!/bin/sh
# Start the Paper desktop app in development mode.
cd "$(dirname "$0")/.." || exit 1
. ./scripts/env.sh
exec node node_modules/@tauri-apps/cli/tauri.js dev
