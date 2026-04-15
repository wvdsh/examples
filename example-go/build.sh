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

GOROOT=$(go env GOROOT)
if [ -f "$GOROOT/lib/wasm/wasm_exec.js" ]; then
  cp "$GOROOT/lib/wasm/wasm_exec.js" "$OUT_DIR/wasm_exec.js"
elif [ -f "$GOROOT/misc/wasm/wasm_exec.js" ]; then
  cp "$GOROOT/misc/wasm/wasm_exec.js" "$OUT_DIR/wasm_exec.js"
else
  printf '%s\n' "wasm_exec.js not found under $GOROOT" >&2
  exit 1
fi
cp "$ROOT/web/game.js" "$OUT_DIR/game.js"
cp "$ROOT/web/index.html" "$OUT_DIR/index.html"

printf '%s\n' "Built web files in $OUT_DIR"
