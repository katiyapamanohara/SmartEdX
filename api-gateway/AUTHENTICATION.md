# Authentication & Authorization Guide

## Overview

The API Gateway implements JWT-based authentication with role-based access control (RBAC). This system provides secure user authentication and fine-grained authorization for all microservices.

## User Roles

The system supports three user roles:

- **ADMIN**: Full system access, can manage all resources
- **INSTRUCTOR**: Can create and manage courses and quizzes
- **STUDENT**: Can view courses and take quizzes

## Authentication Flow

### 1. User Registration

**Endpoint**: `POST /auth/register`

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "student"
}
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student"
  }
}
```

### 2. User Login

**Endpoint**: `POST /auth/login`

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student"
  }
}
```

### 3. Get Current User Profile

**Endpoint**: `GET /auth/me`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "userId": "123",
  "email": "john@example.com",
  "role": "student"
}
```

### 4. Validate Token

**Endpoint**: `GET /auth/validate`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "valid": true,
  "user": {
    "id": "123",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student"
  }
}
```

## Authorization Rules

### User Service (`/api/users`)

| Endpoint | Method | Allowed Roles |
|----------|--------|---------------|
| `GET /api/users` | GET | ADMIN |
| `GET /api/users/:id` | GET | All authenticated users (own profile) |
| `POST /api/users` | POST | ADMIN |
| `PUT /api/users/:id` | PUT | All authenticated users (own profile) |
| `DELETE /api/users/:id` | DELETE | ADMIN |

### Course Service (`/api/courses`)

| Endpoint | Method | Allowed Roles |
|----------|--------|---------------|
| `GET /api/courses` | GET | Public (no auth required) |
| `GET /api/courses/:id` | GET | Public (no auth required) |
| `POST /api/courses` | POST | ADMIN, INSTRUCTOR |
| `PUT /api/courses/:id` | PUT | ADMIN, INSTRUCTOR |
| `DELETE /api/courses/:id` | DELETE | ADMIN |

### Quiz Service (`/api/quizzes`)

| Endpoint | Method | Allowed Roles |
|----------|--------|---------------|
| `GET /api/quizzes` | GET | All authenticated users |
| `GET /api/quizzes/:id` | GET | All authenticated users |
| `POST /api/quizzes` | POST | ADMIN, INSTRUCTOR |
| `PUT /api/quizzes/:id` | PUT | ADMIN, INSTRUCTOR |
| `DELETE /api/quizzes/:id` | DELETE | ADMIN |

## Using Authentication

### Making Authenticated Requests

Include the JWT token in the Authorization header:

```bash
curl -H "Authorization: Bearer {access_token}" \
  http://localhost:3000/api/users
```

### Example: Complete Flow

```bash
# 1. Register a new user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "password": "password123",
    "role": "instructor"
  }'

# Response: { "access_token": "...", "user": {...} }

# 2. Use the token for authenticated requests
curl -H "Authorization: Bearer eyJhbGci..." \
  http://localhost:3000/api/courses

# 3. Get current user profile
curl -H "Authorization: Bearer eyJhbGci..." \
  http://localhost:3000/auth/me
```

## Implementation Details

### Guards

1. **JwtAuthGuard**: Validates JWT tokens and extracts user information
2. **RolesGuard**: Checks if the user has the required role(s)

Both guards are applied globally via `APP_GUARD` provider.

### Decorators

- `@Public()`: Marks endpoints as public (no authentication required)
- `@Roles(Role.ADMIN, Role.INSTRUCTOR)`: Restricts access to specific roles
- `@CurrentUser()`: Injects the current user into the controller method

### Example Controller Usage

```typescript
import { Controller, Get, Post } from '@nestjs/common';
import { Roles } from './decorators/roles.decorator';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Role } from './enums/role.enum';

@Controller('example')
export class ExampleController {
  // Public endpoint - no authentication required
  @Public()
  @Get('public')
  getPublic() {
    return { message: 'This is public' };
  }

  // Authenticated endpoint - any logged-in user
  @Get('protected')
  getProtected(@CurrentUser() user: any) {
    return { message: 'Hello ' + user.email };
  }

  // Role-restricted endpoint - only ADMIN
  @Roles(Role.ADMIN)
  @Get('admin-only')
  getAdminOnly() {
    return { message: 'Admin access' };
  }

  // Multiple roles allowed
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @Post('create')
  create(@CurrentUser() user: any) {
    return { creator: user.email };
  }
}
```

## Security Best Practices

1. **JWT Secret**: Change `JWT_SECRET` in production to a strong, random value
2. **Token Expiration**: Tokens expire after 1 day by default (configurable via `JWT_EXPIRATION`)
3. **Password Hashing**: Passwords are hashed using bcrypt with salt rounds of 10
4. **HTTPS**: Use HTTPS in production to protect tokens in transit
5. **Token Storage**: Store tokens securely on the client (e.g., httpOnly cookies)

## Error Responses

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "timestamp": "2025-11-17T12:00:00.000Z",
  "path": "/api/users"
}
```

### 403 Forbidden (Insufficient Permissions)
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "timestamp": "2025-11-17T12:00:00.000Z",
  "path": "/api/users"
}
```

## Configuration

Edit `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=1d  # 1 day, or use: 60s, 2h, 7d, etc.
```

## Testing Authentication

```bash
# Test registration
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@test.com","password":"test123","role":"student"}'

# Test login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Test protected endpoint (replace TOKEN with actual token)
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/auth/me

# Test unauthorized access (no token)
curl http://localhost:3000/api/users
# Should return 401 Unauthorized
```
