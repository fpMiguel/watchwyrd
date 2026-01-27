@echo off
REM Clean restart for Windows

echo Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :7000 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8888 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul

timeout /t 2 /nobreak >nul

echo Starting mock server...
start /B node tests\load\mock-server.js > nul 2>&1

timeout /t 2 /nobreak >nul

echo Starting Watchwyrd with workers...
copy .env.load-test .env >nul
start /B cmd /c "set MOCK_MODE=true && node dist\index.js > nul 2>&1"

timeout /t 6 /nobreak >nul

echo Services started!
curl -s http://localhost:8888/health
curl -s http://localhost:7000/health

echo.
echo Ready to run load test!
