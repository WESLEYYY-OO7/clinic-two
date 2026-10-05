
@echo off
echo   Stopping Cura Health...
taskkill /F /IM node.exe >nul 2>&1
echo   Stopped.
timeout /t 2 /nobreak >nul