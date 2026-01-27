@echo off
REM Optimized Baseline Test Runner for Windows
REM Starts all required services and runs the load test

setlocal enabledelayedexpansion

echo ================================================
echo   Watchwyrd Optimized Baseline Load Test
echo ================================================
echo.

set MOCK_SERVER_PORT=8888
set WATCHWYRD_PORT=7000
set SECRET_KEY=test-secret-key

REM Step 1: Start Mock Server
echo [1/4] Starting mock API server on port %MOCK_SERVER_PORT%...
start /B node tests\load\mock-server.js > mock-server.log 2>&1
timeout /t 3 /nobreak >nul
echo Mock server started
echo.

REM Step 2: Start Watchwyrd Server
echo [2/4] Starting Watchwyrd server on port %WATCHWYRD_PORT%...
set MOCK_MODE=true
start /B node dist\index.js > watchwyrd-server.log 2>&1
timeout /t 4 /nobreak >nul
echo Watchwyrd server started
echo.

REM Step 3: Verify HTTP Interception
echo [3/4] Verifying HTTP request interception...
node tests\load\test-interception.js
if errorlevel 1 (
    echo ERROR: HTTP interception verification failed
    goto cleanup
)
echo HTTP interception verified
echo.

REM Step 4: Run Baseline Test
echo [4/4] Running baseline load test...
echo   Concurrent users: 200
echo   Ramp-up: 30s ^| Sustained: 120s ^| Ramp-down: 15s
echo   Total duration: ~165 seconds
echo.

node tests\load\baseline-test.js

echo.
echo ================================================
echo   Test Complete!
echo ================================================
echo.
echo Results saved to: BASELINE_RESULTS.md
echo Server logs:
echo   - Mock server: mock-server.log
echo   - Watchwyrd: watchwyrd-server.log
echo.
echo Press any key to stop servers and exit...
pause >nul

:cleanup
echo.
echo Cleaning up...
taskkill /F /FI "WINDOWTITLE eq mock-server*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq watchwyrd*" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8888') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :7000') do taskkill /F /PID %%a >nul 2>&1
echo Cleanup complete
