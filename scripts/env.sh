#!/bin/sh
# Shared environment for local development / builds (source this file).
#
# This workspace keeps its toolchains inside the project (`.tools`, `.cargo`,
# `.rustup`) so builds are self-contained. On a normal machine with Node, pnpm
# and Rust installed system-wide this script is optional.
if [ -n "${BASH_SOURCE:-}" ]; then
  _SRC="$BASH_SOURCE"
else
  _SRC="$0"
fi
ROOT="$(cd "$(dirname "$_SRC")/.." && pwd)"

export RUSTUP_HOME="$ROOT/.rustup"
export CARGO_HOME="$ROOT/.cargo"

for _dir in "$ROOT/.tools" "$ROOT/.cargo/bin"; do
  [ -d "$_dir" ] && PATH="$_dir:$PATH"
done
export PATH

if ! command -v node >/dev/null 2>&1 || ! command -v cargo >/dev/null 2>&1; then
  echo "提示：未找到 node 或 cargo。本机可安装 Node.js / pnpm / rustup，或把工具链放在 .tools 与 .cargo 下。" >&2
fi
