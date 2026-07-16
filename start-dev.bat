@echo off
title Guru Cerdas - Launcher
cls

echo ===================================================
echo             STARTING GURU CERDAS APP
echo ===================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/ first.
    echo.
    pause
    exit /b 1
)

:: Check if node_modules exists, run npm install if missing
if not exist "node_modules\" (
    echo [INFO] node_modules not found. Installing dependencies...
    echo This may take a few minutes...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
      )
)

echo [INFO] Starting development server...
echo URL: http://localhost:5173
echo.

:: Start the dev server
call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Application crashed or stopped unexpectedly.
    pause
)
