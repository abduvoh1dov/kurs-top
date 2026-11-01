@echo off
chcp 65001 >nul
cd /d "%~dp0"
node --version
if errorlevel 1 (
  echo Node.js o'rnatilmagan. Node.js 22 LTS o'rnating.
  pause
  exit /b 1
)
npm install
pause
