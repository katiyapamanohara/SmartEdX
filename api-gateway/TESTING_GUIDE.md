# Testing the Microservices Gateway

This guide will help you test the API Gateway with the microservices architecture.

## Quick Start

### 1. Start the API Gateway

```bash
cd api-gateway

# Option A: With Docker
docker compose up -d --build

# Option B: Local development
npm install
npm run migration:run
npm run seed:run:relational
npm run start:dev
```

### 2. Start the Mock Quiz Service

In a new terminal:

```bash
cd api-gateway
node mock-quiz-service.js
```

You should see:
```
========================================
🎯 Mock Quiz Service
🚀 Running on http://localhost:4001
========================================
```

### 3. Test the Integration

#### Check Gateway Health
```bash
curl http://localhost:3000/gateway/health
```

Expected response:
```json
{
  "status": "UP",
  "timestamp": "2025-10-08T...",
  "gateway": "api-gateway",
  "version": "1.0.0"
}
```

#### Check Services Health
```bash
curl http://localhost:3000/gateway/services/health
```

Expected response:
```json
{
  "timestamp": "2025-10-08T...",
  "summary": {
    "total": 3,
    "up": 1,
    "down": 2,
    "degraded": 0,
    "unknown": 0
  },
  "services": [
    {
      "name": "quiz-service",
      "status": "UP",
      "responseTime": 15,
      "lastChecked": "2025-10-08T..."
    },
    {
      "name": "user-service",
      "status": "DOWN",
      "lastChecked": "2025-10-08T...",
      "error": "connect ECONNREFUSED 127.0.0.1:4002"
    },
    {
      "name": "analytics-service",
      "status": "DOWN",
      "lastChecked": "2025-10-08T...",
      "error": "connect ECONNREFUSED 127.0.0.1:4003"
    }
  ]
}
```

#### List Registered Services
```bash
curl http://localhost:3000/gateway/services
```

## Test Quiz Service Endpoints

### Authentication Required

All microservice endpoints now require authentication. First, get a token:

```bash
# 1. Register a user (if not already registered)
curl -X POST http://localhost:3000/api/v1/auth/email/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Secret123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# 2. Login to get token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Secret123!"
  }')

# 3. Extract token
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
echo "Token: $TOKEN"

# 4. Use token for requests
export TOKEN=$TOKEN
```

### Get All Quizzes
```bash
curl http://localhost:3000/quiz/quizzes \
  -H "Authorization: Bearer $TOKEN"
```

Expected response:
```json
{
  "data": [
    {
      "id": 1,
      "title": "JavaScript Basics",
      "description": "Test your JavaScript knowledge",
      "questions": 10,
      "difficulty": "easy",
      "createdAt": "2025-01-01T00:00:00Z"
    },
    ...
  ],
  "total": 3,
  "page": 1,
  "limit": 10,
  "user": {
    "id": "1",
    "email": "test@example.com",
    "name": "Test User"
  }
}
```

### Get Single Quiz
```bash
curl http://localhost:3000/quiz/quizzes/1 \
  -H "Authorization: Bearer $TOKEN"
```

### Create Quiz
```bash
curl -X POST http://localhost:3000/quiz/quizzes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Node.js Fundamentals",
    "description": "Master Node.js basics",
    "questions": 8,
    "difficulty": "medium"
  }'
```

Expected response includes creator info:
```json
{
  "id": 4,
  "title": "Node.js Fundamentals",
  "description": "Master Node.js basics",
  "questions": 8,
  "difficulty": "medium",
  "createdAt": "2025-10-08T...",
  "createdBy": {
    "id": "1",
    "email": "test@example.com"
  }
}
```

### Update Quiz
```bash
curl -X PUT http://localhost:3000/quiz/quizzes/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "JavaScript Basics - Updated",
    "difficulty": "medium"
  }'
```

### Delete Quiz
```bash
curl -X DELETE http://localhost:3000/quiz/quizzes/3 \
  -H "Authorization: Bearer $TOKEN"
```

### Get Quiz Questions
```bash
curl http://localhost:3000/quiz/quizzes/1/questions \
  -H "Authorization: Bearer $TOKEN"
```

## Test Without Authentication

Try accessing without a token to see the error:

```bash
curl http://localhost:3000/quiz/quizzes
```

Expected response:
```json
{
  "statusCode": 401,
  "message": "Authentication required",
  "error": "Unauthorized"
}
```

## Test Role-Based Access

### Admin-Only Endpoint (Analytics)

```bash
# As regular user (will fail)
curl http://localhost:3000/analytics/dashboard \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
{
  "statusCode": 403,
  "message": "Access denied. Required roles: 1",
  "error": "Forbidden"
}
```

To test admin access, create an admin user (via database or API):

