# Token Forwarding & User Context

## Overview

The API Gateway implements **automatic JWT token forwarding** and **user context propagation** to all microservices. This ensures that downstream services can:

1. Verify the authenticated user
2. Access user information without additional database queries
3. Implement their own authorization logic if needed

---

## How It Works

### 1. Authentication Flow

```
Client → API Gateway (JWT Validation) → Microservice
  |            |                            |
  |     Validates Token                     |
  |     Extracts User Info                  |
  |     Forwards Token + User Context  →    |
```

### 2. Headers Forwarded to Microservices

When the API Gateway proxies a request to a microservice, it automatically includes:

#### Standard Headers
- **`Authorization`**: The original JWT Bearer token from the client
  ```
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

#### Custom User Context Headers
- **`x-user-id`**: UUID of the authenticated user
- **`x-user-email`**: Email address of the authenticated user
- **`x-user-role`**: Role of the user (admin, instructor, student)

#### Example Request to Microservice
```http
GET /api/users HTTP/1.1
Host: localhost:3001
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
x-user-id: 123e4567-e89b-12d3-a456-426614174000
x-user-email: admin@example.com
x-user-role: admin
Content-Type: application/json
```

---

## Implementation Details

### Proxy Service Architecture

Each proxy service (`UserProxyService`, `CourseProxyService`, `QuizProxyService`) implements:

```typescript
async proxyRequest(
  method: string,
  path: string,
  options: {
    query?: any;
    body?: any;
    headers?: any;
    user?: any;  // Injected from @CurrentUser() decorator
  } = {},
) {
  const config = {
    params: options.query,
    headers: this.prepareHeaders(options.headers, options.user),
  };
  // ... forward request
}

private prepareHeaders(headers: any, user?: any): any {
  const sanitized: any = {};

  // Forward Authorization header (JWT token)
  if (headers?.authorization) {
    sanitized['authorization'] = headers.authorization;
  }

  // Add user context as custom headers
  if (user) {
    sanitized['x-user-id'] = user.userId || user.id;
    sanitized['x-user-email'] = user.email;
    sanitized['x-user-role'] = user.role;
  }

  // Forward other important headers
  if (headers?.['content-type']) {
    sanitized['content-type'] = headers['content-type'];
  }

  return sanitized;
}
```

### Controller Integration

Controllers inject the user from JWT using `@CurrentUser()` decorator:

```typescript
@Get()
async findAll(
  @Query() query: any,
  @Headers() headers: any,
  @CurrentUser() user: any  // User extracted from JWT
) {
  return this.proxyService.proxyRequest('GET', '', {
    query,
    headers,
    user  // Passed to proxy service
  });
}
```

---

## Microservice Implementation

### Reading User Context

Microservices can read the user context from headers:

#### NestJS Example
```typescript
@Controller('api/courses')
export class CourseController {
  @Get()
  async findAll(@Headers() headers: any) {
    const userId = headers['x-user-id'];
    const userEmail = headers['x-user-email'];
    const userRole = headers['x-user-role'];
    
    // Use user context for authorization
    if (userRole === 'student') {
      // Return only published courses
    }
    
    // Or verify JWT token
    const token = headers.authorization?.replace('Bearer ', '');
    // Validate token...
  }
}
```

#### Express.js Middleware Example
```javascript
const userContext = (req, res, next) => {
  req.user = {
    id: req.headers['x-user-id'],
    email: req.headers['x-user-email'],
    role: req.headers['x-user-role'],
  };
  next();
};

app.use(userContext);
```

### JWT Verification in Microservices (Optional)

If microservices want to verify the JWT token themselves:

```typescript
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private jwtService: JwtService) {}

  use(req: any, res: any, next: () => void) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      try {
        const payload = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET,
        });
        req.user = payload;
      } catch (error) {
        throw new UnauthorizedException('Invalid token');
      }
    }
    
    next();
  }
}
```

---

## Security Considerations

### 1. Trust Boundary
- **API Gateway** validates JWT tokens and enforces role-based access control
- **Microservices** can trust the user context headers since they come from the gateway
- Ensure microservices are **not publicly accessible** (only accessible via gateway)

### 2. Network Security
```yaml
# docker-compose.yml example
services:
  api-gateway:
    ports:
      - "3000:3000"  # Public
  
  user-service:
    # No public ports - only accessible internally
    networks:
      - backend
  
  course-service:
    networks:
      - backend
