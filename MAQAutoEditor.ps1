# MAQ AUTO EDITOR ULTRA - PowerShell Launcher
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "       MAQ AUTO EDITOR ULTRA - WINDOWS LAUNCHER" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js not found. Please install Node.js v18+." -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}

# Check FFmpeg
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    $LocalBin = Join-Path $ScriptDir "bin"
    if (Test-Path (Join-Path $LocalBin "ffmpeg.exe")) {
        $env:PATH = "$LocalBin;$env:PATH"
        Write-Host "[INFO] Loaded local FFmpeg from $LocalBin" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] FFmpeg is not found in PATH or bin directory." -ForegroundColor Yellow
    }
}

Write-Host "Starting local editing engine..." -ForegroundColor Green
node (Join-Path $ScriptDir "launcher.js")
