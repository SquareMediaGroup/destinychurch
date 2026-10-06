@echo off
rem Talent buzzer hub - run this on the LED screen machine.
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm install --no-audit --no-fund
)
node hub\server.js
pause
