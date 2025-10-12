# Microservices Architecture Diagram

## System Architecture

```
                                    Internet / Clients
                                           |
                                           |
                                           ▼
        ┌───────────────────────────────────────────────────────────┐
        │                                                            │
        │                      Load Balancer                         │
        │                    (Future: Nginx/ALB)                     │
        │                                                            │
        └───────────────────────────────┬───────────────────────────┘
                                        |
                                        |
                                        ▼
        ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
        ┃                   API Gateway (Port 3000)                 ┃
        ┃                        NestJS                             ┃
        ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┯━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
        │                               │                             │
        │  ┌────────────────────────────┴─────────────────────────┐ │
        │  │         Service Registry & Discovery                  │ │
        │  │  • Health Monitoring (30s intervals)                 │ │
        │  │  • Circuit Breaker (5 failures → open)              │ │
        │  │  • Service Status Tracking                           │ │
        │  └───────────────────────────────────────────────────────┘ │
        │                                                             │
        │  ┌─────────────────────────────────────────────────────┐  │
        │  │         Request Processing Layer                     │  │
        │  │  • Authentication & Authorization                    │  │
        │  │  • Rate Limiting (Future)                           │  │
        │  │  • Request Validation                               │  │
        │  │  • Logging & Tracing                                │  │
        │  └─────────────────────────────────────────────────────┘  │
        │                                                             │
        │  ┌─────────────────────────────────────────────────────┐  │
        │  │            Routing & Forwarding                      │  │
        │  │  • /quiz/*        → Quiz Service                    │  │
        │  │  • /user-service/* → User Service                    │  │
        │  │  • /analytics/*   → Analytics Service               │  │
        │  │  • /api/v1/*      → Built-in NestJS modules         │  │
        │  └─────────────────────────────────────────────────────┘  │
        │                                                             │
        └─────┬──────────────────────┬──────────────────────┬────────┘
              │                      │                      │
              │                      │                      │
              ▼                      ▼                      ▼
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │  Quiz Service    │  │  User Service    │  │ Analytics Service│
    │   (Port 4001)    │  │   (Port 4002)    │  │   (Port 4003)    │
    │                  │  │                  │  │                  │
    │  • Quizzes CRUD  │  │  • User Prefs    │  │  • Dashboard     │
    │  • Questions     │  │  • Profiles      │  │  • Events        │
    │  • Submissions   │  │  • Settings      │  │  • Reports       │
    │  • Health Check  │  │  • Health Check  │  │  • Health Check  │
    └──────────────────┘  └──────────────────┘  └──────────────────┘
              │                      │                      │
              │                      │                      │
              └──────────────────────┴──────────────────────┘
                                     │
                                     ▼
              ┌─────────────────────────────────────────┐
              │     Shared Infrastructure               │
              │                                         │
              │  ┌──────────────┐  ┌────────────────┐ │
              │  │  PostgreSQL  │  │     Redis      │ │
              │  │  (Port 5432) │  │  (Port 6379)   │ │
              │  └──────────────┘  └────────────────┘ │
              │                                         │
              │  ┌──────────────┐  ┌────────────────┐ │
              │  │   Maildev    │  │    Adminer     │ │
              │  │  (Port 1080) │  │  (Port 8080)   │ │
              │  └──────────────┘  └────────────────┘ │
              └─────────────────────────────────────────┘
```

## Request Flow

```
1. Client Request
   └→ GET /quiz/quizzes
      │
      ▼
2. API Gateway receives request
   ├→ Extract correlation ID (or generate new)
   ├→ Log incoming request
   └→ Route to appropriate handler
      │
      ▼
3. Gateway Controller
   ├→ Identify service: 'quiz'
   └→ Call GatewayService.forwardToService('quiz', req)
      │
      ▼
4. Gateway Service
   ├→ Lookup service config from registry
   ├→ Check circuit breaker state
   │  ├─ OPEN → Fail fast (503)
   │  ├─ HALF_OPEN → Limited pass-through
   │  └─ CLOSED → Allow request
   ├→ Get Axios client for service
   └→ Build target URL
      │
      ▼
5. Forward Request
   ├→ Add tracing headers:
   │  ├─ X-Correlation-ID
   │  ├─ X-Forwarded-For
   │  └─ X-Forwarded-Host
   ├→ Strip hop-by-hop headers
   └→ Send to Quiz Service
      │
      ▼
6. Quiz Service processes request
   ├→ Query database
   ├→ Business logic
   └→ Return response
      │
      ▼
7. Gateway receives response
   ├→ Record success/failure for circuit breaker
   ├→ Log response time
   └→ Add gateway headers:
      ├─ X-Gateway-Service
      └─ X-Response-Time
      │
      ▼
8. Return to client
   └→ HTTP 200 with JSON data
```

## Circuit Breaker State Machine

```
                    ┌─────────────┐
                    │   CLOSED    │
                    │  (Normal)   │
                    └──────┬──────┘
                           │
                    Success recorded
                    Failure tracked
                           │
                Failure count < 5? Yes
                           │
                           ▼
                    Continue normal
                           │
                Failure count ≥ 5? Yes
                           │
                           ▼
                    ┌─────────────┐
             ┌─────►│    OPEN     │
             │      │  (Fail Fast)│
             │      └──────┬──────┘
             │             │
             │      All requests fail
             │      with 503 immediately
             │             │
             │      After 60 seconds
             │             │
             │             ▼
             │      ┌─────────────┐
             │      │  HALF_OPEN  │
             │      │ (Testing)   │
             │      └──────┬──────┘
             │             │
             │      Allow limited
             │      pass-through
             │             │
             │      ┌──────┴──────┐
             │      │             │
             │   Success       Failure
             │      │             │
             └──────┘             │
                                  ▼
                           Return to OPEN
```

