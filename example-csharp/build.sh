#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT="$ROOT/src/Pong.csproj"
OUT_DIR="$ROOT/build"

if [ -d /usr/local/share/dotnet ]; then
  export PATH="/usr/local/share/dotnet:$PATH"
  export DOTNET_ROOT="/usr/local/share/dotnet"
fi

if ! command -v dotnet >/dev/null 2>&1; then
  printf '%s\n' "dotnet is required. Install the .NET 9+ SDK, then rerun ./build.sh." >&2
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

dotnet publish "$PROJECT" -c Release

# The browser-wasm publish generates an AppBundle with _framework/ inside.
APP_BUNDLE="$ROOT/src/bin/Release/net9.0/browser-wasm/AppBundle"

if [ ! -d "$APP_BUNDLE/_framework" ]; then
  printf '%s\n' "AppBundle/_framework not found after dotnet publish." >&2
  printf '%s\n' "" >&2
  printf '%s\n' "Ensure the wasm-tools workload is installed:" >&2
  printf '%s\n' "  dotnet workload install wasm-tools-net9" >&2
  exit 1
fi

# Copy the .NET runtime framework files
cp -R "$APP_BUNDLE/_framework" "$OUT_DIR/_framework"

# Copy our web shell (index.html + game.js)
cp "$ROOT/web/index.html" "$OUT_DIR/index.html"
cp "$ROOT/web/game.js" "$OUT_DIR/game.js"

printf '%s\n' "Built web files in $OUT_DIR"
