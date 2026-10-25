#!/bin/bash
# Talent Buzzer - Mac launcher (the Mac version of start.bat). Double-click it in Finder.
# A setup page opens in the browser where you choose which machine this is.
cd "$(dirname "$0")" || exit 1

# Finder doesn't load your shell profile, so look where the Node.js installer and Homebrew put node.
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "Node.js is not installed on this computer yet."
  echo "The download page is opening in your browser. Install Node.js, then double-click start.command again."
  echo
  open "https://nodejs.org/en/download"
  read -r -p "Press Enter to close this window."
  exit 1
fi

if ! node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"; then
  echo
  echo "This computer has an old version of Node.js. Talent Buzzer needs version 20 or newer."
  echo "The download page is opening in your browser. Install the new version, then double-click start.command again."
  echo
  open "https://nodejs.org/en/download"
  read -r -p "Press Enter to close this window."
  exit 1
fi

if [ ! -d node_modules/ws ]; then
  echo "Installing dependencies..."
  npm install --no-audit --no-fund
fi

node app.js
read -r -p "Talent Buzzer stopped. Press Enter to close this window."
