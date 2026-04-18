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

# Flatten Ren'Py's export directly into the deploy dir (no iframe wrapper;
# the wavedash bridge is injected into Ren'Py's own index.html).
cp -R "$WEB_EXPORT_DIR"/. "$OUT_DIR/"
cp "$ROOT/web/wavedash-bridge.js" "$OUT_DIR/wavedash-bridge.js"

# Inject our bridge script into Ren'Py's index.html before the closing </head>.
python3 - "$OUT_DIR/index.html" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1])
html = p.read_text()
tag = '<script src="wavedash-bridge.js"></script>'
if tag not in html:
    html = html.replace('</head>', tag + '\n</head>', 1)
    p.write_text(html)
PY

# Clean up intermediates.
rm -rf "$WEB_EXPORT_DIR" "$OUT_DIR/renpy-export.zip"

printf '%s\n' "Built Wavedash files in $OUT_DIR"
