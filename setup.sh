#!/usr/bin/env bash
# FinTrack — Linux / macOS Setup & Start Script
# Run from the project root: bash setup.sh

set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
RESET='\033[0m'

step()  { echo -e "\n${CYAN}>> $1${RESET}"; }
ok()    { echo -e "   ${GREEN}OK${RESET}  $1"; }
warn()  { echo -e "   ${YELLOW}WARN${RESET} $1"; }
fail()  { echo -e "   ${RED}ERR${RESET} $1"; exit 1; }

echo ""
echo -e "  ${BOLD}FinTrack — Setup & Start${RESET}"
echo -e "  ─────────────────────────"
echo ""

# ── 1. Check Node.js ───────────────────────────────────────────────────────
step "Checking Node.js..."

if ! command -v node &>/dev/null; then
    echo ""
    warn "Node.js not found. Choose one of the following to install it:"
    echo ""
    echo "  Option A — nvm (recommended, works on Linux and macOS):"
    echo "    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
    echo "    source ~/.bashrc   # or ~/.zshrc on zsh"
    echo "    nvm install --lts"
    echo ""
    echo "  Option B — Homebrew (macOS):"
    echo "    brew install node"
    echo ""
    echo "  Option C — apt (Ubuntu / Debian):"
    echo "    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -"
    echo "    sudo apt-get install -y nodejs"
    echo ""
    fail "Re-run this script after installing Node.js."
fi

NODE_VER=$(node --version)
NPM_VER=$(npm --version)
ok "Node.js $NODE_VER  /  npm $NPM_VER"

# Require Node 18+
MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$MAJOR" -lt 18 ]; then
    fail "Node.js 18 or higher is required. Found $NODE_VER. Update via nvm: nvm install --lts"
fi

# ── 2. Confirm project directory ───────────────────────────────────────────
step "Checking project directory..."

if [ ! -f "package.json" ]; then
    fail "package.json not found. Run this script from inside the fintrack/ folder."
fi
ok "$(pwd)"

# ── 3. Install app dependencies ────────────────────────────────────────────
step "Installing app dependencies..."

NEEDS_INSTALL=true
if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
    if [ "node_modules" -nt "package-lock.json" ]; then
        NEEDS_INSTALL=false
    fi
fi

if [ "$NEEDS_INSTALL" = true ]; then
    npm install
    ok "App dependencies installed."
else
    ok "node_modules is up to date — skipping install."
fi

# ── 4. Install proxy server dependencies ──────────────────────────────────
step "Installing proxy dependencies..."

PROXY_NEEDS_INSTALL=true
if [ -d "server/node_modules" ] && [ -f "server/package-lock.json" ]; then
    if [ "server/node_modules" -nt "server/package-lock.json" ]; then
        PROXY_NEEDS_INSTALL=false
    fi
fi

if [ "$PROXY_NEEDS_INSTALL" = true ]; then
    (cd server && npm install)
    ok "Proxy dependencies installed."
else
    ok "server/node_modules is up to date — skipping install."
fi

# ── 5. Start proxy server in the background ────────────────────────────────
step "Starting Open Finance Brasil proxy (port 3001)..."
npm run proxy &
PROXY_PID=$!
ok "Proxy running at http://localhost:3001 (PID $PROXY_PID)"

# Ensure proxy is killed when this script exits
trap "echo ''; echo 'Stopping proxy (PID $PROXY_PID)...'; kill $PROXY_PID 2>/dev/null || true" EXIT

# ── 6. Open browser & start dev server ────────────────────────────────────
step "Starting development server (port 5173)..."
echo ""
echo -e "  App:   ${BOLD}http://localhost:5173${RESET}"
echo -e "  Proxy: ${BOLD}http://localhost:3001/health${RESET}"
echo "  Press Ctrl+C to stop both servers."
echo ""

# Open browser in background (best-effort, don't fail if not available)
sleep 2 && {
    if command -v open &>/dev/null; then
        open "http://localhost:5173"
    elif command -v xdg-open &>/dev/null; then
        xdg-open "http://localhost:5173"
    fi
} &

npm run dev
