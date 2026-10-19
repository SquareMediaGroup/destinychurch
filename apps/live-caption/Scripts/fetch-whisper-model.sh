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
# compared with a second trusted source) and record it in the case below.
#
# A case statement rather than an associative array on purpose: macOS ships
# bash 3.2, which has no `declare -A`, and `/usr/bin/env bash` finds that one
# unless a newer bash happens to be installed.
expected_checksum_for() {
  case "$1" in
    # "ggml-large-v3-turbo.bin") echo "<verified-sha256>" ;;
    # "ggml-medium.bin")         echo "<verified-sha256>" ;;
    *) echo "" ;;
  esac
}

if [[ -f "$DEST_PATH" ]]; then
  echo "Already downloaded: $DEST_PATH"
else
  echo "Downloading $FILENAME ..."
  # Download to a temporary path first: an interrupted curl would otherwise
  # leave a truncated .bin that looks like a valid cached model on the next run.
  curl -L --fail --progress-bar -o "$DEST_PATH.partial" "$URL"
  mv "$DEST_PATH.partial" "$DEST_PATH"
fi

EXPECTED="$(expected_checksum_for "$FILENAME")"
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
