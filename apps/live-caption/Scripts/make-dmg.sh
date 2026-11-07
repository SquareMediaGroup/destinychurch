#!/usr/bin/env bash
# Builds a Release copy of Live Caption and packages it as a drag-to-install
# .dmg in build/. Run via `make dmg` after the one-time vendor steps
# (`make whisper-build`, `make ndi-setup`) — see README.md > Packaging.
#
# Signing:
#   - Default: ad-hoc. Runs on the Mac that built it; on any other Mac,
#     macOS blocks the first launch until it's allowed in System Settings >
#     Privacy & Security ("Open Anyway"), because it isn't notarized.
#   - SIGN_IDENTITY="Developer ID Application: …" signs it properly, and
#     NOTARY_PROFILE=<keychain profile from `xcrun notarytool store-credentials`>
#     also notarizes and staples it, so it opens anywhere without a warning.
#
# whisper models are NOT bundled (multi-GB). Operators put one in
# ~/Library/Application Support/Live Caption/Models — the app's Settings >
# Transcription > Open Models Folder button goes straight there.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$APP_ROOT"

DD="${DD:-$APP_ROOT/build/DerivedData}"
OUT_DIR="$APP_ROOT/build"
APP_NAME="Live Caption"
VERSION="$(awk -F'"' '/MARKETING_VERSION:/ {print $2; exit}' project.yml)"
DMG_PATH="$OUT_DIR/Live-Caption-${VERSION:-1.0}.dmg"
SIGN_IDENTITY="${SIGN_IDENTITY:-}"
NOTARY_PROFILE="${NOTARY_PROFILE:-}"

test -f Vendor/NDI/lib/macOS/libndi.dylib || { echo "❌ NDI SDK not set up. Run: make ndi-setup" >&2; exit 1; }
test -f Vendor/whisper.cpp/build/src/libwhisper.a || { echo "❌ whisper.cpp not built. Run: make whisper-build" >&2; exit 1; }

echo "🔨 Generating the Xcode project…"
xcodegen generate --quiet

SIGN_ARGS=()
if [[ -n "$SIGN_IDENTITY" ]]; then
  echo "🔏 Signing with: $SIGN_IDENTITY"
  SIGN_ARGS=(CODE_SIGN_STYLE=Manual "CODE_SIGN_IDENTITY=$SIGN_IDENTITY" OTHER_CODE_SIGN_FLAGS=--timestamp)
else
  echo "🔏 No SIGN_IDENTITY set: ad-hoc signing (fine for this Mac, warns on others)."
  # Hardened runtime only matters for notarization, and with an ad-hoc
  # signature its library validation can refuse the embedded libndi.dylib.
  SIGN_ARGS=(CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY=- DEVELOPMENT_TEAM= ENABLE_HARDENED_RUNTIME=NO)
fi

echo "🔨 Building Release…"
xcodebuild -project LiveCaption.xcodeproj -scheme LiveCaption \
  -configuration Release \
  -derivedDataPath "$DD" \
  "${SIGN_ARGS[@]}" \
  build | tail -n 5

APP_PATH="$DD/Build/Products/Release/$APP_NAME.app"
test -d "$APP_PATH" || { echo "❌ Build produced no app at $APP_PATH" >&2; exit 1; }

# The app must load libndi from inside its own bundle, not from an NDI SDK
# install that the church Mac may not have.
BINARY="$APP_PATH/Contents/MacOS/$APP_NAME"
test -f "$APP_PATH/Contents/Frameworks/libndi.dylib" || { echo "❌ libndi.dylib is not embedded in the app" >&2; exit 1; }
NDI_LOAD="$(otool -L "$BINARY" | awk '/libndi/ {print $1}')"
case "$NDI_LOAD" in
  @rpath/*|@executable_path/*|@loader_path/*) ;;
  *) echo "❌ App loads libndi from '$NDI_LOAD', not from its bundle" >&2; exit 1 ;;
esac
otool -l "$BINARY" | grep -q "@executable_path/../Frameworks" \
  || { echo "❌ App has no rpath to Contents/Frameworks" >&2; exit 1; }
codesign --verify --deep --strict "$APP_PATH"
echo "✓ App built, libndi embedded and signed"

echo "📦 Packaging $DMG_PATH…"
STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT
ditto "$APP_PATH" "$STAGING/$APP_NAME.app"
ln -s /Applications "$STAGING/Applications"
mkdir -p "$OUT_DIR"
rm -f "$DMG_PATH"
hdiutil create -volname "$APP_NAME" -srcfolder "$STAGING" -fs HFS+ -format UDZO -ov "$DMG_PATH" >/dev/null

if [[ -n "$SIGN_IDENTITY" ]]; then
  codesign --sign "$SIGN_IDENTITY" --timestamp "$DMG_PATH"
  if [[ -n "$NOTARY_PROFILE" ]]; then
    echo "📝 Notarizing (a few minutes)…"
    xcrun notarytool submit "$DMG_PATH" --keychain-profile "$NOTARY_PROFILE" --wait
    xcrun stapler staple "$DMG_PATH"
  fi
fi

echo "✓ Done: $DMG_PATH"
