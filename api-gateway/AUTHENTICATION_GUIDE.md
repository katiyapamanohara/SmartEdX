# Authentication Guide for Microservices Gateway

This guide explains how authentication is implemented in the API Gateway and how to use it.

## Overview

The API Gateway uses **JWT (JSON Web Token)** authentication to secure microservice endpoints. All requests to downstream services require a valid authentication token, except for public endpoints.

## Architecture

```
┌─────────────┐
│   Client    │
│             │
│  Token:     │
│  Bearer xxx │
└──────┬──────┘
       │
       │ Authorization: Bearer <token>
       │
       ▼
┌─────────────────────────────────────┐
│        API Gateway                   │
│                                      │
│  1. JWT Auth Guard                   │
│     ├─ Validate token               │
│     ├─ Extract user info            │
│     └─ Attach to request            │
│                                      │
│  2. Roles Guard (optional)           │
│     ├─ Check required roles         │
│     └─ Allow/Deny access            │
│                                      │
│  3. Forward with headers:            │
│     ├─ Authorization: Bearer xxx    │
│     ├─ X-User-ID                    │
│     ├─ X-User-Email                 │
│     ├─ X-User-Role                  │
│     └─ X-User-Name                  │
└──────────────┬──────────────────────┘
               │
               ▼
        ┌──────────────┐
        │ Quiz Service │
        │              │
        │ Can read     │
        │ user info    │
        │ from headers │
        └──────────────┘
```

## Getting Started

### 1. Register a User

```bash
curl -X POST http://localhost:3000/api/v1/auth/email/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Secret123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Response:**
```json
{
  "id": 1,
  "email": "test@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": {
    "id": 2,
    "name": "User"
  },
  "status": {
    "id": 2,
    "name": "Inactive"
  }
}
```

### 2. Confirm Email (if required)

Check Maildev at http://localhost:1080 for the confirmation email, or use the API:

```bash
# Get the confirmation hash from email or database
curl -X POST http://localhost:3000/api/v1/auth/email/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "hash": "confirmation-hash-from-email"
  }'
```

### 3. Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Secret123!"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenExpires": 1696789200000,
  "user": {
    "id": 1,
    "email": "test@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": {
      "id": 2,
      "name": "User"
    }
  }
}
```

**Save the token!** You'll need it for all authenticated requests.

### 4. Access Protected Microservice Routes

```bash
# Get quizzes (requires authentication)
curl http://localhost:3000/quiz/quizzes \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Create a quiz (requires authentication)
curl -X POST http://localhost:3000/quiz/quizzes \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "JavaScript Basics",
    "difficulty": "easy"
  }'
```

## Protected Routes

### All Microservice Routes Require Authentication

| Route Pattern | Auth Required | Role Required | Description |
|--------------|---------------|---------------|-------------|
| `/quiz/*` | ✅ Yes | Any authenticated user | Quiz service endpoints |
| `/user-service/*` | ✅ Yes | Any authenticated user | User service endpoints |
| `/analytics/*` | ✅ Yes | **Admin only** (Role ID: 1) | Analytics endpoints |

### Public Routes (No Authentication)

| Route | Description |
|-------|-------------|
| `/` | Home endpoint |
| `/gateway/health` | Gateway health check |
| `/gateway/services` | List services |
| `/gateway/services/health` | Services health status |
| `/api/v1/auth/*` | All authentication endpoints |
| `/docs` | Swagger documentation |

## Role-Based Access Control (RBAC)

### Available Roles

| Role ID | Role Name | Description |
|---------|-----------|-------------|
| 1 | Admin | Full access to all services |
| 2 | User | Standard user access |

### Example: Admin-Only Route

The analytics service requires admin role:

