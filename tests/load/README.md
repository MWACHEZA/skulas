# Load Testing Guide

This directory contains k6 load test scripts for the School ERP SaaS.
All tests target the **staging environment only** — never production.

## Prerequisites

### 1. Install k6
```bash
# Windows (via winget)
winget install k6 --source winget

# Or via Chocolatey
choco install k6
```

### 2. Install Docker Desktop
All staging services run in Docker. Download from https://www.docker.com/products/docker-desktop

---

## Step 1 — Start the Staging Environment

From the **project root**:
```bash
# Build and start all services (PostgreSQL + Backend + Frontend)
docker-compose -f docker-compose.staging.yml up --build -d

# Watch logs (optional)
docker-compose -f docker-compose.staging.yml logs -f backend
```

Services will be available at:
| Service  | URL                         |
|----------|-----------------------------|
| Frontend | http://localhost:8080       |
| Backend  | http://localhost:5001       |
| Database | localhost:5433              |

> **MOCK_WHATSAPP=true** is set in the compose file. All WhatsApp sends are intercepted and logged — no real messages are sent.

---

## Step 2 — Run Database Migrations

```bash
# Run Prisma migrations against the staging DB
docker-compose -f docker-compose.staging.yml exec backend npx prisma migrate deploy
```

---

## Step 3 — Seed Realistic Data

The seed script creates 3 school tenants, 80 teachers per tenant, 500 students per tenant, and 2 years of historical attendance/fee records.

```bash
# From the project root
DATABASE_URL="postgresql://acadex_staging:staging_secret@localhost:5433/acadex_staging" node tests/load/seed_staging.js
```

This will take several minutes. Wait for the `🎉 All tenants seeded successfully` message.

---

## Step 4 — Run Load Tests

Run each scenario in order. Fix any p99 breaches before moving to the next.

```bash
# Scenario 1: Morning Attendance Rush (PRIORITY — run this first)
k6 run tests/load/01_attendance_rush.js --env BASE_URL=http://localhost:5001

# Scenario 2: Admin Dashboard & Report Load
k6 run tests/load/02_dashboard_load.js --env BASE_URL=http://localhost:5001

# Scenario 3: Bulk WhatsApp Notification (safe — MOCK_WHATSAPP is on)
k6 run tests/load/03_bulk_notification.js --env BASE_URL=http://localhost:5001

# Scenario 4: Fee Payment Period Spike
k6 run tests/load/04_fee_payment_spike.js --env BASE_URL=http://localhost:5001

# Scenario 5: Multi-tenant Concurrent Load
k6 run tests/load/05_multi_tenant.js --env BASE_URL=http://localhost:5001
```

### Save results to a JSON file for later analysis
```bash
k6 run tests/load/01_attendance_rush.js \
  --env BASE_URL=http://localhost:5001 \
  --out json=tests/load/results/01_attendance_rush_$(date +%Y%m%d_%H%M%S).json
```

---

## Step 5 — Monitor During Tests

Open a second terminal and watch backend logs and DB connections while a test runs:

```bash
# Backend logs (watch for slow queries and errors)
docker-compose -f docker-compose.staging.yml logs -f backend

# Database connection count (watch for pool exhaustion)
docker-compose -f docker-compose.staging.yml exec db \
  psql -U acadex_staging -d acadex_staging -c \
  "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
```

**Watch for:**
- `remaining connection slots are reserved` → DB connection pool exhausted
- `timeout` errors in backend logs → query too slow under concurrent load
- `[MOCK WHATSAPP] Sent template` → confirms mock is working

---

## Results Template

Fill this in after each test run:

| Scenario | VUs Tested | p50 | p95 | p99 | Error Rate | Breaking Point | Suspected Bottleneck |
|----------|-----------|-----|-----|-----|------------|----------------|----------------------|
| 01 Attendance Rush | 80 | — | — | — | — | — | — |
| 02 Dashboard Load | 30 | — | — | — | — | — | — |
| 03 Bulk Notification | 10 | — | — | — | — | — | — |
| 04 Fee Payment Spike | 200 | — | — | — | — | — | — |
| 05 Multi-tenant | 75 total | — | — | — | — | — | — |

---

## Tear Down Staging

```bash
# Stop all services and remove staging volumes
docker-compose -f docker-compose.staging.yml down -v
```

---

## Cadence Recommendation

| Trigger | Tests to Run |
|---------|-------------|
| Before any major release | All 5 scenarios |
| Every new tenant onboarded (beyond 10 tenants) | Scenario 5 (multi-tenant) |
| After any DB schema migration | Scenario 1 + 4 (write-heavy) |
| Monthly during term time | Scenario 1 (attendance rush) |
