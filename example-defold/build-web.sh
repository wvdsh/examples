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

java -jar "$BOB_JAR" \
  --platform js-web \
  --architectures wasm-web \
  --archive \
  --bundle-output build/web \
  resolve build bundle

echo "HTML5 build written to build/web/"
