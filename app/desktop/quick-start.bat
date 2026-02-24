@echo off
REM Quick Start Script for PC Control Station Desktop App

cls
echo ===========================
echo PC Control Station - Desktop App
echo ===========================
echo.

REM Check if package.json exists
if not exist package.json (
    echo Error: package.json not found!
    echo Please run this script from app/desktop directory
    pause
    exit /b 1
)

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js not found!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Show version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Node.js %NODE_VERSION% found
echo.

REM Install dependencies
echo Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install dependencies
    pause
    exit /b 1
)
echo Dependencies installed successfully
echo.

REM Menu
:menu
cls
echo ===========================
echo PC Control Station
echo ===========================
echo.
echo 1. Development mode (Vite + Electron)
echo 2. Run production build
echo 3. Build for distribution
echo 4. Exit
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo Starting development mode...
    echo Note: Vite dev server will start on http://localhost:5173
    call npm run electron-dev
    goto menu
) else if "%choice%"=="2" (
    echo Building...
    call npm run build
    echo Starting Electron...
    call npm run electron
    goto menu
) else if "%choice%"=="3" (
    echo Building for distribution...
    call npm run dist
    echo Build complete! Check dist/ folder
    start .\dist
    goto menu
) else if "%choice%"=="4" (
    exit /b 0
) else (
    echo Invalid choice
    timeout /t 2 >nul
    goto menu
)
