#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SRC_FILE="$ROOT/src/main.c"
JS_ENTRY="$ROOT/web/game.js"
OUT_DIR="$ROOT/build/web"
OUT_WASM="$OUT_DIR/game.wasm"
OUT_JS="$OUT_DIR/game.js"

if ! command -v zig >/dev/null 2>&1; then
  printf '%s\n' "zig is required. Install Zig, then rerun ./build-web.sh." >&2
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

zig build-exe "$SRC_FILE" \
  -target wasm32-freestanding \
  -fno-entry \
  -rdynamic \
  -O ReleaseSmall \
  -femit-bin="$OUT_WASM"

if [ ! -f "$OUT_WASM" ]; then
  printf '%s\n' "Expected compiled wasm at $OUT_WASM, but it was not produced." >&2
  exit 1
fi

cp "$JS_ENTRY" "$OUT_JS"

printf '%s\n' "Built web files in $OUT_DIR"
