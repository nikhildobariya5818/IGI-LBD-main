@echo off
title Start GIA Reports

REM Go to the project root (where this .bat file is)
cd /d "%~dp0"

echo Starting FastAPI Backend...
start "FastAPI Backend" cmd /k "uvicorn main:app --reload --host 0.0.0.0 --port 8000"

REM Wait a few seconds
timeout /t 3 >nul

echo Starting Next.js Frontend...
cd /d "%~dp0clients"

start "Next.js Frontend" cmd /k "npm run start"

echo.
echo ==========================================
echo Backend : http://localhost:8000
echo Frontend: http://localhost:3000
echo ==========================================
pause