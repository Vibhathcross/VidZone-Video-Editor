@echo off
title VidZone Launcher
cd /d "C:\Users\USER\.gemini\antigravity\scratch\sleek-video-creator"

:: Check if port 5173 is already active
netstat -ano | findstr LISTENING | findstr :5173 >nul
if %errorlevel% equ 0 (
    echo VidZone is already running. Opening window...
) else (
    echo Starting VidZone dev server...
    start /b npm run dev >nul 2>&1
    :: Give the dev server 2.5 seconds to start up
    timeout /t 3 /nobreak >nul
)

:: Try to launch Chrome in app mode (frameless client-side UI)
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:5173
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --app=http://localhost:5173
) else (
    :: Fallback to default browser
    start http://localhost:5173
)

exit
