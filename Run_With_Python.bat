@echo off
title MAQ AUTO EDITOR ULTRA (Python)
color 0E
cd /d "%~dp0"
echo Starting MAQ Auto Editor with Python...
python launcher.py
if %ERRORLEVEL% NEQ 0 (
    py launcher.py
)
pause
