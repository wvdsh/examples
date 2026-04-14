#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OUT_DIR="$ROOT/build/web"
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
  printf '%s\n' "Ren'Py web support is not installed in $RENPY_SDK. Install the web platform package and rerun ./build-web.sh." >&2
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

# Ask Ren'Py to export its web root into a deterministic staging directory,
# then install the stable Wavedash wrapper beside it.
run_renpy launcher web_build "$ROOT" --destination "$WEB_EXPORT_DIR"

if [ ! -f "$WEB_EXPORT_DIR/index.html" ]; then
  printf '%s\n' "Ren'Py did not produce an index.html in $WEB_EXPORT_DIR." >&2
  exit 1
fi

mkdir -p "$OUT_DIR/renpy"
cp -R "$WEB_EXPORT_DIR"/. "$OUT_DIR/renpy/"
cp "$ROOT/web/game.js" "$OUT_DIR/game.js"

printf '%s\n' "Built Wavedash files in $OUT_DIR"
