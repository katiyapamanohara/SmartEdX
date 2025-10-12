# Authentication Quick Reference

## 🔐 Quick Auth Commands

### Get Token (One-Liner)
```bash
export TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Secret123!"}' \
  | jq -r '.token')
```

### Test Authenticated Request
```bash
curl http://localhost:3000/quiz/quizzes -H "Authorization: Bearer $TOKEN"
```

---

## 📋 Route Access Matrix

| Route | Public | User | Admin |
|-------|--------|------|-------|
| `/` | ✅ | ✅ | ✅ |
| `/gateway/*` | ✅ | ✅ | ✅ |
| `/api/v1/auth/*` | ✅ | ✅ | ✅ |
| `/docs` | ✅ | ✅ | ✅ |
| `/quiz/*` | ❌ | ✅ | ✅ |
| `/user-service/*` | ❌ | ✅ | ✅ |
| `/analytics/*` | ❌ | ❌ | ✅ |

---

## 🔑 User Headers Forwarded

When authenticated, gateway sends these headers to microservices:

```
Authorization: Bearer <token>
X-User-ID: 1
X-User-Email: user@example.com  
X-User-Role: 2
X-User-Name: John Doe
X-Correlation-ID: unique-id
```

---

## 🚀 Complete Test Flow

```bash
# 1. Register
curl -X POST http://localhost:3000/api/v1/auth/email/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Secret123!",
    "firstName": "John",
    "lastName": "Doe"
  }'

# 2. Login & Save Token
export TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Secret123!"}' \
  | jq -r '.token')

# 3. Test Protected Route
curl http://localhost:3000/quiz/quizzes \
  -H "Authorization: Bearer $TOKEN"

# 4. Create Resource
curl -X POST http://localhost:3000/quiz/quizzes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Quiz","difficulty":"easy"}'

# 5. Test Admin Route (will fail if not admin)
curl http://localhost:3000/analytics/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

---

## ⚠️ Common Errors

### 401 Unauthorized
```json
{"statusCode":401,"message":"Authentication required"}
```
**Fix:** Add `Authorization: Bearer <token>` header

### 403 Forbidden
```json
{"statusCode":403,"message":"Access denied. Required roles: 1"}
```
**Fix:** Request requires admin role (Role ID: 1)

### Token Expired
```json
{"statusCode":401,"message":"Unauthorized"}
```
**Fix:** Get new token or use refresh token

---

## 🔄 Token Refresh

```bash
# Save refresh token from login
export REFRESH_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Secret123!"}' \
  | jq -r '.refreshToken')

# Get new token
export TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" \
  | jq -r '.token')
```

---

## 🛠️ Development Tips

### Decode JWT Token
```bash
echo $TOKEN | cut -d. -f2 | base64 -d | jq
```

### Check Token Expiry
```bash
echo $TOKEN | cut -d. -f2 | base64 -d | jq -r '.exp' | xargs -I {} date -r {}
```

### Test Multiple Users
```bash
# User 1
export TOKEN1=$(curl -s -X POST http://localhost:3000/api/v1/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@example.com","password":"Secret123!"}' \
  | jq -r '.token')

# User 2  
export TOKEN2=$(curl -s -X POST http://localhost:3000/api/v1/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user2@example.com","password":"Secret123!"}' \
  | jq -r '.token')

# Use different tokens
curl http://localhost:3000/quiz/quizzes -H "Authorization: Bearer $TOKEN1"
curl http://localhost:3000/quiz/quizzes -H "Authorization: Bearer $TOKEN2"
```

---

## 📝 Swagger Testing

1. Open http://localhost:3000/docs
2. Click **Authorize** 🔒 button (top right)
3. Enter: `Bearer YOUR_TOKEN_HERE`
4. Click **Authorize**
5. Test endpoints interactively

---

## 🔐 Production Checklist

- [ ] Change `AUTH_JWT_SECRET` in `.env`
- [ ] Change `AUTH_REFRESH_SECRET` in `.env`
- [ ] Enable HTTPS/TLS
- [ ] Set secure token expiration times
- [ ] Implement rate limiting
- [ ] Add 2FA for sensitive operations
- [ ] Set up token blacklisting for logout
- [ ] Configure CORS properly
- [ ] Add audit logging
- [ ] Implement session management

---

## 📚 See Also

- [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md) - Complete authentication guide
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Full testing guide
- [MICROSERVICES_SUMMARY.md](./MICROSERVICES_SUMMARY.md) - Architecture overview
