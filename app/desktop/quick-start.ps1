#!/usr/bin/env pwsh
# Quick Start Script for PC Control Station Desktop App

Write-Host "=== PC Control Station - Desktop App ===" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found! Please run this script from app/desktop directory" -ForegroundColor Red
    exit 1
}

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
Write-Host "✅ Node.js $nodeVersion found" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Show menu
Write-Host "Select an option:" -ForegroundColor Cyan
Write-Host "1. Run in development mode (Vite + Electron)"
Write-Host "2. Run Electron only (production build)"
Write-Host "3. Build for distribution"
Write-Host "4. Install from dist/ exe"
Write-Host ""

$choice = Read-Host "Enter your choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host "Starting development mode..." -ForegroundColor Yellow
        Write-Host "Note: Vite dev server will start on http://localhost:5173" -ForegroundColor Cyan
        npm run electron-dev
    }
    "2" {
        Write-Host "Running production build first..." -ForegroundColor Yellow
        npm run build
        Write-Host "Starting Electron app..." -ForegroundColor Yellow
        npm run electron
    }
    "3" {
        Write-Host "Building for distribution..." -ForegroundColor Yellow
        npm run dist
        Write-Host "✅ Build complete! Check dist/ folder" -ForegroundColor Green
        Start-Process ".\dist"
    }
    "4" {
        Write-Host "Looking for installers..." -ForegroundColor Yellow
        $exeFile = Get-ChildItem ".\dist\*.exe" | Select-Object -First 1
        if ($exeFile) {
            Write-Host "Found: $($exeFile.Name)" -ForegroundColor Green
            & $exeFile.FullName
        } else {
            Write-Host "❌ No .exe file found. Please build first with option 3" -ForegroundColor Red
        }
    }
    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
        exit 1
    }
}
