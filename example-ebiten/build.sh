#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OUT="$ROOT/build"

if ! command -v go >/dev/null 2>&1; then
  printf '%s\n' "go is required. Install Go from https://go.dev/dl/, then rerun ./build.sh." >&2
  exit 1
fi

rm -rf "$OUT"
mkdir -p "$OUT"

GOOS=js GOARCH=wasm go build -ldflags="-s -w" -o "$OUT/game.wasm" .

GOROOT=$(go env GOROOT)
if [ -f "$GOROOT/lib/wasm/wasm_exec.js" ]; then
  cp "$GOROOT/lib/wasm/wasm_exec.js" "$OUT/wasm_exec.js"
elif [ -f "$GOROOT/misc/wasm/wasm_exec.js" ]; then
  cp "$GOROOT/misc/wasm/wasm_exec.js" "$OUT/wasm_exec.js"
else
  printf '%s\n' "wasm_exec.js not found under $GOROOT" >&2
  exit 1
fi

cp "$ROOT/web/index.html" "$OUT/index.html"

printf '%s\n' "Built web files in $OUT"
