@echo off

echo Starting FastAPI backend on http://localhost:8000...
cd server

REM Activate virtual environment
call .venv\Scripts\activate

REM Start backend in a new window (with venv)
start "FastAPI Backend" cmd /k "call .venv\Scripts\activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

REM Wait a bit for backend to boot
timeout /t 3 >nul

echo Starting Next.js frontend on http://localhost:3000...
cd ..\clients

REM Start frontend
start "Next.js Frontend" cmd /k npm run start

echo Both servers started!
pause