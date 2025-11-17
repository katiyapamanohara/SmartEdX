# API Gateway

The API Gateway serves as the single entry point for all client requests to the AI Quiz System microservices architecture.

## Features

- **Request Routing**: Routes requests to appropriate microservices (User, Course, Quiz)
- **Logging**: Comprehensive request/response logging
- **Error Handling**: Global exception handling with detailed error responses
- **CORS**: Configurable CORS support for cross-origin requests
- **Health Checks**: Built-in health check endpoints
- **Validation**: Request validation using class-validator

## Architecture

```
Client → API Gateway → Microservices
                    ↓
              - User Service (3001)
              - Course Service (3002)
              - Quiz Service (3003)
```

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file based on `.env.example`:

```env
PORT=3000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3001,http://localhost:3002,http://localhost:3003

# Microservices URLs
USER_SERVICE_URL=http://localhost:3001
COURSE_SERVICE_URL=http://localhost:3002
QUIZ_SERVICE_URL=http://localhost:3003
```

## Running the Gateway

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Endpoints

### Gateway Information

- `GET /` - Welcome message
- `GET /health` - Health check
- `GET /api` - API information and available endpoints

### Proxied Routes

All requests are forwarded to respective microservices:

#### User Service
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

#### Course Service
- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get course by ID
- `POST /api/courses` - Create course
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course

#### Quiz Service
- `GET /api/quizzes` - Get all quizzes
- `GET /api/quizzes/:id` - Get quiz by ID
- `POST /api/quizzes` - Create quiz
- `PUT /api/quizzes/:id` - Update quiz
- `DELETE /api/quizzes/:id` - Delete quiz

## Project Structure

```
src/
├── core/                       # Core functionality
│   ├── filters/               # Exception filters
│   │   └── http-exception.filter.ts
│   └── interceptors/          # Request/response interceptors
│       └── logging.interceptor.ts
├── infra/                     # Infrastructure layer
│   ├── config/               # Configuration files
│   │   └── services.config.ts
│   └── http/                 # HTTP client wrapper
│       ├── http.module.ts
│       └── http.service.ts
├── modules/                   # Feature modules
│   ├── user-proxy/           # User service proxy
│   ├── course-proxy/         # Course service proxy
│   └── quiz-proxy/           # Quiz service proxy
├── app.module.ts             # Root module
├── app.controller.ts         # Root controller
├── app.service.ts            # Root service
└── main.ts                   # Application entry point
```

## Development

```bash
# Watch mode
npm run start:dev

# Run tests
npm run test

# E2E tests
npm run test:e2e

# Lint
npm run lint

# Format
npm run format
```

## Testing the Gateway

```bash
# Test health check
curl http://localhost:3000/health

# Test API info
curl http://localhost:3000/api

# Test user proxy (requires user-service running)
curl http://localhost:3000/api/users
```

## Error Handling

The gateway provides standardized error responses:

```json
{
  "statusCode": 500,
  "timestamp": "2025-11-17T12:00:00.000Z",
  "path": "/api/users",
  "message": "Internal server error"
}
```

## Logging

All requests and responses are logged with:
- HTTP method
- URL
- Status code
- Response time

Example:
```
Incoming Request: GET /api/users
Outgoing Response: GET /api/users 200 - 45ms
```

## Notes

- Ensure all microservices are running before starting the gateway
- The gateway will proxy requests even if services are down (will return appropriate errors)
- Configure CORS origins based on your frontend application URLs
