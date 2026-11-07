@echo off
rem Talent Buzzer - same launcher on the LED screen machine and the Avolites machine.
rem A setup page opens in the browser where you choose which machine this is.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed on this computer yet.
  echo The download page is opening in your browser. Install Node.js, then double-click start.bat again.
  echo.
  start "" "https://nodejs.org/en/download"
  pause
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"
if errorlevel 1 (
  echo.
  echo This computer has an old version of Node.js. Talent Buzzer needs version 20 or newer.
  echo The download page is opening in your browser. Install the new version, then double-click start.bat again.
  echo.
  start "" "https://nodejs.org/en/download"
  pause
  exit /b 1
)
if not exist node_modules\ws (
  echo Installing dependencies...
  call npm install --no-audit --no-fund
)
node app.js
pause
