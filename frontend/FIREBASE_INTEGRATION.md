# Firebase Authentication Integration - Frontend

This document explains how to use Firebase authentication in the Next.js frontend.

## 🔧 Setup Complete

The following has been configured:

### 1. **Firebase SDK Installed**
```bash
yarn add firebase
```

### 2. **Files Created**

- `src/lib/firebase.ts` - Firebase configuration and initialization
- `src/services/auth.service.ts` - Authentication service (register, login, logout)
- `src/context/AuthContext.tsx` - React context for auth state management
- `src/components/auth/LoginForm.tsx` - Login component
- `src/components/auth/RegisterForm.tsx` - Registration component
- `src/components/auth/ProtectedRoute.tsx` - Protected route wrapper
- `src/lib/api-client.ts` - API client with JWT token handling
- `.env.local` - Environment configuration

### 3. **Root Layout Updated**

The `AuthProvider` has been added to `src/app/layout.tsx` to provide authentication context throughout the app.

## 📖 How to Use

### **Using the Auth Hook**

```tsx
'use client';

import { useAuth } from '@/context/AuthContext';

export default function MyComponent() {
  const { user, isAuthenticated, login, logout, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user?.firstName} {user?.lastName}</p>
          <p>Email: {user?.email}</p>
          <p>Role: {user?.role}</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <p>Please login</p>
      )}
    </div>
  );
}
```

### **Creating Login/Register Pages**

Create authentication pages in your app:

**`src/app/(full-width-pages)/(auth)/signin/page.tsx`**
```tsx
import LoginForm from '@/components/auth/LoginForm';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="mb-8 text-center text-3xl font-bold">Sign In</h1>
        <LoginForm />
        <p className="mt-4 text-center text-sm">
          Don't have an account?{' '}
          <a href="/auth/signup" className="text-primary hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
```

**`src/app/(full-width-pages)/(auth)/signup/page.tsx`**
```tsx
import RegisterForm from '@/components/auth/RegisterForm';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="mb-8 text-center text-3xl font-bold">Create Account</h1>
        <RegisterForm />
        <p className="mt-4 text-center text-sm">
          Already have an account?{' '}
          <a href="/auth/signin" className="text-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
```

### **Protecting Routes**

Wrap protected pages with `ProtectedRoute`:

```tsx
'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div>
        <h1>Dashboard</h1>
        <p>This page is protected</p>
      </div>
    </ProtectedRoute>
  );
}
```

**Protect routes by role:**

```tsx
<ProtectedRoute allowedRoles={['admin', 'instructor']}>
  <div>Only admins and instructors can see this</div>
</ProtectedRoute>
```

### **Making API Calls**

Use the `apiClient` for authenticated requests:

```tsx
import { apiClient } from '@/lib/api-client';

// GET request
const courses = await apiClient.get('/api/courses');

// POST request
const newCourse = await apiClient.post('/api/courses', {
  title: 'New Course',
  description: 'Course description',
});

// PUT request
const updated = await apiClient.put('/api/courses/123', {
  title: 'Updated Title',
});

// DELETE request
await apiClient.delete('/api/courses/123');
```

## 🔐 Authentication Flow

1. **Register:**
   - User fills registration form
   - Firebase creates user account
   - Get Firebase ID token
   - Send to backend `/auth/firebase/register`
   - Backend verifies token and creates user
   - Returns JWT token
   - JWT stored in localStorage

2. **Login:**
   - User enters credentials
   - Firebase authenticates user
   - Get Firebase ID token
   - Send to backend `/auth/firebase/login`
   - Backend verifies token
   - Returns JWT token
   - JWT stored in localStorage

3. **Protected API Calls:**
   - JWT token automatically added to request headers
   - Backend validates JWT
   - Returns data if authorized

## 🎨 Customization

### Update API URL

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

For production:
```env
NEXT_PUBLIC_API_URL=https://your-api.com
```

### Customize Redirect Routes

Edit `LoginForm.tsx` and `RegisterForm.tsx`:
```tsx
router.push('/your-custom-route'); // Change redirect after login/register
```

Edit `ProtectedRoute.tsx`:
```tsx
router.push('/your-signin-page'); // Change redirect for unauthorized
```

## 🧪 Testing

1. **Start the API Gateway:**
   ```bash
   cd api-gateway
   yarn run start:dev
   ```

2. **Start the Frontend:**
   ```bash
   cd frontend
   yarn dev
   ```

3. **Test Registration:**
   - Go to `/auth/signup`
   - Fill in the form
   - Check Firebase console for new user
   - Check database for new user record

4. **Test Login:**
   - Go to `/auth/signin`
   - Enter credentials
   - Verify redirect to dashboard
   - Check localStorage for JWT token

## 📝 Available Auth Context Properties

```typescript
interface AuthContextType {
  firebaseUser: User | null;          // Firebase user object
  user: UserData | null;              // Backend user data (id, email, role, etc.)
  loading: boolean;                   // Loading state
  isAuthenticated: boolean;           // True if user is logged in
  login: (email, password) => Promise<void>;
  register: (firstName, lastName, email, password) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;   // Refresh user data from backend
}
```

## 🚀 Next Steps

1. Create your login/signup pages
2. Add protected routes to your dashboard
3. Implement role-based UI components
4. Add logout button to header/navigation
5. Handle token refresh if needed

Your Firebase authentication is fully integrated and ready to use! 🎉
