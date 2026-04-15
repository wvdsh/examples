#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OUT_DIR="$ROOT/build/web"

if ! command -v em++ >/dev/null 2>&1; then
  printf '%s\n' "em++ not found. Install the Emscripten SDK and activate it (source ./emsdk_env.sh), then rerun ./build-web.sh." >&2
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

em++ "$ROOT/src/main.cpp" \
  -std=c++17 \
  -O2 \
  -s ENVIRONMENT=web \
  -s EXPORTED_RUNTIME_METHODS='["UTF8ToString","lengthBytesUTF8","stringToUTF8"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -o "$OUT_DIR/game.js"

cp "$ROOT/web/index.html" "$OUT_DIR/index.html"

printf '%s\n' "Built web files in $OUT_DIR"
