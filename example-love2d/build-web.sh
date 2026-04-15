#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OUT_DIR="$ROOT/build/web"
LOVEJS_DIST="${LOVEJS_DIST:-}"

if ! command -v zip >/dev/null 2>&1; then
  printf '%s\n' "zip is required. Install zip, then rerun ./build-web.sh." >&2
  exit 1
fi

if [ -z "$LOVEJS_DIST" ]; then
  printf '%s\n' "LOVEJS_DIST must point to an extracted 2dengine/love.js directory." >&2
  exit 1
fi

if [ ! -d "$LOVEJS_DIST" ]; then
  printf '%s\n' "LOVEJS_DIST does not exist: $LOVEJS_DIST" >&2
  exit 1
fi

require_file() {
  if [ ! -f "$1" ]; then
    printf '%s\n' "Missing required love.js runtime file: $1" >&2
    exit 1
  fi
}

require_file "$LOVEJS_DIST/player.js"
require_file "$LOVEJS_DIST/style.css"
require_file "$LOVEJS_DIST/11.5/love.js"
require_file "$LOVEJS_DIST/11.5/love.wasm"
require_file "$LOVEJS_DIST/lua/normalize1.lua"
require_file "$LOVEJS_DIST/lua/normalize2.lua"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR/11.5" "$OUT_DIR/lua"

cp "$ROOT/web/index.html" "$OUT_DIR/index.html"
cp "$ROOT/web/.htaccess" "$OUT_DIR/.htaccess"
cp "$ROOT/web/wavedash-bridge.js" "$OUT_DIR/wavedash-bridge.js"
cp "$LOVEJS_DIST/player.js" "$OUT_DIR/player.js"
cp "$LOVEJS_DIST/style.css" "$OUT_DIR/style.css"
cp "$LOVEJS_DIST/11.5/love.js" "$OUT_DIR/11.5/love.js"
cp "$LOVEJS_DIST/11.5/love.wasm" "$OUT_DIR/11.5/love.wasm"
cp "$LOVEJS_DIST/lua/normalize1.lua" "$OUT_DIR/lua/normalize1.lua"
cp "$LOVEJS_DIST/lua/normalize2.lua" "$OUT_DIR/lua/normalize2.lua"

(
  cd "$ROOT"
  zip -9 -q "$OUT_DIR/game.love" conf.lua main.lua wavedash.lua
)

printf '%s\n' "Built LOVE2D web files in $OUT_DIR"
