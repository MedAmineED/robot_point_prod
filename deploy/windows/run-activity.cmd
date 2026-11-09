@echo off
rem Runs one job of robot\config\robot.json: run-activity.cmd <job>, for example telco or conquest-energy.
rem The work is done by run-activity.ps1, which shows the robot's output in this window and appends it
rem to robot\logs\<job>.log. Any job name is accepted: the robot itself rejects one that is not configured.
if "%~1"=="" goto usage
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-activity.ps1" -Job "%~1"
exit /b %errorlevel%
:usage
echo Usage: run-activity.cmd ^<job^>
echo   job: an "activity" of robot\config\robot.json, for example telco or conquest-energy
exit /b 1
