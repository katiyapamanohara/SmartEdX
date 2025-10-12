# API Gateway - Microservices Architecture

This API Gateway implements a robust microservices architecture pattern for routing and managing requests to multiple downstream services.

## Architecture Overview

```
┌─────────────┐
│   Clients   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│          API Gateway (NestJS)            │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │   Authentication & Authorization    │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │   Service Registry & Discovery     │ │
│  │   - Health Checks                  │ │
│  │   - Circuit Breaker                │ │
│  │   - Load Balancing (future)        │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │   Request Routing & Forwarding     │ │
│  │   - Correlation ID                 │ │
│  │   - Logging & Tracing              │ │
│  │   - Error Handling                 │ │
│  └────────────────────────────────────┘ │
└───┬──────────────┬──────────────┬───────┘
    │              │              │
    ▼              ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────┐
│  Quiz   │  │   User   │  │Analytics │
│ Service │  │ Service  │  │ Service  │
└─────────┘  └──────────┘  └──────────┘
```

## Features

### 🔀 Service Registry & Discovery
- Automatic registration of microservices from configuration
- Dynamic service discovery
- Health check monitoring (every 30 seconds)
- Service status tracking (UP, DOWN, DEGRADED, UNKNOWN)

### 🔌 Circuit Breaker Pattern
- Prevents cascading failures
- Automatic circuit opening after 5 consecutive failures
- Self-healing with half-open state
- 60-second timeout before retry attempts

### 📊 Request Routing
- Dynamic route mapping to downstream services
- Preserves HTTP method, headers, query params, and body
- Correlation ID for distributed tracing
- Request/response logging with timing metrics

### 🏥 Health Monitoring
- Gateway health endpoint: `GET /gateway/health`
- Service registry endpoint: `GET /gateway/services`
- Aggregate health status: `GET /gateway/services/health`

### 🛡️ Error Handling
- Graceful degradation
- Detailed error responses with service context
- Timeout handling (504 Gateway Timeout)
- Connection failure handling (503 Service Unavailable)

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Quiz Service
QUIZ_SERVICE_URL=http://localhost:4001
QUIZ_SERVICE_TIMEOUT=10000
QUIZ_SERVICE_RETRIES=3

# User Service
USER_SERVICE_URL=http://localhost:4002
USER_SERVICE_TIMEOUT=10000
USER_SERVICE_RETRIES=3

# Analytics Service
ANALYTICS_SERVICE_URL=http://localhost:4003
ANALYTICS_SERVICE_TIMEOUT=10000
ANALYTICS_SERVICE_RETRIES=3

