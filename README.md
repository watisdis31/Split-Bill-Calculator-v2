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

## Production deployment (Vercel + Render + Supabase)

### Supabase

1. Create a project and run the SQL files in `database/LogDB/` via the SQL Editor.
2. Copy the Postgres connection string (include `?sslmode=require`).

### Render (backend)

1. Connect this repo at [render.com](https://render.com).
2. Use the included `render.yaml`, or create a **Web Service** with root directory `backend`.
3. Build: `npm install && npm run build`
4. Start: `npm start`
5. Set environment variables:

```env
NODE_ENV=production
AUTH_SECRET=<long-random-string>
DATABASE_URL=<supabase-connection-string>
FRONTEND_URL=https://your-app.vercel.app
BACKEND_URL=https://your-api.onrender.com
```

After the first deploy, copy the Render URL into `BACKEND_URL` and redeploy if needed.

**Note:** Render's free web tier spins down after inactivity. The first request after idle time may take 30–60 seconds (cold start).

### Vercel (frontend)

1. Import the repo with root directory `frontend`.
2. Set environment variables:

```env
VITE_API_URL=https://your-api.onrender.com
VITE_FRONTEND_URL=https://your-app.vercel.app
```

3. `frontend/vercel.json` handles SPA routing.

### Auth across domains

Production uses `SameSite=None` session cookies so login works between Vercel and Render. `FRONTEND_URL` on Render must match your Vercel URL exactly (https, no trailing slash).
