# SmartEdX — Environment Variable Reference

Copy `.env.example` to `.env` in each service directory. Variables marked **Required** must be set for the service to start correctly.

**Shared secrets** (must be identical across services):
- `JWT_SECRET` — SaaS Service + Institute Service
- `GATEWAY_SECRET` — API Gateway + SaaS Service + Institute Service
- `MINIO_*` credentials — all services that touch file storage

---

## API Gateway (`api-gateway/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | Yes | `5001` | Gateway listen port |
| `SAAS_SERVICE_URL` | Yes | — | SaaS Service URL (e.g. `http://localhost:5002`) |
| `INSTITUTE_SERVICE_URL` | Yes | — | Institute Service URL (e.g. `http://localhost:5003`) |
| `AI_CORE_URL` | Yes | — | AI Core URL (e.g. `http://localhost:8001`) |
| `VOICE_AGENT_URL` | Yes | — | Voice Agent URL (e.g. `http://localhost:8002`) |
| `GATEWAY_SECRET` | Yes | — | Shared secret for inter-service auth |
| `CORS_ORIGIN` | Yes | — | Comma-separated allowed origins (e.g. `http://localhost:3000,http://localhost:3001`) |

---

## SaaS Service (`backend/saas_service/.env`)

### Database
| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_HOST` | Yes | `localhost` | PostgreSQL host |
| `DB_PORT` | Yes | `5432` | PostgreSQL port |
| `DB_USERNAME` | Yes | `postgres` | Database username |
| `DB_PASSWORD` | Yes | — | Database password |
| `DB_DATABASE` | Yes | `saas_service` | Database name |

### Auth & Security
| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | Yes | — | JWT signing secret (shared with Institute Service) |
| `JWT_EXPIRATION` | No | `1d` | JWT expiry duration |
| `GATEWAY_SECRET` | Yes | — | Shared gateway validation secret |

### Firebase
| Variable | Required | Default | Description |
|---|---|---|---|
| `FIREBASE_PROJECT_ID` | Yes | — | Firebase project ID |
| `FIREBASE_PRIVATE_KEY` | Yes | — | Firebase service account private key |
| `FIREBASE_CLIENT_EMAIL` | Yes | — | Firebase service account email |

### MinIO
| Variable | Required | Default | Description |
|---|---|---|---|
| `MINIO_ENDPOINT` | Yes | `localhost` | MinIO host |
| `MINIO_PORT` | Yes | `9000` | MinIO port |
| `MINIO_ACCESS_KEY` | Yes | — | MinIO access key |
| `MINIO_SECRET_KEY` | Yes | — | MinIO secret key |
| `MINIO_BUCKET` | Yes | `smartedx-bucket` | MinIO bucket name |
| `MINIO_USE_SSL` | No | `false` | Use TLS for MinIO |

### Redis
| Variable | Required | Default | Description |
|---|---|---|---|
| `REDIS_HOST` | Yes | `localhost` | Redis host |
| `REDIS_PORT` | Yes | `6379` | Redis port |
| `REDIS_PASSWORD` | No | — | Redis password (if auth enabled) |

### PayHere
| Variable | Required | Default | Description |
|---|---|---|---|
| `PAYHERE_MERCHANT_ID` | Yes | — | PayHere merchant ID |
| `PAYHERE_SECRET` | Yes | — | PayHere merchant secret |
| `PAYHERE_SANDBOX` | No | `false` | Use PayHere sandbox mode |

### App
| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5002` | Service listen port |
| `NODE_ENV` | No | `development` | Node environment |

---

## Institute Service (`backend/institute_service/.env`)