# Defaults
DEFAULT_SERVICE_TIMEOUT=10000
DEFAULT_SERVICE_RETRIES=3
```

### Adding New Services

1. **Update the configuration** (`src/gateway/config/services.config.ts`):
```typescript
export default registerAs('microservices', (): ServicesConfiguration => ({
  services: {
    // ... existing services
    payment: {
      name: 'payment-service',
      baseUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:4004',
      timeout: parseInt(process.env.PAYMENT_SERVICE_TIMEOUT || '10000', 10),
      retries: parseInt(process.env.PAYMENT_SERVICE_RETRIES || '3', 10),
      healthCheck: '/health',
    },
  },
}));
```

2. **Add route handler** (`src/gateway/controllers/gateway.controller.ts`):
```typescript
@All('payment/*')
@ApiOperation({ summary: 'Proxy to Payment Service' })
async proxyPayment(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
  return this.proxyToService('payment', req, res);
}
```

3. **Update environment variables**:
```env
PAYMENT_SERVICE_URL=http://localhost:4004
PAYMENT_SERVICE_TIMEOUT=10000
PAYMENT_SERVICE_RETRIES=3
```

## API Routes

### Gateway Management

#### Health Check
```bash
GET /gateway/health
```
Returns gateway status.

#### List Services
```bash
GET /gateway/services
```
Returns all registered microservices.

#### Services Health
```bash
GET /gateway/services/health
```
Returns health status of all downstream services.

### Microservice Proxying

#### Quiz Service
All requests to `/quiz/*` are forwarded to the Quiz Service:
```bash
GET    /quiz/quizzes
POST   /quiz/quizzes
GET    /quiz/quizzes/:id
PUT    /quiz/quizzes/:id
DELETE /quiz/quizzes/:id
```

#### User Service
All requests to `/user-service/*` are forwarded to the User Service:
```bash
GET    /user-service/profile
POST   /user-service/preferences
```

#### Analytics Service
All requests to `/analytics/*` are forwarded to the Analytics Service:
```bash
GET    /analytics/dashboard
POST   /analytics/events
GET    /analytics/reports
```

## Request Flow

1. **Client Request** → API Gateway
2. **Authentication** (if required via existing Auth module)
3. **Service Lookup** → Service Registry checks if service exists
4. **Circuit Breaker Check** → Ensures service is available
5. **Request Forwarding** → Adds correlation ID, forwards to service
6. **Response Handling** → Returns response with timing headers
7. **Health Update** → Records success/failure for circuit breaker

## Headers

### Outgoing Headers (Gateway → Service)
- `X-Correlation-ID`: Unique request ID for tracing
- `X-Forwarded-For`: Original client IP
- `X-Forwarded-Host`: Original host
- `X-Gateway-Service`: Always "api-gateway"
- All original request headers (except hop-by-hop)

### Incoming Headers (Service → Client)
- `X-Gateway-Service`: Name of the target service
- `X-Response-Time`: Request processing time in ms
- All service response headers (except hop-by-hop)

## Monitoring & Logging

### Log Format
```
[HTTP] GET /quiz/quizzes 200 1234b - Mozilla/5.0... 127.0.0.1 - 45ms
[GatewayService] Forwarding GET request to quiz-service: /quizzes
[GatewayService] Response from quiz-service: 200 (42ms)
[GatewayController] GET /quiz/quizzes -> quiz [200] (45ms)
```

### Error Logs
```
[GatewayService] Error forwarding to quiz-service: Connection refused (100ms)
[GatewayController] GET /quiz/quizzes -> quiz [ERROR] (100ms): Service 'quiz' is not reachable
```

## Circuit Breaker States

### CLOSED (Normal Operation)
- All requests pass through
- Failures are tracked

### OPEN (Service Unavailable)
- Requests fail fast without calling the service
- Returns 503 Service Unavailable
- Transitions to HALF_OPEN after 60 seconds

### HALF_OPEN (Testing Recovery)
- Limited requests allowed through
- Success → Returns to CLOSED
- Failure → Returns to OPEN

## Error Responses

### Service Not Found (503)
```json
{
  "message": "Service 'unknown' not found",
  "availableServices": ["quiz", "user", "analytics"]
}
```

### Circuit Breaker Open (503)
```json
{
  "message": "Service 'quiz' is temporarily unavailable (circuit breaker open)",
  "service": "quiz-service"
}
```

### Connection Refused (503)
```json
{
  "message": "Service 'quiz' is not reachable",
  "service": "quiz-service",
  "error": "Connection refused"
}
```

### Timeout (504)
```json
{
  "message": "Service 'quiz' request timed out",
  "service": "quiz-service",
  "timeout": 10000
}
```

## Development

### Running the Gateway

#### With Docker Compose
```bash
docker compose up -d --build
```

#### Local Development
```bash
# Start dependencies
docker compose up -d postgres adminer maildev

# Install and run
npm install
npm run migration:run
npm run seed:run:relational
npm run start:dev
```

### Testing Service Integration

1. **Start a mock service** (example with Express):
```javascript
// mock-quiz-service.js
const express = require('express');
const app = express();

app.get('/health', (req, res) => res.json({ status: 'UP' }));
app.get('/quizzes', (req, res) => res.json([{ id: 1, title: 'Test Quiz' }]));

app.listen(4001, () => console.log('Quiz service on :4001'));
```

2. **Test via gateway**:
```bash
curl http://localhost:3000/quiz/quizzes
curl http://localhost:3000/gateway/services/health
```

## Best Practices

1. **Always implement health checks** in your microservices at `/health`
2. **Use correlation IDs** for distributed tracing across services
3. **Set appropriate timeouts** based on service SLA
4. **Monitor circuit breaker metrics** to detect service issues
5. **Implement proper error handling** in downstream services
6. **Use semantic versioning** for API contracts
7. **Add authentication/authorization** at gateway level when needed

## Future Enhancements

- [ ] Rate limiting per service
- [ ] Request/response caching
- [ ] Load balancing across multiple service instances
- [ ] Service mesh integration (Istio, Linkerd)
- [ ] Advanced tracing (OpenTelemetry, Jaeger)
- [ ] API versioning support
- [ ] GraphQL federation support
- [ ] WebSocket proxying
- [ ] gRPC support

## Troubleshooting

### Service shows as DOWN
- Check if the service is running: `curl http://localhost:4001/health`
- Verify environment variables are correct
- Check network connectivity

### Circuit breaker keeps opening
- Service may be unstable or overloaded
- Check service logs for errors
- Adjust `FAILURE_THRESHOLD` if needed

### Requests timing out
- Increase service timeout: `QUIZ_SERVICE_TIMEOUT=20000`
- Check service performance
- Review network latency

## License

MIT
