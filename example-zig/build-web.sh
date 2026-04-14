#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OUT_DIR="$ROOT/build/web"

if ! command -v zig >/dev/null 2>&1; then
  printf '%s\n' "zig is required. Install Zig, then rerun ./build-web.sh." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

zig build-exe "$ROOT/src/main.zig" \
  -target wasm32-freestanding \
  -fno-entry \
  -rdynamic \
  -O ReleaseSmall \
  -femit-bin="$OUT_DIR/game.wasm"

cp "$ROOT/web/index.html" "$OUT_DIR/index.html"
cp "$ROOT/web/game.js" "$OUT_DIR/game.js"

printf '%s\n' "Built web files in $OUT_DIR"
