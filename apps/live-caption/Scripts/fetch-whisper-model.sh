#!/usr/bin/env bash
# Downloads a ggml whisper.cpp model into Vendor/Models/ (gitignored — models
# are multi-GB and never belong in git). Checksums are recorded here so a
# fetched model can be verified rather than trusted blindly.
#
# Usage: ./Scripts/fetch-whisper-model.sh <model-name>
#   e.g. ./Scripts/fetch-whisper-model.sh large-v3-turbo
#        ./Scripts/fetch-whisper-model.sh medium

set -euo pipefail

MODEL_NAME="${1:-}"
if [[ -z "$MODEL_NAME" ]]; then
  echo "Usage: $0 <model-name>   (e.g. large-v3-turbo, medium)" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST_DIR="$SCRIPT_DIR/../Vendor/Models"
mkdir -p "$DEST_DIR"

FILENAME="ggml-${MODEL_NAME}.bin"
URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${FILENAME}"
DEST_PATH="$DEST_DIR/$FILENAME"

# SHA256 checksums are intentionally NOT hardcoded here — do not paste in a
# checksum you haven't independently verified. After your first download of a
# given model, confirm its hash against the value published on
# https://huggingface.co/ggerganov/whisper.cpp (or via `shasum -a 256`
# compared with a second trusted source) and record it in this map yourself:
#
#   declare -A CHECKSUMS=(
#     ["ggml-large-v3-turbo.bin"]="<verified-sha256>"
#     ["ggml-medium.bin"]="<verified-sha256>"
#   )
declare -A CHECKSUMS=()

if [[ -f "$DEST_PATH" ]]; then
  echo "Already downloaded: $DEST_PATH"
else
  echo "Downloading $FILENAME ..."
  curl -L --fail -o "$DEST_PATH" "$URL"
fi

EXPECTED="${CHECKSUMS[$FILENAME]:-}"
if [[ -n "$EXPECTED" ]]; then
  ACTUAL="$(shasum -a 256 "$DEST_PATH" | awk '{print $1}')"
  if [[ "$ACTUAL" != "$EXPECTED" ]]; then
    echo "Checksum mismatch for $FILENAME!" >&2
    echo "  expected: $EXPECTED" >&2
    echo "  actual:   $ACTUAL" >&2
    exit 1
  fi
  echo "Checksum verified."
else
  echo "Warning: no known checksum recorded for $FILENAME — verify manually before trusting it in production." >&2
fi

echo "Model ready at: $DEST_PATH"
