# Local Development Setup

This guide walks you through running Clarita on your own machine — both the backend API and the Next.js dashboard.

---

## Prerequisites

| Tool | Minimum version | Notes |
|------|----------------|-------|
| Node.js | 18+ | Check with `node -v` |
| npm | 9+ | Bundled with Node.js 18; check with `npm -v` |
| PostgreSQL | 14+ | Local install **or** a free [Neon](https://neon.tech) serverless database |
| git | any recent | Check with `git --version` |

---

## 1. Clone the repository

```bash
git clone https://github.com/your-org/clarita.git
cd clarita
```

---

## 2. Backend setup

### 2a. Install dependencies

```bash
cd backend
npm install
```

### 2b. Configure environment variables

```bash
cp .env.example .env
```

Open `backend/.env` and fill in the values. Required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string. Local example: `postgresql://postgres:password@localhost:5432/clarita`. Neon example: `postgresql://user:password@host/dbname?sslmode=require` |
| `JWT_SECRET` | Random secret, at least 32 characters. Generate one with: `openssl rand -base64 32` |

All other variables are optional and documented in `backend/.env.example`.

### 2c. Create the database schema

Run the base schema first, then each migration file in the order listed below:

```bash
# Base schema (always first)
psql "$DATABASE_URL" -f db/schema.sql

# Migrations — run in this order
psql "$DATABASE_URL" -f db/migration_phase1.sql
psql "$DATABASE_URL" -f db/migration_phase3.sql
psql "$DATABASE_URL" -f db/migration_phase4.sql
psql "$DATABASE_URL" -f db/migration_invitations.sql
psql "$DATABASE_URL" -f db/migration_password_reset.sql
psql "$DATABASE_URL" -f db/migration_lgpd.sql
psql "$DATABASE_URL" -f db/migration_push_subscriptions.sql
psql "$DATABASE_URL" -f db/migration_exams.sql
psql "$DATABASE_URL" -f db/migration_onboarding_documents.sql
psql "$DATABASE_URL" -f db/migration_professional_onboarding.sql
psql "$DATABASE_URL" -f db/migration_conditions.sql
psql "$DATABASE_URL" -f db/migration_goal_acceptance.sql
psql "$DATABASE_URL" -f db/migration_digital_twin.sql
psql "$DATABASE_URL" -f db/migration_direct_chat.sql
psql "$DATABASE_URL" -f db/migration_clinical_modules.sql
psql "$DATABASE_URL" -f db/migration_icd11_satepsi.sql
psql "$DATABASE_URL" -f db/migration_patient_diagnoses.sql
psql "$DATABASE_URL" -f db/migration_enrich_icd11.sql
```

Alternatively, use the npm shortcut for the base schema only:

```bash
npm run db:init
```

### 2d. Load seed data

```bash
npm run db:seed
```

This runs `db/seed.sql`. Additional seed files (ICD-11 disorders, psychological tests, etc.) can be applied individually:

```bash
psql "$DATABASE_URL" -f db/seed_icd11_disorders.sql
psql "$DATABASE_URL" -f db/seed_dsm_criteria.sql
psql "$DATABASE_URL" -f db/seed_psych_tests.sql
psql "$DATABASE_URL" -f db/seed_satepsi_tests.sql
psql "$DATABASE_URL" -f db/seed_icd_test_mapping.sql
```

### 2e. Start the backend server

```bash
npm run dev
```

Expected output:

```
[nodemon] starting `node src/index.js`
Server running on port 3005
Database connected
```

The API is now available at `http://localhost:3005/api`.

---

## 3. Dashboard setup

Open a **new terminal tab** — the backend must keep running.

### 3a. Install dependencies

```bash
cd dashboard
npm install
```

### 3b. Configure environment variables

```bash
cp .env.example .env.local
```

The only required variable is `NEXT_PUBLIC_API_URL`. The default value in `.env.example` (`http://localhost:3005/api`) is correct if you are using the default backend port.

### 3c. Start the dashboard

```bash
npm run dev
```

The dashboard is now available at `http://localhost:3000`.

---

## 4. Test accounts

Sample patient journey data is available in `backend/db/seed_journeys.js`. Review that file for the pre-seeded credentials (email / password) you can use to log in during development.

---

## 5. Running tests

### Backend

```bash
cd backend

# Run the full test suite
npm test

# Run with coverage report (enforces 80 % line coverage threshold)
npm run test:coverage
```

Tests are located in `backend/tests/` and require a test database. The Jest setup files (`tests/env.js`, `tests/setup.js`, `tests/teardown.js`) handle test-database provisioning automatically.

### Dashboard

```bash
cd dashboard

# Once a test runner is configured:
npm test
```

> The dashboard does not yet have a test runner configured. Contributions welcome.

### End-to-end (Cypress)

```bash
# From the repo root, once Cypress is installed:
npx cypress open
```

> Cypress integration is planned but not yet set up.

---

## 6. Common issues

### Both services must run simultaneously

The dashboard calls the backend API at runtime. You need **two terminal sessions** — one for `backend/` and one for `dashboard/`.

### Port conflicts

| Service | Default port | Override |
|---------|-------------|---------|
| Backend API | `3005` | Set `PORT` in `backend/.env` |
| Dashboard | `3000` | Pass `--port` to `next dev`, e.g. `npm run dev -- --port 3001` |

If port 3005 is already in use, update both `PORT` in `backend/.env` **and** `NEXT_PUBLIC_API_URL` in `dashboard/.env.local` to match.

### Database connection errors

- Verify `DATABASE_URL` is set correctly in `backend/.env`.
- For Neon (cloud), ensure `?sslmode=require` is appended to the connection string.
- For a local PostgreSQL instance, confirm the server is running: `pg_isready`.

### Migration order matters

Always apply `db/schema.sql` before any migration file. The migrations listed in section 2c above are ordered so that each one's dependencies are satisfied by the files that precede it.
