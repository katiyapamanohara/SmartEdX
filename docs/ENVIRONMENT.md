# SmartEdX — Environment Variable Reference

Copy the `.env.example` file in each service directory to `.env` and fill in the values below.

---

## API Gateway (`/api-gateway/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5001` | Port the gateway listens on |
| `NODE_ENV` | `development` | `development` or `production` |
| `CORS_ORIGIN` | `http://localhost:3000,http://localhost:3001` | Allowed CORS origins (comma-separated) |
| `SAAS_SERVICE_URL` | `http://localhost:5002` | Internal URL of the SaaS Service |
| `INSTITUTE_SERVICE_URL` | `http://localhost:5003` | Internal URL of the Institute Service |
| `AI_CORE_URL` | `http://localhost:8001` | Internal URL of the AI Core |
| `GATEWAY_SECRET` | — | Shared secret sent to backend services for internal auth |

---

## SaaS Service (`/backend/saas_service/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5002` | Port the service listens on |
| `NODE_ENV` | `development` | `development` or `production` |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | PostgreSQL username |
| `DB_PASSWORD` | — | PostgreSQL password |
| `DB_DATABASE` | `dev` | Database name |
| `JWT_SECRET` | — | Secret used to sign JWT tokens (keep long and random) |
| `JWT_EXPIRATION` | `1d` | Token expiry duration |
| `MINIO_ENDPOINT` | `localhost` | MinIO host |
| `MINIO_PORT` | `9000` | MinIO port |
| `MINIO_USE_SSL` | `false` | Use HTTPS for MinIO |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO secret key |
| `MINIO_BUCKET` | `smartedx-bucket` | Default storage bucket |
| `REDIS_HOST` | `127.0.0.1` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `GATEWAY_SECRET` | — | Must match API Gateway's `GATEWAY_SECRET` |
| `CORS_ORIGIN` | `http://localhost:3000,http://localhost:5001` | Allowed origins |

---

## Institute Service (`/backend/institute_service/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5003` | Port the service listens on |
| `NODE_ENV` | `development` | `development` or `production` |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | PostgreSQL username |
| `DB_PASSWORD` | — | PostgreSQL password |
| `DB_DATABASE` | `dev` | Database name |
| `JWT_SECRET` | — | Must match SaaS Service's `JWT_SECRET` (tokens are shared) |
| `JWT_EXPIRATION` | `1d` | Token expiry duration |
| `MINIO_ENDPOINT` | `localhost` | MinIO host |
| `MINIO_PORT` | `9000` | MinIO port |
| `MINIO_USE_SSL` | `false` | Use HTTPS for MinIO |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO secret key |
| `MINIO_BUCKET` | `smartedx-bucket` | Default storage bucket |
| `REDIS_HOST` | `127.0.0.1` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `GATEWAY_SECRET` | — | Must match API Gateway's `GATEWAY_SECRET` |
| `CORS_ORIGIN` | `http://localhost:3000,http://localhost:5001` | Allowed origins |
| `AI_CORE_URL` | `http://localhost:8001` | AI Core for quiz generation |
| `FACE_REC_URL` | `http://localhost:8003` | Facial recognition service |
| `VOICE_AGENT_URL` | `http://localhost:8002` | Voice Agent service |

---

## AI Core (`/backend/ai_core/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8001` | Port the service listens on |
| `AI_PROVIDER` | `anthropic` | LLM provider: `anthropic`, `openai`, or `gemini` |
| `MODEL_ID` | `claude-sonnet-4-6` | Model ID for the selected provider |
| `ANTHROPIC_API_KEY` | — | Required if `AI_PROVIDER=anthropic` |
| `OPENAI_API_KEY` | — | Required if `AI_PROVIDER=openai` |
| `GOOGLE_API_KEY` | — | Required if `AI_PROVIDER=gemini` |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:3001` | Allowed CORS origins |

### Model ID Reference

| Provider | Recommended Model ID |
|----------|---------------------|
| Anthropic | `claude-sonnet-4-6` |
| OpenAI | `gpt-4o` |
| Google | `gemini-2.0-flash` |

---

## Voice Agent (`/backend/voice_agent/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_API_KEY` | — | Google AI API key (for Gemini Live) |
| `GOOGLE_GENAI_USE_VERTEXAI` | `false` | Use Vertex AI instead of direct API |
| `DEMO_AGENT_MODEL` | `gemini-2.5-flash-native-audio-preview-12-2025` | Gemini voice model |
| `AI_CORE_URL` | `http://localhost:8001` | AI Core for voice assessment scoring |
| `INSTITUTE_SERVICE_URL` | `http://localhost:5003` | Institute Service for session lifecycle |
| `MINIO_URL` | `http://localhost:9000` | MinIO for course document retrieval |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO secret key |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant vector DB for course KB |
| `QDRANT_API_KEY` | — | Qdrant API key (leave empty for local) |
| `COURSE_KB_ENABLED` | `true` | Enable course knowledge base retrieval |
| `COURSE_KB_COLLECTION_NAME` | `course_kb` | Qdrant collection name |
| `SIP_SERVER_HOST` | `localhost` | SIP server bind host |
| `SIP_SDP_HOST` | `127.0.0.1` | SDP media host for RTP |
| `SIP_SDP_PORT` | `20000` | Starting RTP port |
| `SIP_USE_RTP` | `false` | Enable RTP for SIP media |
| `OPENWEATHER_API_KEY` | — | Optional: weather tool for agent |

---

## Facial Recognition Server (`/backend/facial_recognition_server/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8003` | Port the service listens on |
| `FACE_MODEL` | `Facenet512` | DeepFace model: `Facenet512`, `ArcFace`, `VGG-Face`, `Facenet` |
| `DETECTOR_BACKEND` | `opencv` | Face detector: `opencv`, `retinaface`, `mtcnn`, `ssd` |
| `DISTANCE_THRESHOLD` | `0.30` | Cosine distance threshold for match (lower = stricter) |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:3001,http://localhost:5001` | Allowed CORS origins |

---

## Frontend Portals (`/frontend/institute_protal/.env` and `/frontend/sass_protal/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5001` | API Gateway URL (all API calls route through this) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | — | Firebase project API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | — | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | — | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | — | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | — | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | — | Firebase app ID |

---

## Infrastructure (Docker Compose)

These are set inside `docker-compose.yml` and can be overridden with a `.env` file at the project root.

| Service | Variable | Default |
|---------|----------|---------|
| PostgreSQL | `POSTGRES_USER` | `postgres` |
| PostgreSQL | `POSTGRES_PASSWORD` | `yohanmano123` |
| PostgreSQL | `POSTGRES_DB` | `dev` |
| MinIO | `MINIO_ROOT_USER` | `minioadmin` |
| MinIO | `MINIO_ROOT_PASSWORD` | `minioadmin` |
| Redis | `--maxmemory` | `100mb` |

---

## Shared Secrets Checklist

These values must be consistent across services:

| Secret | Services that must share it |
|--------|-----------------------------|
| `JWT_SECRET` | SaaS Service, Institute Service |
| `GATEWAY_SECRET` | API Gateway, SaaS Service, Institute Service |
| `MINIO_ACCESS_KEY` + `MINIO_SECRET_KEY` | SaaS Service, Institute Service, Voice Agent, AI Core |
| `DB_*` credentials | SaaS Service, Institute Service (shared database) |
