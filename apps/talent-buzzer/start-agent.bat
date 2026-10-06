@echo off
rem Avolites agent - run this on the Titan PC.
rem Set HUB to the LED screen machine's IP address (shown when the hub starts).
rem Set KEY only if you set "key" in the hub's config.json.
set HUB=192.168.1.50:8080
set KEY=

cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm install --no-audit --no-fund
)
node agent\avolites-agent.js %HUB% --key=%KEY%
pause
