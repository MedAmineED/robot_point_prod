# Runs one job of robot\config\robot.json, for a Windows scheduled task or by hand:
#   powershell -NoProfile -ExecutionPolicy Bypass -File run-activity.ps1 -Job telco
# Every line the robot prints is shown in the window AND appended to robot\logs\<job>.log,
# so a task's window is never silently empty. The exit code is the robot's (0 = finished).
param([Parameter(Mandatory = $true)][string]$Job)

$ErrorActionPreference = 'Stop'
$robot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\robot')).Path
Set-Location $robot
New-Item -ItemType Directory -Force -Path 'logs' | Out-Null
$log = Join-Path $robot "logs\$Job.log"

function Write-Line([string]$text) {
  Write-Host $text
  Add-Content -Path $log -Value $text -Encoding UTF8
}

# The same Node as a terminal (PATH) first; NODE_EXE or the default install path otherwise.
$node = $env:NODE_EXE
if (-not $node) { $node = (Get-Command node -ErrorAction SilentlyContinue).Source }
if (-not $node) { $node = 'C:\Program Files\nodejs\node.exe' }
if (-not (Test-Path $node)) {
  Write-Line "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Node.js not found. Install it or set NODE_EXE to node.exe."
  exit 1
}

Write-Line "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Starting $Job with $node ($(& $node -v))"

# Node's error stream is merged and turned into plain text lines (no PowerShell error decoration).
$ErrorActionPreference = 'Continue'
& $node --env-file=.env src/index.js --job $Job 2>&1 | ForEach-Object { Write-Line "$_" }
$code = $LASTEXITCODE

Write-Line "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Finished $Job, exit code $code"
exit $code
