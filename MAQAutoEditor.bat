@echo off
title MAQ AUTO EDITOR ULTRA
color 0B

echo ===========================================================
echo       MAQ AUTO EDITOR ULTRA - WINDOWS LAUNCHER
echo ===========================================================
echo.

cd /d "%~dp0"

:: 1. Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Found Node.js runtime.
    echo Starting MAQ Auto Editor Ultra engine via Node.js...
    echo.
    echo Opening browser at http://localhost:4000
    echo (Keep this terminal window open while editing)
    echo.
    node launcher.js
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] Node.js encountered an error while running launcher.js.
        pause
    )
    goto :end
)

:: 2. Fallback: Check for Python
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Found Python runtime.
    echo Starting MAQ Auto Editor Ultra engine via Python...
    echo.
    echo Opening browser at http://localhost:4000
    echo (Keep this terminal window open while editing)
    echo.
    python launcher.py
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] Python encountered an error while running launcher.py.
        pause
    )
    goto :end
)

where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Found Python launcher.
    echo Starting MAQ Auto Editor Ultra engine via Python...
    echo.
    echo Opening browser at http://localhost:4000
    echo (Keep this terminal window open while editing)
    echo.
    py launcher.py
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] Python encountered an error while running launcher.py.
        pause
    )
    goto :end
)

:: 3. If neither runtime is detected
echo ===========================================================
echo [ACTION REQUIRED] Runtime not detected on your system.
echo ===========================================================
echo.
echo MAQ Auto Editor Ultra needs either Node.js or Python to run
echo the local editing server on your Windows PC.
echo.
echo Option A (Recommended):
echo Download and install Node.js from https://nodejs.org/ (LTS version)
echo.
echo Option B:
echo Download and install Python from https://www.python.org/
echo (Make sure to check "Add Python to PATH" during installation)
echo.
echo Once installed, double-click MAQAutoEditor.bat again!
echo.
pause

:end
