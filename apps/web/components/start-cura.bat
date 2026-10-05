@echo off
title Cura Health
echo.
echo   Starting Cura Health...
echo.

cd /d C:\Users\user\Desktop\clinic-two

echo   Starting API server...
start /min "Cura API" cmd /c "cd /d C:\Users\user\Desktop\clinic-two && pnpm --filter @cura/api dev"

timeout /t 5 /nobreak >nul

echo   Starting web server...
start /min "Cura Web" cmd /c "cd /d C:\Users\user\Desktop\clinic-two && pnpm --filter @cura/web dev"

timeout /t 10 /nobreak >nul

echo   Opening Cura Health in your browser...
start http://localhost:3000

echo.
echo   Cura Health is running.
echo   To stop it, run stop-cura.bat
echo.
pause