## Service Health Check Flow

```
Every 30 seconds:

Service Registry
   └→ For each registered service:
      ├→ GET {baseURL}/health
      │  ├─ Success (200) → Mark as UP
      │  │                   Record response time
      │  │                   Reset circuit breaker
      │  │
      │  └─ Failure → Mark as DOWN
      │              Record error message
      │              Increment circuit breaker
      │
      └→ Update health cache
         └→ Available via /gateway/services/health
```

## Data Flow Example

```
Client: curl http://localhost:3000/quiz/quizzes

┌─────────────────────────────────────────────────────────────┐
│ 1. API Gateway (Logging Interceptor)                        │
│    Log: GET /quiz/quizzes - 127.0.0.1                       │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│ 2. Gateway Controller                                        │
│    Match route: /quiz/*                                      │
│    Extract service: 'quiz'                                   │
│    Call: proxyToService('quiz', req, res)                    │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│ 3. Gateway Service                                           │
│    Log: Forwarding GET to quiz-service: /quizzes            │
│    Headers added:                                            │
│      X-Correlation-ID: 1733123456789-abc123                 │
│      X-Forwarded-For: 127.0.0.1                             │
│      X-Gateway-Service: api-gateway                         │
└─────────────────────────────┬───────────────────────────────┘
                              │
                    HTTP GET request
                              │
┌─────────────────────────────▼───────────────────────────────┐
│ 4. Quiz Service (Port 4001)                                  │
│    Log: GET /quizzes                                         │
│    Headers received:                                         │
│      X-Correlation-ID: 1733123456789-abc123                 │
│      X-Forwarded-For: 127.0.0.1                             │
│    Process request → Query DB → Build response              │
└─────────────────────────────┬───────────────────────────────┘
                              │
                   HTTP 200 response
                     JSON payload
                              │
┌─────────────────────────────▼───────────────────────────────┐
│ 5. Gateway Service                                           │
│    Record success for circuit breaker                        │
│    Log: Response from quiz-service: 200 (42ms)              │
│    Add headers:                                              │
│      X-Gateway-Service: quiz                                 │
│      X-Response-Time: 42ms                                   │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│ 6. Gateway Controller                                        │
│    Log: GET /quiz/quizzes -> quiz [200] (45ms)              │
│    Forward response to client                                │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│ 7. Logging Interceptor                                       │
│    Log: GET /quiz/quizzes 200 1234b - 127.0.0.1 - 45ms     │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
                          Client
                  Receives JSON response
```

## Monitoring Architecture

```
                    ┌─────────────────┐
                    │   Developers    │
                    └────────┬────────┘
                             │
                    View logs, metrics
                             │
    ┌────────────────────────┼────────────────────────┐
    │                        │                        │
    ▼                        ▼                        ▼
┌─────────┐          ┌──────────────┐        ┌──────────────┐
│ Docker  │          │   Health     │        │   Swagger    │
│  Logs   │          │  Endpoints   │        │     UI       │
│         │          │              │        │              │
│ docker  │          │ /gateway/    │        │   /docs      │
│ compose │          │   health     │        │              │
│ logs -f │          │              │        │ Interactive  │
└─────────┘          │ /gateway/    │        │ API testing  │
                     │   services   │        └──────────────┘
                     │              │
                     │ /gateway/    │
                     │   services/  │
                     │   health     │
                     └──────────────┘
                             │
                    Real-time status
                             │
                    ┌────────▼────────┐
                    │ Service Registry │
                    │                  │
                    │ Health Cache:    │
                    │ • quiz: UP       │
                    │ • user: DOWN     │
                    │ • analytics: UP  │
                    └──────────────────┘
```

## Deployment Architecture (Future)

```
                      Cloud Provider (AWS/GCP/Azure)
                                  │
                                  │
                    ┌─────────────▼─────────────┐
                    │     Load Balancer         │
                    │  (AWS ALB / GCP LB)       │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   API Gateway Cluster     │
                    │   (Kubernetes Pods)       │
                    │                           │
                    │   ┌───┐ ┌───┐ ┌───┐      │
                    │   │GW1│ │GW2│ │GW3│      │
                    │   └───┘ └───┘ └───┘      │
                    └─────────────┬─────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │ Quiz Service    │ │ User Service    │ │Analytics Service│
    │   Cluster       │ │   Cluster       │ │   Cluster       │
    │                 │ │                 │ │                 │
    │ ┌───┐ ┌───┐    │ │ ┌───┐ ┌───┐    │ │ ┌───┐ ┌───┐    │
    │ │Q1 │ │Q2 │    │ │ │U1 │ │U2 │    │ │ │A1 │ │A2 │    │
    │ └───┘ └───┘    │ │ └───┘ └───┘    │ │ └───┘ └───┘    │
    └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
             │                   │                   │
             └───────────────────┼───────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Managed Databases      │
                    │  • PostgreSQL (RDS)     │
                    │  • Redis (ElastiCache)  │
                    └─────────────────────────┘
```

---

**Legend:**
- `┌─┐` = Container/Service
- `│ │` = Connection
- `▼ ▲` = Data flow direction
- `→` = Process flow
