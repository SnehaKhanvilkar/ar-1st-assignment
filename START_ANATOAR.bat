@echo off
cd /d "%~dp0"
title AnatoAR local server
set PY=
where python >nul 2>nul && set PY=python
if "%PY%"=="" where py >nul 2>nul && set PY=py -3
if "%PY%"=="" (
  echo ERROR: Python was not found.
  echo Install it from https://www.python.org/downloads/ and tick "Add python.exe to PATH", then run this file again.
  pause
  exit /b 1
)
if not exist "index.html" (
  echo ERROR: index.html not found. Extract the ZIP first, then run this file from the extracted AnatoAR folder.
  pause
  exit /b 1
)
set PORT=8000
:findport
netstat -ano | find ":%PORT% " | find "LISTENING" >nul
if %errorlevel%==0 (
  set /a PORT+=1
  if %PORT% GTR 8020 (
    echo ERROR: No free port between 8000 and 8020. Close other programs and try again.
    pause
    exit /b 1
  )
  goto findport
)
echo.
echo  AnatoAR is starting at http://localhost:%PORT%
echo  Only this computer can open it (not exposed to the internet).
echo  Standard 3D demo: works now. Real AR: open the AR Scanner page and allow the camera.
echo  Close this window to stop the server.
echo.
start "" cmd /c "timeout /t 2 >nul & start http://localhost:%PORT%"
%PY% -m http.server %PORT% --bind 127.0.0.1
pause
