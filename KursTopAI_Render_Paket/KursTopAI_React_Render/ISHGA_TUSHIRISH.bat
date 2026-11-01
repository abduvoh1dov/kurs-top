@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js topilmadi. Avval Node.js 22 LTS o'rnating.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Kerakli React paketlari o'rnatilmoqda...
  call npm install
  if errorlevel 1 (
    echo Paketlarni o'rnatishda xato. Internet va npm sozlamasini tekshiring.
    pause
    exit /b 1
  )
)
start "KursTopAI API" cmd /k "cd /d ""%~dp0"" && npm run server"
echo React frontend ishga tushmoqda. Brauzer: http://localhost:5173
call npm run dev
pause