### Database
| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_HOST` | Yes | `localhost` | PostgreSQL host |
| `DB_PORT` | Yes | `5432` | PostgreSQL port |
| `DB_USERNAME` | Yes | `postgres` | Database username |
| `DB_PASSWORD` | Yes | — | Database password |
| `DB_DATABASE` | Yes | `institute_service` | Database name |

### Auth & Security
| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | Yes | — | JWT signing secret (must match SaaS Service) |
| `GATEWAY_SECRET` | Yes | — | Shared gateway validation secret |

### Firebase
| Variable | Required | Default | Description |
|---|---|---|---|
| `FIREBASE_PROJECT_ID` | Yes | — | Firebase project ID |
| `FIREBASE_PRIVATE_KEY` | Yes | — | Firebase service account private key |
| `FIREBASE_CLIENT_EMAIL` | Yes | — | Firebase service account email |

### MinIO
| Variable | Required | Default | Description |
|---|---|---|---|
| `MINIO_ENDPOINT` | Yes | `localhost` | MinIO host |
| `MINIO_PORT` | Yes | `9000` | MinIO port |
| `MINIO_ACCESS_KEY` | Yes | — | MinIO access key |
| `MINIO_SECRET_KEY` | Yes | — | MinIO secret key |
| `MINIO_BUCKET` | Yes | `smartedx-bucket` | MinIO bucket name |

### Redis
| Variable | Required | Default | Description |
|---|---|---|---|
| `REDIS_HOST` | Yes | `localhost` | Redis host |
| `REDIS_PORT` | Yes | `6379` | Redis port |

### Internal Service URLs
| Variable | Required | Default | Description |
|---|---|---|---|
| `AI_CORE_URL` | Yes | — | AI Core URL (e.g. `http://localhost:8001`) |
| `FACE_REC_URL` | Yes | — | Face Recognition Server URL (e.g. `http://localhost:8003`) |
| `VOICE_AGENT_URL` | Yes | — | Voice Agent URL (e.g. `http://localhost:8002`) |

### App
| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5003` | Service listen port |
| `NODE_ENV` | No | `development` | Node environment |

---

## AI Core (`backend/ai_core/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `8001` | Service listen port |
| `AI_PROVIDER` | Yes | `anthropic` | LLM provider: `anthropic`, `openai`, or `gemini` |
| `MODEL_ID` | No | `claude-sonnet-4-6` | Model identifier for selected provider |
| `ANTHROPIC_API_KEY` | Conditional | — | Required if `AI_PROVIDER=anthropic` |
| `OPENAI_API_KEY` | Conditional | — | Required if `AI_PROVIDER=openai` |
| `GOOGLE_API_KEY` | Conditional | — | Required if `AI_PROVIDER=gemini` |

---

## Voice Agent (`backend/voice_agent/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_API_KEY` | Yes | — | Google Gemini API key (for Gemini Live) |
| `DEMO_AGENT_MODEL` | No | `gemini-2.5-flash-native-audio-preview-12-2025` | Gemini Live model ID |
| `QDRANT_URL` | Yes | `http://localhost:6333` | Qdrant vector DB URL |
| `MINIO_URL` | Yes | `http://localhost:9000` | MinIO URL |
| `MINIO_ACCESS_KEY` | Yes | — | MinIO access key |
| `MINIO_SECRET_KEY` | Yes | — | MinIO secret key |
| `INSTITUTE_SERVICE_URL` | Yes | — | Institute Service URL |
| `AI_CORE_URL` | Yes | — | AI Core URL |
| `SIP_HOST` | No | `0.0.0.0` | SIP server bind host |
| `SIP_PORT` | No | `5060` | SIP server port |
| `LANGFUSE_PUBLIC_KEY` | No | — | Langfuse observability public key |
| `LANGFUSE_SECRET_KEY` | No | — | Langfuse observability secret key |
| `LANGFUSE_HOST` | No | — | Langfuse host URL |

---

## Facial Recognition Server (`backend/facial_recognition_server/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `8003` | Service listen port |
| `FACE_MODEL` | No | `Facenet512` | DeepFace model name |
| `DETECTOR_BACKEND` | No | `opencv` | Face detector: `opencv`, `retinaface`, `mtcnn` |
| `DISTANCE_THRESHOLD` | No | `0.30` | Cosine distance threshold for verification pass |

---

## Institute Portal (`frontend/institute_protal/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | API Gateway URL (e.g. `http://localhost:5001`) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase web app ID |

---

## SaaS Portal (`frontend/sass_protal/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | API Gateway URL (e.g. `http://localhost:5001`) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase web app ID |

---

## Infrastructure (docker-compose.yml)

Infrastructure services are configured directly in `docker-compose.yml`. Override with `.env` file in the root:

| Variable | Service | Default | Description |
|---|---|---|---|
| `MINIO_ROOT_USER` | MinIO | `minioadmin` | MinIO root username |
| `MINIO_ROOT_PASSWORD` | MinIO | `minioadmin` | MinIO root password |
| `POSTGRES_USER` | PostgreSQL | `postgres` | PostgreSQL superuser |
| `POSTGRES_PASSWORD` | PostgreSQL | — | PostgreSQL password |
