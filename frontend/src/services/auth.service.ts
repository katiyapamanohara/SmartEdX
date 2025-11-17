// Authentication service for API communication
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  UserCredential,
  User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
}

export interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
}

class AuthService {
  /**
   * Register a new user with Firebase and backend
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // 1. Create user in Firebase
      const userCredential: UserCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      // 2. Get Firebase ID token
      const idToken = await userCredential.user.getIdToken();
      
      console.log('Firebase ID Token obtained for registration:', {
        tokenLength: idToken.length,
        tokenPreview: idToken.substring(0, 50) + '...',
      });

      // 3. Register in backend with Firebase token
      const response = await fetch(`${API_URL}/auth/firebase/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          idToken,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const result: AuthResponse = await response.json();
      
      // Store JWT token in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', result.access_token);
      }

      return result;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  }

  /**
   * Login user with Firebase and backend
   */
  async login(data: LoginData): Promise<AuthResponse> {
    try {
      // 1. Sign in with Firebase
      const userCredential: UserCredential = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      // 2. Get Firebase ID token
      const idToken = await userCredential.user.getIdToken();
      
      console.log('Firebase ID Token obtained for login:', {
        tokenLength: idToken.length,
        tokenPreview: idToken.substring(0, 50) + '...',
      });

      // 3. Login to backend with Firebase token
      const response = await fetch(`${API_URL}/auth/firebase/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const result: AuthResponse = await response.json();
      
      // Store JWT token in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', result.access_token);
      }

      return result;
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await signOut(auth);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
      }
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Get current user profile from backend
   */
  async getCurrentUser(): Promise<UserData | null> {
    try {
      const token = this.getToken();
      if (!token) return null;

      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Get JWT token from localStorage
   */
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export const authService = new AuthService();
