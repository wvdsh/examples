#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OUT_DIR="$ROOT/build"
WEB_EXPORT_DIR="$ROOT/build/renpy-export"

if [ -z "${RENPY_SDK:-}" ]; then
  printf '%s\n' "RENPY_SDK must point to a Ren'Py SDK directory that contains renpy.sh." >&2
  exit 1
fi

RENPY_SH="$RENPY_SDK/renpy.sh"

if [ ! -f "$RENPY_SH" ]; then
  printf '%s\n' "Unable to find renpy.sh at $RENPY_SH." >&2
  exit 1
fi

if [ ! -d "$RENPY_SDK/web" ]; then
  printf '%s\n' "Ren'Py web support is not installed in $RENPY_SDK. Install the web platform package and rerun ./build.sh." >&2
  exit 1
fi

run_renpy() {
  (
    cd "$RENPY_SDK"

    if [ -x "$RENPY_SH" ]; then
      "./renpy.sh" "$@"
    else
      sh "./renpy.sh" "$@"
    fi
  )
}

rm -rf "$OUT_DIR" "$WEB_EXPORT_DIR"
mkdir -p "$OUT_DIR" "$WEB_EXPORT_DIR"

run_renpy launcher web_build "$ROOT" --destination "$WEB_EXPORT_DIR"

if [ ! -f "$WEB_EXPORT_DIR/index.html" ]; then
  printf '%s\n' "Ren'Py did not produce an index.html in $WEB_EXPORT_DIR." >&2
  exit 1
fi

# Flatten Ren'Py's export directly into the deploy dir. The SDK is driven from
# Ren'Py itself via `emscripten.run_script` (see game/00_wavedash.rpy), so
# there's no JS bridge to inject.
cp -R "$WEB_EXPORT_DIR"/. "$OUT_DIR/"

# Clean up intermediates.
rm -rf "$WEB_EXPORT_DIR" "$OUT_DIR/renpy-export.zip"

printf '%s\n' "Built Wavedash files in $OUT_DIR"
