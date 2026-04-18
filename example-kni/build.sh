#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT="$ROOT/Pong.csproj"
OUT_DIR="$ROOT/build"
PUBLISH_WWWROOT="$ROOT/bin/Release/net8.0/publish/wwwroot"

if ! command -v dotnet >/dev/null 2>&1; then
  printf '%s\n' "dotnet is required. Install the .NET 8 or 9 SDK, then rerun ./build.sh." >&2
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

dotnet publish "$PROJECT" -c Release

if [ ! -d "$PUBLISH_WWWROOT" ]; then
  printf '%s\n' "Expected Blazor publish output at $PUBLISH_WWWROOT but it was not produced." >&2
  exit 1
fi

cp -R "$PUBLISH_WWWROOT"/. "$OUT_DIR/"

printf '%s\n' "Built web files in $OUT_DIR"