```bash
# First, manually update user role in database:
# UPDATE "user" SET "roleId" = 1 WHERE "email" = 'admin@example.com';

# Then login as admin and get admin token
ADMIN_LOGIN=$(curl -s -X POST http://localhost:3000/api/v1/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminSecret123!"
  }')

ADMIN_TOKEN=$(echo $ADMIN_LOGIN | jq -r '.token')

# Now try analytics endpoint
curl http://localhost:3000/analytics/dashboard \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Test Request Tracing

Check the gateway logs to see correlation IDs and timing:

```bash
# Docker
docker compose logs -f api

# Local
# Check terminal where you ran npm run start:dev
```

Expected log output:
```
[HTTP] GET /quiz/quizzes 200 456b - curl/7.84.0 127.0.0.1 - 125ms
[GatewayService] Forwarding GET request to quiz-service: /quizzes
[GatewayService] Response from quiz-service: 200 (102ms)
[GatewayController] GET /quiz/quizzes -> quiz [200] (125ms)
```

## Test Circuit Breaker

### 1. Stop the Quiz Service
```bash
# Press Ctrl+C in the terminal running mock-quiz-service.js
```

### 2. Make Multiple Requests (to trigger circuit breaker)
```bash
for i in {1..10}; do
  curl http://localhost:3000/quiz/quizzes
  echo ""
done
```

After 5 failures, you should see:
```json
{
  "message": "Service 'quiz' is temporarily unavailable (circuit breaker open)",
  "service": "quiz-service"
}
```

### 3. Check Logs
```
[GatewayService] Error forwarding to quiz-service: connect ECONNREFUSED 127.0.0.1:4001 (15ms)
[ServiceRegistryService] Circuit breaker opened for service: quiz after 5 failures
```

### 4. Restart Quiz Service
```bash
node mock-quiz-service.js
```

Wait 60 seconds for the circuit breaker to attempt half-open state, then try again:
```bash
curl http://localhost:3000/quiz/quizzes
```

## Test Error Handling

### Service Not Found
```bash
curl http://localhost:3000/unknown-service/test
```

Response:
```json
{
  "message": "Service 'unknown-service' is not found",
  "availableServices": ["quiz", "user", "analytics"]
}
```

### Timeout (modify mock service to delay response)
Edit `mock-quiz-service.js` and change timeout to 15000ms (15 seconds), then:

```bash
curl http://localhost:3000/quiz/quizzes
```

Response after 10 seconds:
```json
{
  "message": "Service 'quiz' request timed out",
  "service": "quiz-service",
  "timeout": 10000
}
```

## Test with Authentication

If you want to add authentication, requests through the gateway can use the existing auth system:

### 1. Register a User
```bash
curl -X POST http://localhost:3000/api/v1/auth/email/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "secret123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "secret123"
  }'
```

Save the `token` from the response.

### 3. Access Protected Routes (if you add auth guards)
```bash
curl http://localhost:3000/quiz/quizzes \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Performance Testing

### Basic Load Test with Apache Bench
```bash
# 1000 requests, 10 concurrent
ab -n 1000 -c 10 http://localhost:3000/quiz/quizzes
```

### With curl-loader (if installed)
```bash
curl-loader -n 1000 -c 10 http://localhost:3000/quiz/quizzes
```

## Swagger Documentation

Access the interactive API docs:
```
http://localhost:3000/docs
```

You'll see all gateway endpoints documented, including:
- Gateway Health & Monitoring
- Microservices Proxy routes

## Monitoring Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/gateway/health` | GET | Gateway health status |
| `/gateway/services` | GET | List all registered services |
| `/gateway/services/health` | GET | Health status of all services |
| `/quiz/*` | ALL | Proxy to Quiz Service |
| `/user-service/*` | ALL | Proxy to User Service |
| `/analytics/*` | ALL | Proxy to Analytics Service |

## Troubleshooting

### Gateway returns 502 Bad Gateway
- Check if the downstream service is running
- Verify the service URL in `.env` is correct
- Check service logs for errors

### Circuit breaker won't close
- Wait for the full timeout period (60 seconds)
- Check service health endpoint directly: `curl http://localhost:4001/health`
- Restart both gateway and service

### Requests are slow
- Check `X-Response-Time` header to see where time is spent
- Review service logs for performance issues
- Consider increasing timeout values

### Service shows as DOWN but is running
- Check health endpoint format: must return 200 status
- Verify health check path in config: `/health`
- Check network connectivity between services

## Next Steps

1. **Add More Services**: Create mock services for user and analytics
2. **Implement Auth Guards**: Protect routes with existing auth module
3. **Add Rate Limiting**: Prevent abuse
4. **Set Up Monitoring**: Use Prometheus/Grafana
5. **Deploy to Production**: Use Docker Compose or Kubernetes

## Additional Resources

- [Gateway README](./GATEWAY_README.md) - Complete architecture documentation
- [NestJS Microservices](https://docs.nestjs.com/microservices/basics)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [API Gateway Pattern](https://microservices.io/patterns/apigateway.html)
