# 🐳 Kanak Turnkey — Docker & Database Deployment Guide

This project includes a complete Docker configuration with **Frontend**, **Backend**, **MySQL Database**, **phpMyAdmin**, and **PostgreSQL**.

---

## 📦 Services in Docker Compose

| Service | Port | Description |
|---|---|---|
| **Frontend** | `80`, `443` | React SPA served via high-performance Nginx with reverse proxy to API |
| **Backend** | `3000` | Express 5 API Server (Drizzle ORM + REST API + CORS + HTTPS proxy trust) |
| **MySQL (db)** | `3306` | MySQL 8.0 pre-seeded with all 32 tables and initial data |
| **phpMyAdmin** | `8080` | Visual MySQL database admin UI (URL: `http://localhost:8080`) |
| **PostgreSQL** | `5432` | PostgreSQL 16 container for native Drizzle ORM operations |

---

## 🚀 Quick Start with Docker

### 1. Start All Services
```bash
docker compose up -d --build
```

### 2. Verify Container Status
```bash
docker compose ps
```

### 3. Access the Applications
- **Web App (Frontend)**: [http://localhost](http://localhost)
- **API Server (Backend)**: [http://localhost:3000/api](http://localhost:3000/api)
- **phpMyAdmin**: [http://localhost:8080](http://localhost:8080)
  - **Server**: `db`
  - **Username**: `root`
  - **Password**: `root`
  - **Database**: `kanak_turnkey`

### 4. Stop All Services
```bash
docker compose down
```

---

## 🔒 CORS & HTTPS Deployment

### Running with HTTPS
1. In `artifacts/api-server/src/app.ts`, Express is configured with `app.set("trust proxy", 1);` to automatically trust SSL reverse proxies (Nginx, Traefik, AWS ALB, Cloudflare).
2. Set your domain in `.env`:
   ```env
   CORS_ORIGIN=https://yourdomain.com,https://api.yourdomain.com
   ```
3. Nginx (`artifacts/kanak-turnkey/nginx.conf`) handles reverse proxying `/api/` to `http://backend:3000/api/` with SSL headers (`X-Forwarded-Proto`, `Host`, `X-Real-IP`).

---

## 🛠️ Local Development (Without Docker)

### 1. Connect to Local MySQL
Make sure MySQL is running on port `3306` with password `root`:
```bash
# Initialize all 32 tables and seed data in MySQL
node scripts/setup-mysql.mjs --password="root"

# Test the connection to MySQL and PostgreSQL
npm run db:test
```

### 2. Run the Full Application
```bash
npm run dev
```
- API Server runs on [http://localhost:3000](http://localhost:3000)
- Web UI runs on [http://localhost:5173](http://localhost:5173)

