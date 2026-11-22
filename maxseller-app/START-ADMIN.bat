@echo off
chcp 65001 >nul
title MaxSeller - Admin dashboard
cd /d "%~dp0"

echo.
echo  ============================================
echo   MaxSeller ishga tushirilmoqda...
echo  ============================================
echo.
echo   Admin : http://127.0.0.1:5173/admin.html
echo   Do'kon: http://127.0.0.1:5173/
echo   API   : http://127.0.0.1:3001
echo.
echo   Telefondan (Wi-Fi bir xil bolishi kerak):
echo   http://PC-IP:5173/admin.html   (IP ni ipconfig bilan toping)
echo.
echo   To'xtatish uchun: CTRL+C
echo.

start "" powershell -NoProfile -Command "Start-Sleep -Seconds 9; Start-Process 'http://127.0.0.1:5173/admin.html'"

call npm run dev

echo.
echo Server to'xtatildi.
pause