```bash
# As regular user (Role ID: 2) - Will fail with 403
curl http://localhost:3000/analytics/dashboard \
  -H "Authorization: Bearer USER_TOKEN"

# Response:
{
  "statusCode": 403,
  "message": "Access denied. Required roles: 1",
  "error": "Forbidden"
}

# As admin (Role ID: 1) - Will succeed
curl http://localhost:3000/analytics/dashboard \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Creating an Admin User

You can create an admin user by:

1. **Via Database**: Update user role directly
```sql
UPDATE "user" SET "roleId" = 1 WHERE "email" = 'admin@example.com';
```

2. **Via API (if you have admin endpoint)**: Use the users endpoint
```bash
# Login as existing admin first
curl -X POST http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newadmin@example.com",
    "password": "Secret123!",
    "firstName": "Admin",
    "lastName": "User",
    "role": { "id": 1 }
  }'
```

## User Information Forwarding

When a request is authenticated, the gateway automatically forwards user information to downstream services via headers:

### Headers Sent to Microservices

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-User-ID: 1
X-User-Email: test@example.com
X-User-Role: 2
X-User-Name: John Doe
X-Correlation-ID: 1696789200000-abc123
X-Forwarded-For: 127.0.0.1
X-Forwarded-Host: localhost
X-Gateway-Service: api-gateway
```

### Using User Info in Microservices

Your microservices can read these headers to identify the user:

**Express.js example:**
```javascript
app.get('/quizzes', (req, res) => {
  const userId = req.headers['x-user-id'];
  const userEmail = req.headers['x-user-email'];
  const userRole = req.headers['x-user-role'];
  
  console.log(`User ${userId} (${userEmail}) is accessing quizzes`);
  
  // Use user info for authorization or filtering
  const quizzes = getQuizzesForUser(userId);
  res.json(quizzes);
});
```

**NestJS example:**
```typescript
@Get('quizzes')
getQuizzes(@Headers('x-user-id') userId: string) {
  return this.quizService.getQuizzesForUser(userId);
}
```

## Authentication Errors

### 401 Unauthorized

Missing or invalid token:

```bash
# No token
curl http://localhost:3000/quiz/quizzes

# Response:
{
  "statusCode": 401,
  "message": "Authentication required",
  "error": "Unauthorized"
}

# Invalid token
curl http://localhost:3000/quiz/quizzes \
  -H "Authorization: Bearer invalid-token"

# Response:
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden

Valid token but insufficient permissions:

```bash
curl http://localhost:3000/analytics/dashboard \
  -H "Authorization: Bearer USER_TOKEN"

# Response:
{
  "statusCode": 403,
  "message": "Access denied. Required roles: 1",
  "error": "Forbidden"
}
```

## Token Management

### Token Expiration

- **Access Token**: Expires in 15 minutes (configurable via `AUTH_JWT_TOKEN_EXPIRES_IN`)
- **Refresh Token**: Expires in 10 years (configurable via `AUTH_REFRESH_TOKEN_EXPIRES_IN`)

### Refreshing Tokens

When your access token expires, use the refresh token:

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN_HERE"
  }'
```

**Response:**
```json
{
  "token": "NEW_ACCESS_TOKEN",
  "refreshToken": "NEW_REFRESH_TOKEN",
  "tokenExpires": 1696789200000
}
```

### Logout

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Adding Authentication to New Routes

### Making a Route Public

Use the `@Public()` decorator:

```typescript
import { Public } from '../decorators/public.decorator';

@Public()
@Get('public-endpoint')
getPublicData() {
  return { message: 'This is public' };
}
```

### Adding Role Requirements

Use the `@Roles()` decorator:

```typescript
import { Roles } from '../decorators/roles.decorator';

@Roles('1') // Admin only
@Get('admin-endpoint')
getAdminData() {
  return { message: 'This is for admins' };
}

@Roles('1', '2') // Admin or User
@Get('authenticated-endpoint')
getAuthenticatedData() {
  return { message: 'Any authenticated user' };
}
```

## Testing Authentication

### Complete Flow Test

