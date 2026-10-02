@echo off
setlocal EnableDelayedExpansion
title Engineering Memory - Startup

set "ROOT=C:\Users\Ajith Krishna Swamy\OneDrive\Desktop\Engineering Memory Tata\engineering-mem"
set "EM=%ROOT%\em"
set "VENV=%EM%\venv\Scripts\python.exe"
set "PIP=%EM%\venv\Scripts\pip.exe"
set "TOOLS=%ROOT%\tools"
set "TUNNEL_LOG=%ROOT%\tunnel.log"
set "LOCAL_IP=127.0.0.1"

echo ============================================================
echo   ENGINEERING MEMORY - starting all services
echo ============================================================

REM ---------- 1. Ollama ----------
netstat -ano | findstr /R /C:":11434 .*LISTENING" >nul
if errorlevel 1 (
    echo [1/5] Starting Ollama...
    where ollama >nul 2>&1
    if errorlevel 1 (
        echo [WARN] ollama.exe not found in PATH - start it manually.
    ) else (
        start "" /B ollama serve
        timeout /t 6 /nobreak >nul
    )
) else (
    echo [1/5] Ollama already running.
)

taskkill /IM llama-server.exe /F >nul 2>&1

curl -s -m 5 http://127.0.0.1:11434/api/tags | findstr /C:"qwen3:4b" >nul
if errorlevel 1 (
    echo [WARN] qwen3:4b not visible to Ollama - diagnosis will use fallback.
) else (
    echo [1/5] Ollama OK - qwen3:4b available.
)

REM ---------- 2. Install missing Python packages ----------
echo [2/5] Checking Python packages...
if exist "%PIP%" (
    "%VENV%" -c "import qrcode" >nul 2>&1
    if errorlevel 1 (
        echo        Installing qrcode and Pillow for QR image generation...
        "%PIP%" install qrcode Pillow --quiet
    ) else (
        echo [2/5] qrcode OK.
    )
) else (
    echo [WARN] pip not found - skipping package check.
)

REM ---------- 3. Backend (FastAPI, port 8000) ----------
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul
if errorlevel 1 (
    echo [3/5] Starting backend on port 8000...
    if not exist "%VENV%" (
        echo [ERROR] venv not found at %VENV%
        echo         Run: cd "%EM%" ^&^& python -m venv venv ^&^& venv\Scripts\pip install -r requirements.txt
        pause & exit /b 1
    )
    start "EM-Backend" /B "%VENV%" -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --app-dir "%EM%"
    echo        waiting for backend to start...
    timeout /t 20 /nobreak >nul
) else (
    echo [3/5] Backend already running.
)
curl -s -m 5 -o nul http://127.0.0.1:8000/api/health && echo [3/5] Backend OK: http://%LOCAL_IP%:8000 || echo [WARN] Backend health check failed - may still be loading.

REM ---------- 4. Cloudflare tunnel ----------
tasklist | findstr /I "cloudflared.exe" >nul
if errorlevel 1 (
    echo [4/5] Starting public tunnel...
    if exist "%TOOLS%\cloudflared.exe" (
        del /f /q "%TUNNEL_LOG%" >nul 2>&1
        start "" /B "%TOOLS%\cloudflared.exe" tunnel --url http://127.0.0.1:8000 --no-autoupdate --logfile "%TUNNEL_LOG%"
        echo        waiting for tunnel URL...
        timeout /t 14 /nobreak >nul
    ) else (
        echo [WARN] cloudflared.exe not found at %TOOLS% - no public link.
    )
) else (
    echo [4/5] Tunnel already running.
)

REM ---------- 5. Extract public URL and update .env for QR codes ----------
set "PUBLIC="
if exist "%TUNNEL_LOG%" (
    for /f "delims=" %%L in ('findstr "trycloudflare.com" "%TUNNEL_LOG%" 2^>nul') do set "LASTLINE=%%L"
    for /f "tokens=1,2,3,4,5 delims= |" %%A in ("!LASTLINE!") do (
        echo %%A | findstr /C:"https://" >nul && set "PUBLIC=%%A"
        echo %%B | findstr /C:"https://" >nul && set "PUBLIC=%%B"
        echo %%C | findstr /C:"https://" >nul && set "PUBLIC=%%C"
        echo %%D | findstr /C:"https://" >nul && set "PUBLIC=%%D"
        echo %%E | findstr /C:"https://" >nul && set "PUBLIC=%%E"
    )
)

REM Write public URL into .env so QR codes encode the correct public link
if defined PUBLIC (
    powershell -Command "(Get-Content '%EM%\.env') -replace 'EM_PUBLIC_BASE_URL=.*', 'EM_PUBLIC_BASE_URL=!PUBLIC!' | Set-Content '%EM%\.env'"
    echo [5/5] QR base URL set to !PUBLIC!
) else (
    echo [WARN] Public URL not found yet - QR codes will use local URL.
)

REM ---------- Open browser ----------
echo.
echo ============================================================
echo   LINKS
echo ============================================================
echo   LOCAL  :  http://%LOCAL_IP%:8000/diagnose
if defined PUBLIC (
    echo   PUBLIC :  !PUBLIC!/diagnose
    echo            (works from any device on any network)
    echo.
    echo   Opening diagnose page in browser...
    start "" "!PUBLIC!/diagnose"
) else (
    echo   PUBLIC :  not ready - re-run this file in 15 s
    echo.
    echo   Opening local diagnose page in browser...
    start "" "http://%LOCAL_IP%:8000/diagnose"
)
echo.
echo   QR code : %ROOT%\public_link_qr.png
echo   STOP    : %ROOT%\stop_all.bat
echo   PC must stay ON - it is the server.
echo ============================================================
pause
