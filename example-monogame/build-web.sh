#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT="$ROOT/src/Pong.csproj"
JS_ENTRY="$ROOT/web/game.js"
OUT_DIR="$ROOT/build/web"
OUT_WASM="$OUT_DIR/game.wasm"
OUT_JS="$OUT_DIR/game.js"

if ! command -v dotnet >/dev/null 2>&1; then
  printf '%s\n' "dotnet is required. Install the .NET 9 SDK, then rerun ./build-web.sh." >&2
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

dotnet publish "$PROJECT" -c Release

# NativeAOT WASM publish places the binary under the RID-specific native
# directory. Try known publish paths in order.
PUBLISH_WASM=""
for candidate in \
  "$ROOT/src/bin/Release/net9.0/browser-wasm/native/Pong.wasm" \
  "$ROOT/src/bin/Release/net9.0/browser-wasm/publish/Pong.wasm" \
  "$ROOT/src/bin/Release/net9.0/publish/Pong.wasm"; do
  if [ -f "$candidate" ]; then
    PUBLISH_WASM="$candidate"
    break
  fi
done

if [ -z "$PUBLISH_WASM" ]; then
  printf '%s\n' "No Pong.wasm found after dotnet publish." >&2
  printf '%s\n' "" >&2
  printf '%s\n' "Ensure the wasm-experimental workload is installed:" >&2
  printf '%s\n' "  dotnet workload install wasm-experimental" >&2
  printf '%s\n' "" >&2
  printf '%s\n' "Then rerun ./build-web.sh." >&2
  exit 1
fi

cp "$PUBLISH_WASM" "$OUT_WASM"
cp "$JS_ENTRY" "$OUT_JS"

printf '%s\n' "Built web files in $OUT_DIR"
