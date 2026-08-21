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
