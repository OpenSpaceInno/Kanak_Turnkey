# 🐳 Kanak Turnkey — Docker & Coolify Deployment Guide

This project includes a complete 4-service Docker configuration: **Frontend**, **Backend**, **MySQL Database**, and **phpMyAdmin**.

---

## 📦 Services in Docker Compose

| Service | Internal Port | Description |
|---|---|---|
| **frontend** | `80` | React SPA served via high-performance Nginx with `/api/` reverse proxy to backend |
| **backend** | `3000` | Express 5 API Server connected directly to MySQL (`db`) with CORS & HTTPS proxy trust |
| **db** | `3306` | MySQL 8.0 pre-configured with all 34 tables and auto-seeded operations data (root password: `root`) |
| **phpmyadmin** | `80` | Visual MySQL database admin UI (User: `root`, Password: `root`) |

---

## ☁️ Deploying on Coolify (HTTPS via Traefik)

[`docker-compose.yml`](./docker-compose.yml) uses internal `expose:` ports (no hardcoded host `ports:` or `container_name:`) so it integrates directly with Coolify's Traefik reverse proxy without port `80`/`443`/`3306` conflicts:

1. In Coolify, create a **Docker Compose** resource pointing to this repository.
2. Assign your HTTPS domain (e.g. `https://kanak.yourdomain.com`) to the **`frontend`** service (port `80`).
3. *(Optional)* Assign a subdomain (e.g. `https://pma.yourdomain.com`) to the **`phpmyadmin`** service (port `80`).
4. Set `CORS_ORIGIN` in Coolify Environment Variables if calling the API directly from an external origin (or leave `*`).
5. Click **Deploy**.

---

## 💻 Running Locally with Docker Compose

When running Docker locally on your machine (without Coolify/Traefik), include [`docker-compose.local.yml`](./docker-compose.local.yml) to map host ports:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

### Local Access URLs:
- **Web App (Frontend)**: [http://localhost](http://localhost) (port `80`)
- **API Server (Backend)**: [http://localhost:3000/api/health](http://localhost:3000/api/health)
- **phpMyAdmin**: [http://localhost:8080](http://localhost:8080)
  - **Server**: `db`
  - **Username**: `root`
  - **Password**: `root`
  - **Database**: `kanak_turnkey`

### Stop Local Containers:
```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml down
```

---

## 🔒 CORS & HTTPS Deployment

1. In `artifacts/api-server/src/app.ts`, Express is configured with `app.set("trust proxy", 1);` to automatically trust SSL reverse proxies (Traefik, Nginx, AWS ALB, Cloudflare).
2. Set your domain in `.env`:
   ```env
   CORS_ORIGIN=https://yourdomain.com,https://api.yourdomain.com
   ```
3. Nginx (`artifacts/kanak-turnkey/nginx.conf`) reverse-proxies `/api/` to `http://backend:3000/api/` while preserving `X-Forwarded-Proto`.

---

## 🛠️ Local Development (Without Docker)

### 1. Connect to Local MySQL
Make sure MySQL is running on port `3306` with password `root`:
```bash
# Initialize all 34 tables in MySQL
node scripts/setup-mysql.mjs --password="root"

# Test the connection to MySQL
npm run db:test
```

### 2. Run the Full Application
```bash
npm run dev
```
- API Server runs on [http://localhost:3000](http://localhost:3000)
- Web UI runs on [http://localhost:5173](http://localhost:5173)
