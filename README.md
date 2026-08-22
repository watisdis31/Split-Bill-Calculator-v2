# EasySplitBill

Web app for splitting restaurant bills. One person enters the receipt, shares a link, and everyone calculates what they owe.

## Prerequisites

- Node.js 18+
- npm
- PostgreSQL

## Database setup

The app does **not** create or migrate the database automatically. Create the database yourself, then execute the SQL file.

```bash
psql -U postgres -c "CREATE DATABASE easysplitbill;"
psql -U postgres -d easysplitbill -f database/LogDB/001_create_easysplitbill_database.sql
```

On Windows PowerShell, the same commands work if `psql` is on your PATH.

### DBeaver

1. Connect to database `easysplitbill` (not `postgres`).
2. Open `database/LogDB/001_create_easysplitbill_database.sql`.
3. Run **Execute SQL Script** (`Alt+X`), not **Execute SQL Statement** (`Ctrl+Enter`).

If you see `SQL Error [25P02]: current transaction is aborted`, click **Rollback** (or disconnect/reconnect), then re-run the script with `Alt+X`.

Later schema changes belong in additional numbered files under `database/LogDB/`, for example `002_add_bill_indexes.sql`. Do not hide schema changes in application code.

## Environment setup

### Backend

```bash
cd backend
copy .env.example .env
```

On macOS/Linux use `cp .env.example .env`.

Configure:

```env
DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/easysplitbill
AUTH_SECRET=replace-with-a-long-random-secret
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
NODE_ENV=development
```

`AUTH_SECRET` must be a long random string. Never commit the real `.env` file.

### Frontend

```bash
cd frontend
copy .env.example .env
```

Configure:

```env
VITE_API_URL=http://localhost:3000
```

## Run the backend

```bash
cd backend
npm install
npm run dev
```

API: http://localhost:3000

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

## Routes

- `/` landing
- `/login` `/register`
- `/dashboard`
- `/bills/new`
- `/bills/:billId`
- `/bills/:billId/edit`
- `/bill/s/:shareToken` public shared calculator

## Money storage

Amounts are stored as integer minor units (IDR rupiah, USD cents). Percentage discounts are stored as basis points (`10%` = `1000`).

## Production deployment (Vercel + Supabase)

Deploy as **two Vercel projects** from this monorepo (both free Hobby tier).

### Supabase

1. Create a project and run the SQL files in `database/LogDB/` via the SQL Editor.
2. Copy the **Transaction pooler** connection string (port `6543`, host contains `pooler.supabase.com`) for serverless.
3. Append `?sslmode=require` if it is not already included.

**Troubleshooting `ENOTFOUND db....supabase.co`**

- **Supabase project paused:** free projects pause after inactivity. Open the Supabase dashboard and click **Restore project**.
- **Wrong host:** on Vercel serverless, prefer the **pooler** URL, not the direct `db.xxx.supabase.co` host if DNS fails.
- **Bad env paste:** in Vercel → Settings → Environment Variables, re-paste `DATABASE_URL` with no quotes or trailing spaces. Redeploy after saving.

### Vercel backend (`backend/`)

1. [vercel.com](https://vercel.com) → **Add New Project** → import this repo.
2. Set **Root Directory** to `backend`.
3. Vercel detects Next.js via `backend/vercel.json`.
4. Environment variables:

```env
NODE_ENV=production
AUTH_SECRET=<long-random-string>
DATABASE_URL=<supabase-pooler-connection-string>
FRONTEND_URL=https://ezsplitbill.vercel.app
BACKEND_URL=https://ezsplitbill-server.vercel.app
```

5. Deploy, then copy the backend URL (e.g. `https://ezsplitbill-server.vercel.app`).

### Vercel frontend (`frontend/`)

1. **Add another project** from the same repo.
2. Set **Root Directory** to `frontend`.
3. Vercel detects Vite via `frontend/vercel.json` (`dist` output + SPA rewrites).
4. Environment variables:

```env
VITE_API_URL=
```

Leave `VITE_API_URL` empty in production. The frontend calls `/api/...` on the same origin; `frontend/vercel.json` rewrites those requests to the backend.

If the backend hostname changes, update the `/api/:path*` destination in `frontend/vercel.json`.

5. Redeploy the frontend after changing `vercel.json`.

### Final step

Update `FRONTEND_URL` on the **backend** project to match your live frontend URL (`https://ezsplitbill.vercel.app`), then redeploy the backend.

### Auth cookies (same origin)

The browser talks only to the frontend origin. Session cookies are first-party (`SameSite=Lax`, `Secure` in production, `httpOnly`, `path=/`). Do not point the production frontend at the API hostname; Safari blocks those cross-site cookies.
