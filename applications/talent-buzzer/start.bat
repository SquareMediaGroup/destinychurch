@echo off
rem Talent Buzzer - same launcher on the LED screen machine and the Avolites machine.
rem A setup page opens in the browser where you choose which machine this is.
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm install --no-audit --no-fund
)
node app.js
pause
