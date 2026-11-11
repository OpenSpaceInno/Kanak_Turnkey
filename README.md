# Kanak Turnkey — Turnkey Project Management & ERP System

A comprehensive Turnkey Project Management System for an Indian construction/EPC enterprise. It covers the complete operations lifecycle:
- **Sales & Pre-Construction**: Leads pipeline, site visits, drawings, BOQ estimation, negotiations.
- **Project Execution**: Projects, tasks, budgets, milestones, RA bills, punch lists.
- **Procurement & Inventory**: Vendor directory, Material Requests (MR), RFQ & Quotation comparison, Purchase Orders (PO), Goods Received Notes (GRN), multi-location inventory & stock transfers.
- **Finance & Accounting**: Client billing (AR), vendor invoices (AP with 3-way match), petty cash / imprest site float, bank guarantees & financial instruments.
- **Field Operations & Mobile PWA**: Tailored field hubs for Site Engineers, Supervisors, Storekeepers, and Subcontractors.
- **Governance**: Multi-role access control, audit logs, communications, document vault, and executive dashboard.

---

## 🏗️ Architecture

- **Monorepo** managed with `pnpm`
- **Backend API**: Express 5 + Drizzle ORM at `artifacts/api-server`
- **Frontend Web UI**: React 19 + Vite 7 + Tailwind CSS v4 + TanStack Query + shadcn/ui at `artifacts/kanak-turnkey`
- **Database Support**:
  - **MySQL 8.0**: DDL schema & seed data at `lib/db/mysql-schema.sql` (compatible with phpMyAdmin)
  - **PostgreSQL / PGlite**: Drizzle schema at `lib/db/src/schema/index.ts` (supports Supabase, external PG, and zero-config local PGlite)

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js 20+
- pnpm 10+ (`npm install -g pnpm`)
- MySQL 8.0 (optional if using embedded PGlite)

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Initialize Database (MySQL)
If using MySQL (default root password: `root`):
```bash
# Setup MySQL database and execute all 32 tables
node scripts/setup-mysql.mjs --password="root"

# Test the connection to the database
npm run db:test
```

### 4. Start Development Servers
```bash
npm run dev
```
- **Web UI**: [http://localhost:5173](http://localhost:5173)
- **API Server**: [http://localhost:3000](http://localhost:3000)

---

## 🐳 Docker & Coolify Deployment

The project includes a ready-to-use Docker configuration with **Frontend (Nginx)**, **Backend (Express)**, **MySQL Database**, **phpMyAdmin**, and **PostgreSQL**.

### Deploy on Coolify (HTTPS via Traefik)
`docker-compose.yml` uses internal `expose:` ports to avoid host port `80`/`443` conflicts with Coolify's Traefik proxy:
1. Create a **Docker Compose** resource in Coolify pointing to this repository.
2. Assign your HTTPS domain to the **`frontend`** service (port `80`).
3. *(Optional)* Assign a subdomain to **`phpmyadmin`** (port `80`).
4. Deploy!

### Run Locally with Docker
```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

### Services & Port Mapping (Local Override)
| Service | URL / Port | Credentials / Notes |
|---|---|---|
| **Web UI** | [http://localhost](http://localhost) (port 80) | Served via Nginx with API proxy |
| **API Server** | [http://localhost:3000/api](http://localhost:3000/api) | Healthcheck: `/api/health` |
| **phpMyAdmin** | [http://localhost:8080](http://localhost:8080) | User: `root`, Password: `root` |
| **MySQL DB** | `localhost:3306` | User: `root`, Password: `root`, DB: `kanak_turnkey` |
| **PostgreSQL** | `localhost:5432` | User: `postgres`, Password: `root`, DB: `kanak_turnkey` |

For detailed Docker deployment information, see [`DOCKER_SETUP.md`](./DOCKER_SETUP.md).

---

## 🔒 CORS & HTTPS Deployment

When deploying with HTTPS behind a reverse proxy (Nginx, Traefik, AWS ALB, Cloudflare):
1. **Reverse Proxy Trust**: The backend enables `app.set("trust proxy", 1)` to automatically detect HTTPS connections via `X-Forwarded-Proto`.
2. **CORS Configuration**: Configure allowed origins in `.env`:
   ```env
   CORS_ORIGIN=https://yourdomain.com,https://api.yourdomain.com
   ```
   Credentials (`credentials: true`), preflight `OPTIONS`, and security headers (`Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`) are handled automatically.
3. **Nginx Frontend Proxy**: [`artifacts/kanak-turnkey/nginx.conf`](./artifacts/kanak-turnkey/nginx.conf) passes all `/api/` traffic directly to the backend container.

---

## 📜 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Runs both API server and Vite frontend concurrently |
| `npm run build` | Runs typechecks and builds all workspace packages |
| `npm run typecheck` | Validates TypeScript across all libraries and applications |
| `npm run db:test` | Tests MySQL and PostgreSQL connections and lists tables |
| `npm run db:mysql:setup` | Creates the `kanak_turnkey` database and seeds MySQL |

