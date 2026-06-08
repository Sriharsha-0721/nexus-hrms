@echo off
title Nexus HRMS Runner
echo ==================================================
echo  Starting Nexus HRMS Application Suite
echo ==================================================
echo.

:: Detect Server Directory
if exist "server" (
    set SERVER_DIR=server
) else if exist "nexus-server" (
    set SERVER_DIR=nexus-server
) else (
    echo [ERROR] Server directory not found. Tried server and nexus-server
    goto error
)

:: Detect Client Directory
if exist "hrms" (
    set CLIENT_DIR=hrms
) else if exist "nexus-hrms" (
    set CLIENT_DIR=nexus-hrms
) else (
    echo [ERROR] Client directory not found. Tried hrms and nexus-hrms
    goto error
)

:: Start Backend API Server
echo [INFO] Launching Server API in a new window (folder: %SERVER_DIR%)...
start "Nexus Server API" cmd /k "cd %SERVER_DIR% && npm run dev"

:: Start Frontend Client App
echo [INFO] Launching Frontend Client in a new window (folder: %CLIENT_DIR%)...
start "Nexus HRMS Client" cmd /k "cd %CLIENT_DIR% && npm run dev"

echo.
echo ==================================================
echo [SUCCESS] Both windows spawned! 
echo Close this launcher window.
echo ==================================================
timeout /t 5
exit /b 0

:error
echo.
echo [FAIL] Setup could not start the services. Please verify folder names.
pause
exit /b 1
