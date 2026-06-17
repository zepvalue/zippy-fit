#!/bin/bash
# Capture a screenshot from a connected Android device via adb.
# Usage: ./run.sh [output-path]
# Default output: ./screenshots/zippy-<timestamp>.png

set -e

OUT="$1"

if ! command -v adb >/dev/null 2>&1; then
  if [ -x "$HOME/Library/Android/sdk/platform-tools/adb" ]; then
    ADB="$HOME/Library/Android/sdk/platform-tools/adb"
  else
    echo "❌ adb not found. Install Android platform-tools or add it to PATH."
    exit 1
  fi
else
  ADB="adb"
fi

# Require exactly one connected device
DEVICE_COUNT=$("$ADB" devices | grep -cw "device" || true)
if [ "$DEVICE_COUNT" -eq 0 ]; then
  echo "❌ No device connected. Plug in a device or start an emulator."
  exit 1
fi

if [ -z "$OUT" ]; then
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  ROOT="$SCRIPT_DIR/../.."
  TS=$(date +%Y%m%d-%H%M%S)
  mkdir -p "$ROOT/screenshots"
  OUT="$ROOT/screenshots/zippy-$TS.png"
fi

"$ADB" exec-out screencap -p > "$OUT"
echo "✅ Saved screenshot: $OUT"