```bash
# 1. Register
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/email/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Secret123!",
    "firstName": "Test",
    "lastName": "User"
  }')

echo "Registered: $REGISTER_RESPONSE"

# 2. Login
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Secret123!"
  }')

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
echo "Token: $TOKEN"

# 3. Access protected route
curl http://localhost:3000/quiz/quizzes \
  -H "Authorization: Bearer $TOKEN"

# 4. Try accessing admin route (should fail)
curl http://localhost:3000/analytics/dashboard \
  -H "Authorization: Bearer $TOKEN"

# 5. Access public route (no token needed)
curl http://localhost:3000/gateway/health
```

## Security Best Practices

### 1. Token Storage (Client-Side)

**Browser:**
- ✅ Store in memory (most secure, lost on refresh)
- ✅ HttpOnly cookies (secure from XSS)
- ⚠️ LocalStorage (vulnerable to XSS)
- ❌ SessionStorage (vulnerable to XSS)

**Mobile/Desktop:**
- ✅ Secure keychain/keystore
- ✅ Encrypted storage

### 2. Token Transmission

- ✅ Always use HTTPS in production
- ✅ Use `Authorization: Bearer` header
- ❌ Don't send tokens in URL query parameters

### 3. Token Validation

The gateway automatically validates:
- ✅ Token signature
- ✅ Token expiration
- ✅ Token format
- ✅ User existence

### 4. Rate Limiting (Future)

Consider adding rate limiting to prevent abuse:

```typescript
// Future enhancement
@Throttle(10, 60) // 10 requests per 60 seconds
@Post('login')
async login() { ... }
```

## Environment Variables

Authentication configuration in `.env`:

```env
# JWT Configuration
AUTH_JWT_SECRET=your-secret-key-change-in-production
AUTH_JWT_TOKEN_EXPIRES_IN=15m
AUTH_REFRESH_SECRET=your-refresh-secret-change-in-production
AUTH_REFRESH_TOKEN_EXPIRES_IN=3650d

# Email Confirmation
AUTH_CONFIRM_EMAIL_SECRET=your-confirm-secret-change-in-production
AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN=1d

# Password Reset
AUTH_FORGOT_SECRET=your-forgot-secret-change-in-production
AUTH_FORGOT_TOKEN_EXPIRES_IN=30m
```

**⚠️ IMPORTANT:** Change all secrets in production!

## Troubleshooting

### "Authentication required" but I have a token

1. Check token format: `Authorization: Bearer <token>`
2. Verify token hasn't expired
3. Check token is valid JWT format
4. Ensure no extra spaces in header

### "Access denied" with valid token

1. Check user role: `echo $TOKEN | base64 -d`
2. Verify route requires the role you have
3. Check if user status is "Active"

### Token works in Postman but not in code

1. Ensure header name is correct: `Authorization`
2. Check for typos in "Bearer" prefix
3. Verify no trailing/leading whitespace

### Can't access any routes

1. Check if gateway auth is properly configured
2. Verify AuthModule is imported
3. Check logs for JWT validation errors
4. Ensure database connection is working

## Swagger UI with Authentication

Access Swagger at http://localhost:3000/docs

**To test authenticated endpoints:**

1. Click "Authorize" button (🔒)
2. Enter: `Bearer YOUR_TOKEN_HERE`
3. Click "Authorize"
4. Now you can test protected endpoints

## Next Steps

- [ ] Implement token refresh logic in your client
- [ ] Add rate limiting to prevent abuse
- [ ] Set up proper secrets in production
- [ ] Configure HTTPS/TLS
- [ ] Add audit logging for sensitive operations
- [ ] Implement 2FA (Two-Factor Authentication)
- [ ] Add API key authentication for service-to-service calls

## Related Documentation

- [MICROSERVICES_SUMMARY.md](./MICROSERVICES_SUMMARY.md) - Architecture overview
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Testing instructions
- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [JWT.io](https://jwt.io) - Debug and decode JWT tokens

---

**Your API Gateway is now secured with enterprise-grade authentication!** 🔐
