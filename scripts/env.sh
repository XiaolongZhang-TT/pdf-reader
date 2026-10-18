#!/bin/sh
# Shared environment for local development / builds (source this file).
#
# Rust comes from the global rustup installation (`~/.cargo` + `~/.rustup`).
# Node.js / pnpm come from Homebrew (or any Node installation on PATH).
if [ -n "${BASH_SOURCE:-}" ]; then
  _SRC="$BASH_SOURCE"
else
  _SRC="$0"
fi
ROOT="$(cd "$(dirname "$_SRC")/.." && pwd)"

# Keep the repo-local crates.io mirror config (`$ROOT/.cargo/config.toml`),
# which Cargo discovers automatically when building inside this directory.
[ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"

# Fall back to Homebrew's shellenv when node/pnpm are not on PATH yet.
if ! command -v node >/dev/null 2>&1 && command -v brew >/dev/null 2>&1; then
  eval "$(brew shellenv)"
fi
export PATH

if ! command -v cargo >/dev/null 2>&1 || ! command -v rustc >/dev/null 2>&1; then
  echo "未找到 Rust。请先安装 rustup：" >&2
  echo '  curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile default' >&2
fi
if ! command -v node >/dev/null 2>&1 || ! command -v pnpm >/dev/null 2>&1; then
  echo "未找到 Node.js / pnpm。请安装：brew install node pnpm" >&2
fi
