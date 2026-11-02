@echo off
setlocal
cd /d "%~dp0"

if "%BACKEND_URL%"=="" (
  echo.
  echo Nie ustawiono BACKEND_URL.
  echo Ustaw go raz w PowerShell i otworz ten plik ponownie:
  echo.
  echo   setx BACKEND_URL "http://truenas-scale-1.tail9c1f91.ts.net:8000"
  echo.
  pause
  exit /b 1
)

if not exist "dist\index.html" (
  echo Brak dist\index.html. Zbuduj aplikacje: npm run build
  pause
  exit /b 1
)

where python >nul 2>nul
if errorlevel 1 (
  echo Nie znaleziono Pythona w PATH.
  pause
  exit /b 1
)

echo Backend API: %BACKEND_URL%
echo.

tailscale serve --bg 8080
python scripts\serve.py

pause
