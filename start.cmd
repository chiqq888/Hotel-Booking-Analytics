@echo off
setlocal
cd /d "%~dp0"
where node.exe >nul 2>&1
if errorlevel 1 (
  echo Node.js is required. Install Node.js 22.12 or newer, then run this file again.
  echo Download: https://nodejs.org/
  pause
  exit /b 1
)
node "%~dp0scripts\start.mjs" %*
set "launch_exit=%errorlevel%"
if not "%launch_exit%"=="0" if not "%launch_exit%"=="130" pause
exit /b %launch_exit%
