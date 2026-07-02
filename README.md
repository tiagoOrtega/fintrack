# FinTrack — Personal Finance Manager

A self-hosted web application for tracking investment portfolios and personal expenses.
Supports **login** (self-hosted email/password accounts or "Continue with Google"),
optional **Google Sheets** remote backup, and **Open Finance Brasil** bank integration.
Financial data is stored locally in the browser, namespaced per account; login accounts
themselves are stored server-side in the proxy, which is required to run the app.

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
The proxy (required for login) starts on **http://localhost:3001**.  
Press `Ctrl+C` to stop both servers.

> On subsequent runs the scripts skip `npm install` if `node_modules` is already up to date.

The proxy is required — it checks passwords and issues login sessions, so the app can no
longer run standalone the way earlier versions did. On first run, set `JWT_SECRET` in
`.env` (see [Login](#login) below) or accept the auto-generated development secret the
proxy warns about on startup.

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

### 3. Configure environment

```bash
cp .env.example .env
# Generate a login secret and add it:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# Edit .env — set JWT_SECRET, and add VITE_GOOGLE_CLIENT_ID / VITE_OFB_CLIENT_ID for optional features
```

`JWT_SECRET` is the only variable actually required to run the app — without it the proxy
generates a random one at startup, but every restart invalidates all login sessions.

### 4. Start both servers

```bash
# Terminal 1 — proxy: login, Open Finance Brasil relay (port 3001)
npm run proxy

# Terminal 2 — React dev server (port 5173)
npm run dev
```

Open **http://localhost:5173** in your browser and create an account.

---

## All Available Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start React dev server with hot reload at http://localhost:5173 |
| `npm run proxy` | Start the proxy (login backend + Open Finance Brasil relay) at http://localhost:3001 — required for login |
| `npm run proxy:dev` | Start proxy with `--watch` (auto-restarts on file changes) |
| `npm run build` | Compile and bundle for production into `dist/` |
| `npm run preview` | Serve the production build locally at http://localhost:4173 |
| `npx tsc --noEmit` | Type-check the project without building |

---

## Login

FinTrack requires signing in — either with a self-hosted email/password account, or
"Continue with Google." The proxy server (`server/proxy.js`) hosts the login backend;
it must be running for anyone to sign in.

### Self-hosted accounts

Password accounts are created directly in the app (**Create account** on the login
screen) — there's no admin step needed. Passwords are hashed with bcrypt and stored in
`server/data/users.json` (gitignored; never commit it). Multiple people can register
separate accounts on the same deployment.

### "Continue with Google"

Signing in with Google reuses the same OAuth client and flow as **Google Sheets Backup**
below — it verifies your identity *and* connects Sheets backup in one step. It requires
`VITE_GOOGLE_CLIENT_ID` to be configured (see the Google Sheets Backup section) and the
Google Cloud OAuth client's authorized redirect URIs must include **both**:

- `http://localhost:5173/login` (login)
- `http://localhost:5173/settings` (reconnecting Sheets backup later without logging out)

### Account linking

A password account and a Google account that share the same email address are treated
as the same account (linked automatically). This is convenient — sign up with a
password, then later use "Continue with Google" with that email, and you land back in
the same account — but note it relies on trusting whoever registers an email first,
since password signups aren't email-verified. For a small, trusted self-hosted
deployment this is an accepted tradeoff; don't expose registration to untrusted users
without addressing this.

### Environment variables

| Variable | Where | Required | Description |
|---|---|---|---|
| `JWT_SECRET` | `.env` (project root) | Recommended | Signs login sessions. Auto-generated (and warned about) if unset — sessions reset every proxy restart. |
| `JWT_EXPIRES_IN` | `.env` (project root) | No | How long a session lasts before requiring re-login. Default `30d`. |
| `VITE_GOOGLE_CLIENT_ID` | `.env` (project root) | For Google login | Same client ID used by Google Sheets Backup; also read server-side to verify Google login tokens. |

### Data isolation between accounts

Each account's financial data and Google Sheets connection are namespaced by user ID in
localStorage (see [Data Storage](#data-storage)) — multiple accounts on the same browser
don't see each other's data. Login sessions and financial data are otherwise independent:
logging in from a second browser/device starts with an empty local dataset under that
account (there's no server-side sync of financial data, only of accounts themselves).

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
   - `http://localhost:5173/login` (used by "Continue with Google" login)
   - `http://localhost:5173/settings` (used when reconnecting Sheets backup from Settings)
7. Add this **Authorized JavaScript origin**:
   - `http://localhost:5173`
8. Paste the client ID into your `.env` file:

```env
VITE_GOOGLE_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
```

9. Restart both servers so the proxy also picks up the new client ID (used to verify
   Google login tokens): `npm run proxy` and `npm run dev`

### Connecting in the app

**Option A — sign in with Google (also sets up backup):** on the login screen, click
**Continue with Google**. This authenticates you *and* connects Sheets backup in one step.

**Option B — connect backup separately:** if you're already logged in with a
password account,
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

The proxy loads the same root `.env` as the React app (via `dotenv`) — one file for both:

```env
VITE_OFB_CLIENT_ID=your-client-id-here   # OAuth client from OFB directory
VITE_PROXY_URL=http://localhost:3001       # default, change only if proxy port differs

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
├── server/                     Proxy server: login backend + Open Finance Brasil relay
│   ├── proxy.js                Express app (port 3001): mounts /auth, mTLS, token exchange, consent
│   ├── auth.js                 Login routes: /auth/register, /login, /google, /me
│   ├── store.js                JSON-file user store (server/data/users.json, gitignored)
│   └── package.json            Server dependencies (express, cors, node-fetch, bcryptjs,
│                                jsonwebtoken, google-auth-library, dotenv)
├── public/                     Static assets served as-is
├── src/
│   ├── components/             Shared UI components
│   │   ├── Badge.tsx           Coloured label chips (type, category, frequency)
│   │   ├── BankCard.tsx        Connected bank card with sync/disconnect actions
│   │   ├── BankConnectWizard.tsx  3-step wizard: select bank → choose scopes → redirect
│   │   ├── ExpenseForm.tsx     Add/edit expense modal form
│   │   ├── InvestmentForm.tsx  Add/edit investment modal form
│   │   ├── Layout.tsx          App shell with sidebar navigation + user menu/logout
│   │   ├── Modal.tsx           Generic modal wrapper
│   │   ├── PageHeader.tsx      Page title + optional action button
│   │   ├── RequireAuth.tsx     Route guard — redirects to /login; mounts per-user StoreProvider
│   │   └── StatCard.tsx        Dashboard metric card
│   ├── context/
│   │   ├── AuthContext.tsx     React Context — exposes login/register/logout + session state
│   │   └── StoreContext.tsx    React Context — exposes store + Google Sheets state (per user)
│   ├── hooks/
│   │   ├── useAuth.ts          Login/register/session state, token persistence, /me rehydration
│   │   ├── useStore.ts         All CRUD operations + per-user localStorage read/write
│   │   └── useGoogleSheets.ts  Google Sheets connection (per user), token management, auto-sync
│   ├── pages/
│   │   ├── Login.tsx           Sign in / create account + "Continue with Google"
│   │   ├── Banks.tsx           Bank connection list + OAuth callback handler
│   │   ├── Dashboard.tsx       Overview: stats, allocation pie, recent activity
│   │   ├── Investments.tsx     Portfolio table with add/edit/delete
│   │   ├── Expenses.tsx        Expense table with category filter and CRUD
│   │   ├── Reports.tsx         Bar + pie charts for expenses and portfolio
│   │   └── Settings.tsx        Currency, goals, Google Sheets backup, data management
│   ├── services/
│   │   ├── auth/
│   │   │   └── api.ts          Fetch wrapper for /auth/* routes on the proxy
│   │   ├── googleSheets/
│   │   │   ├── auth.ts         PKCE OAuth 2.0 flow direct to Google (redirect path parameterized
│   │   │   │                   for both /login and /settings; no proxy needed)
│   │   │   ├── api.ts          Sheets API v4: createSpreadsheet, batchUpdateValues
│   │   │   └── sync.ts         Serialises investments/expenses/settings to row arrays
│   │   └── openBanking/
│   │       ├── api.ts          OFB API calls (accounts, cards, investments) via proxy
│   │       ├── banks.ts        Bank directory: KNOWN_BANKS + live OFB directory fetch
│   │       ├── oauth.ts        PKCE flow, authorization redirect, token exchange
│   │       ├── pkce.ts         PKCE verifier/challenge generation (Web Crypto API)
│   │       └── sync.ts         Maps OFB data → FinTrack Investment/Expense models
│   ├── types/
│   │   ├── auth.ts             AuthUser, AuthResponse types
│   │   ├── googleSheets.ts     GoogleSheetsConfig type + per-user storage key helper
│   │   ├── index.ts            TypeScript interfaces: Investment, Expense, AppSettings
│   │   └── openBanking.ts      OFB API types: banks, consents, accounts, transactions
│   ├── utils/
│   │   ├── calculations.ts     P&L, monthly totals, allocation, savings rate
│   │   ├── format.ts           Currency, percent, and date formatting helpers
│   │   └── migrateLegacyStorage.ts  One-time copy of pre-login flat storage into the first
│   │                           logged-in user's namespaced keys
│   ├── App.tsx                 Route definitions (public /login + authenticated app shell)
│   ├── index.css               Tailwind v4 entry point + theme tokens
│   └── main.tsx                React app entry point
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Data Storage

### Server-side (login accounts only)

Account records — email, hashed password (bcrypt), linked Google ID, display name — live
in `server/data/users.json` (gitignored). No financial data is ever sent to or stored on
the server; the proxy only handles authentication.

### Local (always active)

Financial data is saved in **`window.localStorage`**, namespaced per logged-in account
under key `fintrack_data_<userId>`:

```json
{
  "investments":    [...],
  "expenses":       [...],
  "settings":       { "baseCurrency": "BRL", "monthlyIncomeGoal": 0, "savingsGoal": 0 },
  "connectedBanks": [...]
}
```

Google Sheets connection config is stored separately under key `fintrack_gs_config_<userId>` and contains the access/refresh tokens, spreadsheet ID, and last sync timestamp. Tokens never leave your machine except when communicating with Google's own OAuth and Sheets endpoints.

The login session itself is a JWT stored under `fintrack_auth_token` (unencrypted, like
the OAuth tokens above — consistent with this app's existing local-trust model). A
one-time migration flag, `fintrack_migrated_v2`, marks whether the pre-login flat
`fintrack_data` / `fintrack_gs_config` keys (from versions before login existed) have
already been copied into the first account that logs in — see [Login](#login).

To inspect: DevTools → Application → Local Storage → `http://localhost:5173`.  
To clear your own data: **Settings → Clear All Data** (also logs you out; the account itself is untouched).

### Remote (Google Sheets — optional)

When connected, data is written to three tabs in a spreadsheet named **FinTrack Data** in your personal Google Drive. The spreadsheet is created automatically on first connect.

---

## First-Time Setup in the App

1. Open the app at http://localhost:5173 — you'll land on the login screen
2. **Create account** with an email/password, or **Continue with Google**
3. Go to **Settings** → set your base currency and monthly income goal
4. *(Optional, if you signed up with a password)* Go to **Settings → Google Sheets Backup** → **Sign in with Google** to enable remote sync
5. Go to **Investments** → add portfolio positions manually, or connect a bank via **Banks**
6. Go to **Expenses** → add monthly costs manually, or let bank sync import transactions
7. Return to **Dashboard** — your financial overview is populated

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

Check that both `http://localhost:5173/login` and `http://localhost:5173/settings` are listed as Authorized redirect URIs in your Google Cloud credential. The URI must match exactly (no trailing slash).

### Google Sheets — token expired, sync stopped

Go to **Settings → Disconnect** and reconnect. A new spreadsheet is created; copy any manual data from the old one if needed.

### Proxy not running — can't log in, or bank connection fails

```bash
npm run proxy
```

The proxy is required for login — unlike earlier versions, the app can no longer run
standalone.

### "Sessions keep getting logged out after every restart"

`JWT_SECRET` isn't set in `.env`, so the proxy generates a new random one on every
startup, invalidating all existing sessions. Set it once and this stops:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# paste the output as JWT_SECRET= in .env
```

### "Continue with Google" button shows a warning instead of signing in

Same cause as the Google Sheets Backup issue above — `VITE_GOOGLE_CLIENT_ID` isn't set,
or the dev server wasn't restarted after adding it.

### My existing data disappeared after upgrading to a version with login

It should have been migrated automatically into the first account you log in with (see
[Login](#login) and [Data Storage](#data-storage)). If you tested with a throwaway
account first, your real data may have been attached to that account instead — check
`localStorage` for the old flat `fintrack_data` key (still present, untouched) and the
`fintrack_migrated_v2` flag; clearing that flag and logging in again with the correct
account re-runs the migration.

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
| Persistence | localStorage (per-account, primary) + Google Sheets (optional remote) | — |
| Login | JWT sessions + bcrypt password hashing | jsonwebtoken, bcryptjs |
| Google Sheets & Google login | OAuth 2.0 + PKCE, Sheets API v4, google-auth-library (server-side id_token verification) | Desktop app credentials |
| Open Finance | OAuth 2.0 + PKCE (FAPI 1.0), OFB APIs v1–v2 | OFB standard |
| Proxy server | Express + node-fetch + dotenv | Node.js 18+ |
