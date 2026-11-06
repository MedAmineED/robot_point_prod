@echo off
setlocal
set "ACTIVITY=%~1"
if "%ACTIVITY%"=="telco" goto run
if "%ACTIVITY%"=="conquest-energy" goto run
echo Unknown activity. Use run-telco.cmd or run-energy.cmd.
exit /b 1
:run
cd /d "%~dp0..\..\robot"
if errorlevel 1 exit /b 1
if not exist "logs" mkdir "logs"
if not exist "logs" exit /b 1
set "NODE_EXE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE_EXE%" (
  echo Set NODE_EXE to your installed node.exe in run-activity.cmd.
  exit /b 1
)
echo [%date% %time%] Starting %ACTIVITY%>>"logs\%ACTIVITY%.log"
"%NODE_EXE%" --env-file=.env src/index.js --job "%ACTIVITY%" >>"logs\%ACTIVITY%.log" 2>&1
exit /b %errorlevel%
