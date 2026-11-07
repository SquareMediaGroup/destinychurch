#!/usr/bin/env bash
# Downloads Apple's official product bezels (Apple Design Resources) into public/bezels/.
#
# They are NOT committed: Apple's licence forbids redistributing them, and only allows mock-ups
# of software that runs only on Apple platforms. That's why these films show Destiny One on iOS
# only (App Store badge, no Android). Read "Apple Design Resources License.rtf" in each download.
#
# Needs curl and 7-Zip (`7z`; on Debian/Ubuntu: apt-get install p7zip-full).
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=public/bezels
TMP=$(mktemp -d)
mkdir -p "$OUT"
BASE=https://devimages-cdn.apple.com/design/resources/download

fetch() { # <dmg name> <path inside the dmg> <output file>
  [ -f "$TMP/$1.dmg" ] || curl -fSL --retry 3 -o "$TMP/$1.dmg" "$BASE/$1.dmg"
  7z e -y -o"$TMP/x" "$TMP/$1.dmg" "$2" >/dev/null
  mv "$TMP/x/$(basename "$2")" "$OUT/$3"
  echo "✓ $3"
}

fetch Bezel-iPhone-18 "Bezel-iPhone-18/PNG/iPhone 18 Pro/iPhone 18 Pro - Silver - Portrait.png" iphone-18-pro-silver.png
fetch Bezel-iPhone-18 "Bezel-iPhone-18/PNG/iPhone 18 Pro/iPhone 18 Pro - Black - Portrait.png" iphone-18-pro-black.png
fetch Bezel-MacBook-Pro-M5 "Bezel-MacBook-Pro-M5/PNG/MacBook Pro M5 14-inch Silver.png" macbook-pro-14-silver.png
rm -rf "$TMP"
