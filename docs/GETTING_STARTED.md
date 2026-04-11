# SmartEdX — Getting Started

This guide walks you through setting up the full SmartEdX stack locally from scratch.

---

## Prerequisites

| Tool | Minimum Version | Check |
|------|----------------|-------|
| Node.js | 20.x | `node -v` |
| npm | 10.x | `npm -v` |
| Python | 3.11+ | `python --version` |
| Docker | 24.x | `docker -v` |
| Docker Compose | 2.x | `docker compose version` |
| PostgreSQL | 15+ | `psql --version` (or run via Docker) |
| Git | any | `git --version` |

---

## 1. Clone the repository

```bash
git clone <repo-url> SmartEdX
cd SmartEdX
```

---

## 2. Start infrastructure services

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on port 5432
- **MinIO** on ports 9000 (API) and 9001 (console)
- **Redis** on port 6379
- **Qdrant** on port 6333

Verify they are running:
```bash
docker compose ps
```

### Create the MinIO bucket

Open the MinIO console at http://localhost:9001  
Login: `minioadmin` / `minioadmin`  
Create a bucket named `smartedx-bucket` and set its access policy to **public**.

---

## 3. Set up PostgreSQL

If PostgreSQL is running inside Docker, connect and create the database:

```bash
docker exec -it smartedx-postgres psql -U postgres
```

```sql
CREATE DATABASE dev;
\q
```

If PostgreSQL is running locally, just ensure a database named `dev` exists with a `postgres` user.

---

## 4. Configure environment variables

Each service has a `.env.example`. Copy and fill in each one:

```bash
# API Gateway
cp api-gateway/.env.example api-gateway/.env

# Backend services
cp backend/saas_service/.env.example backend/saas_service/.env
cp backend/institute_service/.env.example backend/institute_service/.env
cp backend/ai_core/.env.example backend/ai_core/.env
cp backend/voice_agent/.env.example backend/voice_agent/.env
cp backend/facial_recognition_server/.env.example backend/facial_recognition_server/.env

# Frontend portals
cp frontend/institute_protal/.env.example frontend/institute_protal/.env
cp frontend/sass_protal/.env.example frontend/sass_protal/.env
```

Minimum required changes in each `.env`:

| File | Variable | What to set |
|------|----------|-------------|
| `saas_service/.env` | `DB_PASSWORD` | Your PostgreSQL password |
| `saas_service/.env` | `JWT_SECRET` | Long random string |
| `institute_service/.env` | `DB_PASSWORD` | Same as above |
| `institute_service/.env` | `JWT_SECRET` | **Same** as saas_service |
| `ai_core/.env` | `ANTHROPIC_API_KEY` | Your Anthropic API key (or switch provider) |
| `voice_agent/.env` | `GOOGLE_API_KEY` | Your Google AI API key |
| All frontends | `NEXT_PUBLIC_API_URL` | `http://localhost:5001` |

See [ENVIRONMENT.md](ENVIRONMENT.md) for the full variable reference.

---

## 5. Install dependencies

```bash
npm run install:all
```

This installs Node.js packages for all services and Python dependencies for the AI services.

To install individually:
```bash
# Node services
cd api-gateway && npm install
cd backend/saas_service && npm install
cd backend/institute_service && npm install
cd frontend/institute_protal && npm install
cd frontend/sass_protal && npm install

# Python services
cd backend/ai_core && pip install -r requirements.txt
cd backend/voice_agent && pip install -r requirements.txt
cd backend/facial_recognition_server && pip install -r requirements.txt
```

---

## 6. Build Node.js backend services

```bash
cd backend/saas_service && npm run build
cd backend/institute_service && npm run build
cd api-gateway && npm run build
```

TypeORM will automatically sync the database schema on first run (`synchronize: true` in development).

---

## 7. Start all services

### All at once (recommended for development)

```bash
npm start
```

### Or start individually in separate terminals

```bash
# Terminal 1 — API Gateway
npm run dev:api

# Terminal 2 — SaaS Service
npm run dev:saas

# Terminal 3 — Institute Service
npm run dev:institute

# Terminal 4 — AI Core
npm run dev:ai_core

# Terminal 5 — Voice Agent
npm run dev:voice_agent

# Terminal 6 — Facial Recognition
npm run dev:face_rec

# Terminal 7 — Institute Portal
npm run dev:inst_portal

# Terminal 8 — SaaS Portal
npm run dev:sass_portal
```

---

## 8. Verify everything is running

| Service | URL | Expected response |
|---------|-----|------------------|
| API Gateway | http://localhost:5001/docs | Swagger UI |
| SaaS Service | http://localhost:5002/docs | Swagger UI |
| Institute Service | http://localhost:5003/docs | Swagger UI |
| AI Core | http://localhost:8001/docs | Swagger UI |
| Voice Agent | http://localhost:8002/docs | Swagger UI |
| Facial Rec | http://localhost:8003/docs | Swagger UI |
| Institute Portal | http://localhost:3001 | Login page |
| SaaS Portal | http://localhost:3000 | Landing page |
| MinIO Console | http://localhost:9001 | MinIO dashboard |
| Qdrant Dashboard | http://localhost:6333/dashboard | Qdrant UI |

---

## 9. First-time setup

### Create a Super Admin account

Use the SaaS Portal at http://localhost:3000 to register the first admin account, or use the default credentials:

```
Email:    admin@example.com
Password: Admin@123
```

### Create an Institute

1. Log in to the SaaS Portal.
2. Navigate to **Institutes → Create Institute**.
3. Fill in the institute name and settings.
4. Copy the `instituteId` from the URL — you'll use this to access the Institute Portal.

### Access the Institute Portal

Navigate to:
```
http://localhost:3001/[instituteId]
```

### Create users

In the Institute Portal under **Admin → Users**:
1. Create a teacher account and assign the Teacher role.
2. Create student accounts and assign the Student role.

---

## Troubleshooting

### Service won't start — port already in use
```bash
# Find what's using the port
lsof -i :5003

# Kill it
kill <PID>
```

### Database connection refused
- Ensure Docker containers are running: `docker compose ps`
- Verify the `DB_*` variables in the service's `.env` match your PostgreSQL setup.

### JWT errors between services
- `SaaS Service` and `Institute Service` must share the exact same `JWT_SECRET` value.

### MinIO bucket not found
- Open http://localhost:9001 and create a bucket named `smartedx-bucket` with public access.

### AI Core returns errors
- Verify your API key is correct in `ai_core/.env`.
- Check `AI_PROVIDER` matches the key you provided (`anthropic`, `openai`, or `gemini`).

### Face recognition model download (first run)
- DeepFace downloads model weights on first use (~300MB for Facenet512). This is normal — subsequent starts are instant.
