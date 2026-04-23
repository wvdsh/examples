#!/usr/bin/env sh
set -eu

# Build the raylib pong game for the web using Emscripten.
#
# Prerequisites:
#   - Emscripten SDK (emcc) — activate with: source ./emsdk_env.sh
#   - cmake, make
#
# By default this script clones raylib 5.5 into ./raylib/ and builds
# libraylib.a for the Web platform. Override with RAYLIB_PATH=... if you
# already have a raylib Web build.

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
RAYLIB_DIR="${RAYLIB_PATH:-$ROOT/raylib}"
OUT="$ROOT/build"

if ! command -v emcc >/dev/null 2>&1; then
  printf '%s\n' "emcc not found. Install the Emscripten SDK and activate it (source ./emsdk_env.sh), then rerun ./build.sh." >&2
  exit 1
fi

# Build raylib for Web if not already done
if [ ! -f "$RAYLIB_DIR/src/raylib/libraylib.a" ]; then
  if [ ! -d "$RAYLIB_DIR" ]; then
    printf '%s\n' "Cloning raylib 5.5..."
    git clone --depth 1 --branch 5.5 https://github.com/raysan5/raylib.git "$RAYLIB_DIR"
  fi
  printf '%s\n' "Building raylib for Web (this takes a minute)..."
  cd "$RAYLIB_DIR/src"
  emcmake cmake .. \
    -DPLATFORM=Web \
    -DBUILD_EXAMPLES=OFF \
    -DCMAKE_BUILD_TYPE=Release
  emmake make -j4 raylib
  cd "$ROOT"
fi

rm -rf "$OUT"
mkdir -p "$OUT"

emcc "$ROOT/src/main.c" \
  -O2 \
  -I"$RAYLIB_DIR/src" \
  "$RAYLIB_DIR/src/raylib/libraylib.a" \
  -DPLATFORM_WEB \
  -s USE_GLFW=3 \
  -s ASYNCIFY \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s MODULARIZE=0 \
  -s ENVIRONMENT=web \
  -s GL_ENABLE_GET_PROC_ADDRESS=1 \
  -o "$OUT/game.js"

cp "$ROOT/web/index.html" "$OUT/index.html"

printf '%s\n' "Built web files in $OUT"
