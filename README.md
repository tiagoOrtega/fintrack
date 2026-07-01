# FinTrack — Personal Finance Manager

A client-side web application for tracking investment portfolios and personal expenses.
Supports optional **Google Sheets** remote backup and **Open Finance Brasil** bank integration.
All personal data is stored locally in the browser — no backend account required.

---

## Quick Start (single command)

Clone or copy the project folder, then run the setup script for your OS.
The script installs Node.js if missing, installs all dependencies, starts both servers, and opens the browser.

### Windows (PowerShell)

```powershell
cd fintrack
.\setup.ps1
```

> If you get an execution policy error, run this first:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

### Linux / macOS (Bash)

```bash
cd fintrack
chmod +x setup.sh
bash setup.sh
```

The app opens automatically at **http://localhost:5173**.  
The Open Finance proxy starts on **http://localhost:3001**.  
Press `Ctrl+C` to stop both servers.

> On subsequent runs the scripts skip `npm install` if `node_modules` is already up to date.

---

## Manual Setup (step by step)

### 1. Install Node.js (v18 or higher)

```bash
node --version   # check if already installed
npm --version
```

| OS | Method |
|---|---|
| Windows | `winget install OpenJS.NodeJS.LTS` or https://nodejs.org |
| macOS | `brew install node` or https://nodejs.org |
| Ubuntu/Debian | `curl -fsSL https://deb.nodesource.com/setup_lts.x \| sudo -E bash - && sudo apt-get install -y nodejs` |
| Any OS | `nvm install --lts` via [nvm](https://github.com/nvm-sh/nvm) |

### 2. Install dependencies

```bash
npm install                          # React app
cd server && npm install && cd ..    # OFB proxy
```

### 3. Configure environment (optional features)

```bash
cp .env.example .env
# Edit .env — add VITE_GOOGLE_CLIENT_ID and/or VITE_OFB_CLIENT_ID
```

### 4. Start both servers

```bash
# Terminal 1 — Open Finance proxy (port 3001)
npm run proxy

# Terminal 2 — React dev server (port 5173)
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## All Available Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start React dev server with hot reload at http://localhost:5173 |
| `npm run proxy` | Start Open Finance Brasil proxy at http://localhost:3001 |
| `npm run proxy:dev` | Start proxy with `--watch` (auto-restarts on file changes) |
| `npm run build` | Compile and bundle for production into `dist/` |
| `npm run preview` | Serve the production build locally at http://localhost:4173 |
| `npx tsc --noEmit` | Type-check the project without building |

---

## Google Sheets Backup

Connect your Google account to automatically save a live copy of all your data — investments, expenses, and settings — to a Google Spreadsheet in your Google Drive. Every change syncs 1.5 seconds after you make it.

### One-time Google Cloud setup

1. Open [Google Cloud Console](https://console.cloud.google.com) and create or select a project
2. Go to **APIs & Services → Library**, search for **Google Sheets API** and click **Enable**
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Choose application type: **Desktop app** — give it a name (e.g. `FinTrack`)
5. Click **Create** and copy the **Client ID** shown
6. Back in the credential detail page, add these **Authorized redirect URIs**:
   - `http://localhost:5173/settings`
7. Add this **Authorized JavaScript origin**:
   - `http://localhost:5173`
8. Paste the client ID into your `.env` file:

```env
VITE_GOOGLE_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
```

9. Restart the dev server: `npm run dev`

### Connecting in the app

1. Go to **Settings** in the sidebar
2. Under **Google Sheets Backup**, click **Sign in with Google**
3. Approve access in the Google popup — you are redirected back automatically
4. A new spreadsheet named **FinTrack Data** is created in your Drive
5. All future changes sync automatically; click **Sync Now** to push immediately

### What gets synced

The spreadsheet has three tabs:

| Tab | Contents |
|---|---|
| **Investments** | All portfolio positions with purchase/current price, quantity, broker |
| **Expenses** | All expense records with category, amount, date |
| **Settings** | Base currency, goals, connected bank count, last-updated timestamp |

### Storage behaviour

- **localStorage** is always the primary store — the app works fully offline
- **Google Sheets** is a live remote copy — every mutation triggers an auto-sync
- If a sync fails (token expired, network error), a message appears in Settings and you can reconnect

### Environment variable

| Variable | Where | Required | Description |
|---|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | `.env` (project root) | For Google Sheets | OAuth 2.0 client ID from Google Cloud |

---

## Open Finance Brasil Integration

FinTrack can connect to any Brazilian bank in the **Open Finance Brasil** directory (Resolução BCB n° 32/2020) to automatically import accounts, transactions, credit cards, and investments.

### How it works

1. Go to **Banks** in the sidebar and click **Connect a bank**
2. Search for your bank and choose which data scopes to share (accounts, credit cards, investments)
3. You are redirected to your bank's secure login page to grant consent
4. After approval you are redirected back and your data syncs automatically
5. Balances and transactions refresh whenever you click **Sync** on the bank card

### Proxy server

Bank APIs require a backend proxy because they block direct browser access (CORS) and production environments require mTLS client certificates.

The proxy (`server/proxy.js`) runs on **port 3001** and handles:
- OIDC discovery forwarding
- OAuth 2.0 token exchange (authorization_code and refresh_token)
- Consent creation (OFB Consents v2)
- All bank API proxying with required FAPI headers

### Environment variables

Create a `.env` in the project root:

```env
VITE_OFB_CLIENT_ID=your-client-id-here   # OAuth client from OFB directory
VITE_PROXY_URL=http://localhost:3001       # default, change only if proxy port differs
```

Create a `server/.env` for the proxy:

```env
PORT=3001

# mTLS certificates — production only, leave unset for sandbox mode
OFB_CERT_PATH=/path/to/client.crt
OFB_KEY_PATH=/path/to/client.key
OFB_CA_PATH=/path/to/ca-bundle.crt
```

### Sandbox vs. production

| Mode | mTLS | OAuth client | Bank APIs |
|---|---|---|---|
| **Sandbox** | Not required | `fintrack-client` (default) | Sandbox URLs from each bank |
| **Production** | Required | Registered in OFB directory | Live bank APIs |

For production, register in the [OFB Participant Directory](https://web.directory.openbankingbrasil.org.br) and obtain mTLS certificates from a qualified Brazilian CA.

### Supported data scopes

| Scope group | What it imports |
|---|---|
| Accounts | Checking/savings balances + debit transactions → Expenses |
| Credit Cards | Card balances, limits + purchase transactions → Expenses |
| Investments | Stocks, CDBs, LCIs, Tesouro Direto → Investments |

---

## Project Structure

```
fintrack/
├── .env.example                Environment variable reference (copy to .env)
├── setup.ps1                   Windows: full setup + start (single command)
├── setup.sh                    Linux/macOS: full setup + start (single command)
├── server/                     Open Finance Brasil proxy server
│   ├── proxy.js                Express proxy (port 3001): mTLS, token exchange, consent
│   └── package.json            Server dependencies (express, cors, node-fetch)
├── public/                     Static assets served as-is
├── src/
│   ├── components/             Shared UI components
│   │   ├── Badge.tsx           Coloured label chips (type, category, frequency)
│   │   ├── BankCard.tsx        Connected bank card with sync/disconnect actions
│   │   ├── BankConnectWizard.tsx  3-step wizard: select bank → choose scopes → redirect
│   │   ├── ExpenseForm.tsx     Add/edit expense modal form
│   │   ├── InvestmentForm.tsx  Add/edit investment modal form
│   │   ├── Layout.tsx          App shell with sidebar navigation
│   │   ├── Modal.tsx           Generic modal wrapper
│   │   ├── PageHeader.tsx      Page title + optional action button
│   │   └── StatCard.tsx        Dashboard metric card
│   ├── context/
│   │   └── StoreContext.tsx    React Context — exposes store + Google Sheets state
│   ├── hooks/
│   │   ├── useStore.ts         All CRUD operations + localStorage read/write
│   │   └── useGoogleSheets.ts  Google Sheets connection, token management, auto-sync
│   ├── pages/
│   │   ├── Banks.tsx           Bank connection list + OAuth callback handler
│   │   ├── Dashboard.tsx       Overview: stats, allocation pie, recent activity
│   │   ├── Investments.tsx     Portfolio table with add/edit/delete
│   │   ├── Expenses.tsx        Expense table with category filter and CRUD
│   │   ├── Reports.tsx         Bar + pie charts for expenses and portfolio
│   │   └── Settings.tsx        Currency, goals, Google Sheets backup, data management
│   ├── services/
│   │   ├── googleSheets/
│   │   │   ├── auth.ts         PKCE OAuth 2.0 flow direct to Google (no proxy needed)
│   │   │   ├── api.ts          Sheets API v4: createSpreadsheet, batchUpdateValues
│   │   │   └── sync.ts         Serialises investments/expenses/settings to row arrays
│   │   └── openBanking/
│   │       ├── api.ts          OFB API calls (accounts, cards, investments) via proxy
│   │       ├── banks.ts        Bank directory: KNOWN_BANKS + live OFB directory fetch
│   │       ├── oauth.ts        PKCE flow, authorization redirect, token exchange
│   │       ├── pkce.ts         PKCE verifier/challenge generation (Web Crypto API)
│   │       └── sync.ts         Maps OFB data → FinTrack Investment/Expense models
│   ├── types/
│   │   ├── googleSheets.ts     GoogleSheetsConfig type + storage key constant
│   │   ├── index.ts            TypeScript interfaces: Investment, Expense, AppSettings
│   │   └── openBanking.ts      OFB API types: banks, consents, accounts, transactions
│   ├── utils/
│   │   ├── calculations.ts     P&L, monthly totals, allocation, savings rate
│   │   └── format.ts           Currency, percent, and date formatting helpers
│   ├── App.tsx                 Route definitions
│   ├── index.css               Tailwind v4 entry point + theme tokens
│   └── main.tsx                React app entry point
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Data Storage

### Local (always active)

All data is saved in **`window.localStorage`** under key `fintrack_data`:

```json
{
  "investments":    [...],
  "expenses":       [...],
  "settings":       { "baseCurrency": "BRL", "monthlyIncomeGoal": 0, "savingsGoal": 0 },
  "connectedBanks": [...]
}
```

Google Sheets connection config is stored separately under key `fintrack_gs_config` and contains the access/refresh tokens, spreadsheet ID, and last sync timestamp. Tokens never leave your machine except when communicating with Google's own OAuth and Sheets endpoints.

To inspect: DevTools → Application → Local Storage → `http://localhost:5173`.  
To clear: **Settings → Clear All Data**.

### Remote (Google Sheets — optional)

When connected, data is written to three tabs in a spreadsheet named **FinTrack Data** in your personal Google Drive. The spreadsheet is created automatically on first connect.

---

## First-Time Setup in the App

1. Open the app at http://localhost:5173
2. Go to **Settings** → set your base currency and monthly income goal
3. *(Optional)* Go to **Settings → Google Sheets Backup** → **Sign in with Google** to enable remote sync
4. Go to **Investments** → add portfolio positions manually, or connect a bank via **Banks**
5. Go to **Expenses** → add monthly costs manually, or let bank sync import transactions
6. Return to **Dashboard** — your financial overview is populated

---

## Troubleshooting

### `node` or `npm` not found after installation on Windows

Close and reopen the terminal. If it persists:

```powershell
[System.Environment]::GetEnvironmentVariable("PATH", "Machine") -split ";" | Select-String "node"
```

### PowerShell script blocked by execution policy

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Port 5173 already in use

```bash
npm run dev -- --port 3000
```

### Port 3001 (proxy) already in use

```bash
PORT=3002 npm run proxy
# Also set VITE_PROXY_URL=http://localhost:3002 in your .env
```

### Google Sheets — "Sign in with Google" button does nothing

Ensure `VITE_GOOGLE_CLIENT_ID` is set in `.env` and the dev server was restarted after adding it.

### Google Sheets — OAuth error after redirect

Check that `http://localhost:5173/settings` is listed as an Authorized redirect URI in your Google Cloud credential. The URI must match exactly (no trailing slash).

### Google Sheets — token expired, sync stopped

Go to **Settings → Disconnect** and reconnect. A new spreadsheet is created; copy any manual data from the old one if needed.

### Proxy not running — bank connection fails

```bash
npm run proxy
```

The app works fully without the proxy for manual tracking and Google Sheets sync.

### Build fails with TypeScript errors

```bash
npx tsc --noEmit
```

All type-only imports must use `import type { ... }` — the project uses `verbatimModuleSyntax`.

### Blank page after opening `dist/index.html` directly

The app uses client-side routing. Use `npm run preview` instead of opening the file directly.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | React | 19 |
| Language | TypeScript | 6 |
| Build tool | Vite | 8 |
| CSS | Tailwind CSS | v4 |
| Routing | react-router-dom | 7 |
| Charts | Recharts | latest |
| Forms | react-hook-form | latest |
| Icons | lucide-react | latest |
| Date utils | date-fns | latest |
| State | React Context + useState | — |
| Persistence | localStorage (primary) + Google Sheets (optional remote) | — |
| Google Sheets | OAuth 2.0 + PKCE, Sheets API v4 | Desktop app credentials |
| Open Finance | OAuth 2.0 + PKCE (FAPI 1.0), OFB APIs v1–v2 | OFB standard |
| Proxy server | Express + node-fetch | Node.js 18+ |
