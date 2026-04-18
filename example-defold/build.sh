#!/usr/bin/env bash
set -euo pipefail

if ! command -v java &>/dev/null; then
  echo "Java is required to run bob.jar (JDK 17+)."
  echo "Install it from https://adoptium.net or your system package manager."
  exit 1
fi

BOB_JAR="${BOB_JAR:-bob.jar}"

if [[ ! -f "$BOB_JAR" ]]; then
  echo "bob.jar not found. Download it from:"
  echo "  https://github.com/defold/defold/releases"
  echo ""
  echo "Place it in this directory or set the BOB_JAR environment variable."
  exit 1
fi

rm -rf bundle
java -jar "$BOB_JAR" \
  --platform js-web \
  --architectures wasm-web \
  --archive \
  --bundle-output bundle \
  resolve build bundle

# Defold writes to bundle/example-defold/ (or similar subfolder) — flatten to build/
rm -rf build
mkdir -p build
BUNDLE_SUBDIR="$(find bundle -maxdepth 1 -mindepth 1 -type d | head -1)"
if [ -n "$BUNDLE_SUBDIR" ]; then
  cp -R "$BUNDLE_SUBDIR/"* build/
else
  cp -R bundle/* build/
fi

echo "HTML5 build written to build/"
