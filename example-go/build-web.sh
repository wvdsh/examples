#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OUT_DIR="$ROOT/build/web"

if ! command -v go >/dev/null 2>&1; then
  printf '%s\n' "go is required. Install Go, then rerun ./build-web.sh." >&2
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

GOOS=js GOARCH=wasm go build -ldflags="-s -w" -o "$OUT_DIR/game.wasm" ./src

cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" "$OUT_DIR/wasm_exec.js"
cp "$ROOT/web/game.js" "$OUT_DIR/game.js"

printf '%s\n' "Built web files in $OUT_DIR"
