# SmartEdX — Getting Started

This guide walks you through setting up the full SmartEdX stack locally from scratch.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 20 | For NestJS services and Next.js frontends |
| Python | 3.11 | For FastAPI services |
| Docker + Docker Compose | Latest | For PostgreSQL, Redis, MinIO, Qdrant |
| pnpm or npm | ≥ 8 | Package manager |
| Git | — | |

---

## 1. Clone the Repository

```bash
git clone <repository-url>
cd SmartEdX
```

---

## 2. Start Infrastructure Services

Start PostgreSQL, Redis, MinIO, and Qdrant with Docker Compose:

```bash
docker compose up -d
```

Verify all containers are running:
```bash
docker compose ps
```

**MinIO console:** http://localhost:9001 (default credentials: `minioadmin` / `minioadmin`)

**Qdrant dashboard:** http://localhost:6333/dashboard

---

## 3. Create Databases

Connect to PostgreSQL and create the two databases:

```bash
docker exec -it smartedx-postgres psql -U postgres
```

```sql
CREATE DATABASE saas_service;
CREATE DATABASE institute_service;
\q
```

---

## 4. Configure Environment Variables

Copy and fill in environment files for each service. See [ENVIRONMENT.md](ENVIRONMENT.md) for all variables.

```bash
# API Gateway
cp api-gateway/.env.example api-gateway/.env

# SaaS Service
cp backend/saas_service/.env.example backend/saas_service/.env

# Institute Service
cp backend/institute_service/.env.example backend/institute_service/.env

# AI Core
cp backend/ai_core/.env.example backend/ai_core/.env

# Voice Agent
cp backend/voice_agent/.env.example backend/voice_agent/.env

# Facial Recognition Server
cp backend/facial_recognition_server/.env.example backend/facial_recognition_server/.env

# Institute Portal
cp frontend/institute_protal/.env.example frontend/institute_protal/.env.local

# SaaS Portal
cp frontend/sass_protal/.env.example frontend/sass_protal/.env.local
```

**Critical shared values** (must be the same across services):
- `JWT_SECRET` — set the same value in both `saas_service/.env` and `institute_service/.env`
- `GATEWAY_SECRET` — set the same value in `api-gateway/.env`, `saas_service/.env`, and `institute_service/.env`
- `MINIO_*` credentials — same in all services that use file storage

---

## 5. Install Dependencies

### NestJS Services

```bash
# From repo root — installs all NestJS service dependencies
npm install

# Or install individually:
cd api-gateway && npm install
cd backend/saas_service && npm install
cd backend/institute_service && npm install
```

### Python Services

```bash
# AI Core
cd backend/ai_core
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Voice Agent
cd backend/voice_agent
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Facial Recognition Server
cd backend/facial_recognition_server
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend Portals

```bash
cd frontend/institute_protal && npm install
cd frontend/sass_protal && npm install
```

---

## 6. Start All Services

### Option A: Start Everything from Root

The root `package.json` has a `concurrently` script to start all services:

```bash
npm run dev
```

### Option B: Start Services Individually

Open separate terminals for each service:

```bash
# Terminal 1 — API Gateway
cd api-gateway && npm run start:dev

# Terminal 2 — SaaS Service
cd backend/saas_service && npm run start:dev

# Terminal 3 — Institute Service
cd backend/institute_service && npm run start:dev

# Terminal 4 — AI Core
cd backend/ai_core
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# Terminal 5 — Voice Agent
cd backend/voice_agent
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload

# Terminal 6 — Facial Recognition Server
cd backend/facial_recognition_server
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8003 --reload

# Terminal 7 — Institute Portal
cd frontend/institute_protal && npm run dev

# Terminal 8 — SaaS Portal
cd frontend/sass_protal && npm run dev
```

---

## 7. Verify Services Are Running

| Service | Health Check URL |
|---|---|
| API Gateway | `http://localhost:5001` |
| SaaS Service | `http://localhost:5002` |
| Institute Service | `http://localhost:5003` |
| AI Core | `http://localhost:8001/health` |
| Voice Agent | `http://localhost:8002/health` |
| Facial Recognition | `http://localhost:8003/health` |
| Institute Portal | `http://localhost:3001` |
| SaaS Portal | `http://localhost:3000` |

---

## 8. Initial Setup (First Run)

On first startup, the NestJS services automatically:
1. Run TypeORM migrations to create all database tables
2. Seed default admin users and roles via `SeedService.seedAdminUsers()`

**Default admin credentials** are set in the seed configuration. Check `backend/saas_service/src/modules/auth/seed/` for defaults and update before production deployment.

---

## 9. MinIO Bucket Setup

The MinIO bucket `smartedx-bucket` is created automatically by the SaaS Service on first startup. If it isn't, create it manually via the MinIO console at `http://localhost:9001`:

1. Login with `minioadmin` / `minioadmin`
2. Create bucket: `smartedx-bucket`
3. Set access policy to `public` (for file URL access without signed URLs)

---

## 10. Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable **Authentication** → sign-in providers: **Email/Password** and **Google**
3. Generate a service account key: Project Settings → Service Accounts → Generate new private key
4. Copy values into the `FIREBASE_*` env vars for both backend services
5. Copy Firebase web config into `NEXT_PUBLIC_FIREBASE_*` env vars for both frontend portals

---

## Common Issues

### TypeORM synchronize vs migrations
NestJS services use `synchronize: true` in development, which auto-creates/alters tables. Do not use `synchronize: true` in production — generate and run migrations instead.

### Python service startup time
The Facial Recognition Server and Voice Agent download model weights on first run. Allow a few minutes on first startup (Facenet512 model ~90MB, FastEmbed model ~23MB).

### Port conflicts
If a port is already in use, update the `PORT` env var in the relevant service and update the corresponding `*_SERVICE_URL` in the API Gateway and any service that calls it.

### CORS errors
Ensure `CORS_ORIGIN` in the API Gateway `.env` includes all frontend URLs (including port numbers).

---

## Project URLs Summary

| Portal | URL |
|---|---|
| SaaS Operator Portal | http://localhost:3000 |
| Institute Portal | http://localhost:3001 |
| API Gateway | http://localhost:5001 |
| MinIO Console | http://localhost:9001 |
| Qdrant Dashboard | http://localhost:6333/dashboard |
