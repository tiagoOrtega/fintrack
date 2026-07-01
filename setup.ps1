# FinTrack — Windows Setup & Start Script
# Run from the project root: .\setup.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step { param([string]$msg) Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-OK   { param([string]$msg) Write-Host "   OK  $msg" -ForegroundColor Green }
function Write-Fail { param([string]$msg) Write-Host "   ERR $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "  FinTrack — Setup & Start" -ForegroundColor White
Write-Host "  ─────────────────────────" -ForegroundColor DarkGray
Write-Host ""

# ── 1. Refresh PATH so freshly installed tools are visible ─────────────────
$machinePath = [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
$userPath    = [System.Environment]::GetEnvironmentVariable("PATH", "User")
$env:PATH    = "$machinePath;$userPath"

# ── 2. Check / install Node.js ─────────────────────────────────────────────
Write-Step "Checking Node.js..."

$nodeOk = $null -ne (Get-Command node -ErrorAction SilentlyContinue)

if (-not $nodeOk) {
    Write-Host "   Node.js not found. Installing LTS via winget..." -ForegroundColor Yellow

    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $winget) {
        Write-Fail "winget not available. Install Node.js manually from https://nodejs.org then re-run this script."
        exit 1
    }

    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Node.js installation failed. Install it manually from https://nodejs.org"
        exit 1
    }

    $machinePath = [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
    $userPath    = [System.Environment]::GetEnvironmentVariable("PATH", "User")
    $env:PATH    = "$machinePath;$userPath"
}

$nodeVersion = node --version
$npmVersion  = npm --version
Write-OK "Node.js $nodeVersion  /  npm $npmVersion"

# ── 3. Confirm we are in the right directory ───────────────────────────────
Write-Step "Checking project directory..."

if (-not (Test-Path "package.json")) {
    Write-Fail "package.json not found. Run this script from inside the fintrack/ folder."
    exit 1
}
Write-OK (Get-Location).Path

# ── 4. Install React app dependencies ─────────────────────────────────────
Write-Step "Installing app dependencies..."

$needsInstall = $true
if (Test-Path "node_modules") {
    $lockTime    = (Get-Item "package-lock.json" -ErrorAction SilentlyContinue).LastWriteTime
    $modulesTime = (Get-Item "node_modules").LastWriteTime
    if ($lockTime -and $modulesTime -and $modulesTime -gt $lockTime) {
        $needsInstall = $false
    }
}

if ($needsInstall) {
    npm install
    if ($LASTEXITCODE -ne 0) { Write-Fail "npm install failed."; exit 1 }
    Write-OK "App dependencies installed."
} else {
    Write-OK "node_modules is up to date — skipping install."
}

# ── 5. Install proxy server dependencies ──────────────────────────────────
Write-Step "Installing proxy dependencies..."

$proxyNeedsInstall = $true
if (Test-Path "server\node_modules") {
    $lockTime    = (Get-Item "server\package-lock.json" -ErrorAction SilentlyContinue).LastWriteTime
    $modulesTime = (Get-Item "server\node_modules").LastWriteTime
    if ($lockTime -and $modulesTime -and $modulesTime -gt $lockTime) {
        $proxyNeedsInstall = $false
    }
}

if ($proxyNeedsInstall) {
    Push-Location "server"
    npm install
    if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Fail "Proxy npm install failed."; exit 1 }
    Pop-Location
    Write-OK "Proxy dependencies installed."
} else {
    Write-OK "server/node_modules is up to date — skipping install."
}

# ── 6. Start proxy server in a separate window ────────────────────────────
Write-Step "Starting Open Finance Brasil proxy (port 3001)..."
Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "title FinTrack Proxy && node server/proxy.js" `
    -WindowStyle Normal
Start-Sleep -Seconds 2
Write-OK "Proxy running at http://localhost:3001"

# ── 7. Open browser and start React dev server ────────────────────────────
Write-Step "Starting development server (port 5173)..."
Write-Host ""
Write-Host "  App:   http://localhost:5173" -ForegroundColor White
Write-Host "  Proxy: http://localhost:3001/health" -ForegroundColor White
Write-Host "  Press Ctrl+C in this window to stop the app." -ForegroundColor DarkGray
Write-Host ""

Start-Sleep -Seconds 1
Start-Process "http://localhost:5173"

npm run dev
