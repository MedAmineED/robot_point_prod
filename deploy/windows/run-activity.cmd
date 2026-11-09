@echo off
setlocal
rem Runs one job of robot\config\robot.json and appends its output to robot\logs\<job>.log.
rem Any job name is accepted: the robot itself rejects a name that is not configured.
set "ACTIVITY=%~1"
if "%ACTIVITY%"=="" goto usage
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
:usage
echo Usage: run-activity.cmd ^<job^>
echo   job: an "activity" of robot\config\robot.json, for example telco or conquest-energy
exit /b 1