```

### 3. Header Validation in Microservices
While headers come from the gateway, microservices should still validate:

```typescript
if (!req.headers['x-user-id']) {
  throw new UnauthorizedException('Missing user context');
}

// Validate UUID format
if (!isUUID(req.headers['x-user-id'])) {
  throw new BadRequestException('Invalid user ID');
}
```

---

## Authentication Bypass for Public Endpoints

Some endpoints are public and don't require authentication:

```typescript
@Public()  // Bypasses JWT guard
@Get()
async findAll(@Query() query: any, @Headers() headers: any) {
  // No user context available
  // No JWT token forwarded
  return this.courseProxyService.proxyRequest('GET', '', {
    query,
    headers,
    // user not passed
  });
}
```

In this case, microservices receive the request **without** user context headers.

---

## Testing Token Forwarding

### 1. Get JWT Token
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@123"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### 2. Make Authenticated Request
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 3. Verify Headers in Microservice

Add logging in your microservice:

```typescript
@Get()
async findAll(@Headers() headers: any) {
  console.log('Received headers:', {
    authorization: headers.authorization,
    userId: headers['x-user-id'],
    userEmail: headers['x-user-email'],
    userRole: headers['x-user-role'],
  });
  
  return this.userService.findAll();
}
```

Expected output:
```
Received headers: {
  authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  userId: '123e4567-e89b-12d3-a456-426614174000',
  userEmail: 'admin@example.com',
  userRole: 'admin'
}
```

---

## Benefits

✅ **Single Source of Truth**: Authentication happens only at the gateway  
✅ **Performance**: Microservices don't need to validate JWT on every request  
✅ **Flexibility**: Microservices can still verify JWT if needed  
✅ **User Context**: Immediate access to user info without database queries  
✅ **Audit Trail**: Easy to track which user made which request  
✅ **Authorization**: Microservices can implement their own business rules  

---

## Role-Based Access Control (RBAC)

### Gateway Level (Enforced)
```typescript
@Roles(Role.ADMIN)  // Only admins can call this endpoint
@Delete(':id')
async remove(@Param('id') id: string) {
  // Gateway blocks non-admin users before reaching here
}
```

### Microservice Level (Optional)
```typescript
@Delete(':id')
async remove(@Param('id') id: string, @Headers() headers: any) {
  const userRole = headers['x-user-role'];
  
  // Additional business logic checks
  if (userRole !== 'admin' && userRole !== 'instructor') {
    throw new ForbiddenException();
  }
  
  // Or check ownership
  const course = await this.courseService.findOne(id);
  if (course.instructorId !== headers['x-user-id']) {
    throw new ForbiddenException('You can only delete your own courses');
  }
}
```

---

## Troubleshooting

### Token Not Forwarded
- Verify JWT token is valid
- Check that `@CurrentUser()` decorator is used in controller
- Ensure user object is passed to proxy service

### User Context Headers Missing
- Confirm user is authenticated (not using `@Public()`)
- Check that `prepareHeaders()` method is implemented
- Verify headers are being passed to microservice

### Microservice Returns 401
- Ensure microservice is not trying to validate JWT (unless intentional)
- Check that Authorization header format is correct
- Verify JWT_SECRET matches between gateway and microservice (if validating)

---

## Summary

The API Gateway provides **transparent authentication and authorization** for all microservices by:

1. ✅ Validating JWT tokens at the gateway
2. ✅ Enforcing role-based access control
3. ✅ Forwarding the original JWT token
4. ✅ Adding user context headers (x-user-id, x-user-email, x-user-role)
5. ✅ Allowing microservices to trust or verify the authentication

This architecture ensures **security**, **performance**, and **flexibility** across your microservices ecosystem.
