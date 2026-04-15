#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OUT_DIR="$ROOT/build/web"
WASM_SRC="$ROOT/target/wasm32-unknown-unknown/release/game.wasm"

if ! command -v cargo >/dev/null 2>&1; then
  printf '%s\n' "cargo is required. Install Rust, then rerun ./build-web.sh." >&2
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

cargo build \
  --manifest-path "$ROOT/Cargo.toml" \
  --lib \
  --target wasm32-unknown-unknown \
  --release

if [ ! -f "$WASM_SRC" ]; then
  printf '%s\n' "Expected compiled wasm at $WASM_SRC, but it was not produced." >&2
  exit 1
fi

cp "$WASM_SRC" "$OUT_DIR/game.wasm"
cp "$ROOT/web/game.js" "$OUT_DIR/game.js"
cp "$ROOT/web/index.html" "$OUT_DIR/index.html"

printf '%s\n' "Built web files in $OUT_DIR"
