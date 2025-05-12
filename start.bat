@echo off
echo Starting AI Discord Manager...
echo.

:: Start Backend API Server
echo Starting Backend API Server...
start cmd /k "cd backend && .\venv\Scripts\python.exe -m uvicorn main:app --reload"

:: Wait a bit for backend to initialize
timeout /t 3 /nobreak >nul

:: Start Frontend
echo Starting Frontend Server...
start cmd /k "cd frontend && npm run dev"

echo.
echo Servers are starting up...
echo Backend will be available at http://localhost:8000
echo Frontend will be available at http://localhost:5173
echo.
echo Press any key to close this window...
pause >nul
