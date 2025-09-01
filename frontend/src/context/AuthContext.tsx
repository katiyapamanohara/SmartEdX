"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { auth, googleProvider, githubProvider } from '@/config/firebase';
import { useRouter } from 'next/navigation';
import { authService, LoginCredentials, SignupCredentials, GoogleAuthCredentials, GithubAuthCredentials } from '@/services/authService';
import { TokenManager } from '@/utils/tokenManager';
import posthog from 'posthog-js';

interface User {
  userID: string;
  username?: string;
  email: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  registrationDate?: string;
  lastLoginDate?: string;
  resetPasswordToken?: string;
  resetPasswordTokenExpiry?: string;
  firebaseUID?: string;
  authProvider?: string;
  stripeCustomerID?: string;
  activeSubscriptionID?: string;
  isNewUser?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  roles?: unknown[];
  // Firebase fields for backward compatibility
  displayName?: string;
  photoURL?: string;
  emailVerified?: boolean;
  uid?: string;
  providerData?: unknown[];
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already authenticated on app load
    const checkAuthStatus = async () => {
      try {
        const accessToken = TokenManager.getAccessToken();
        
        if (accessToken) {
          // Check if token is expired locally
          if (TokenManager.isTokenExpired(accessToken)) {
            // Token is expired - log out immediately (no API calls)
            console.log('Token expired, logging out');
            TokenManager.clearAuthData();
            setUser(null);
            router.push('/signin');
          } else {
            // Token is still valid - we need to fetch user data from API or keep user state empty
            // For now, we'll just keep the user state null since we're not storing user data
            // The user data will be set when they actually authenticate
            setUser(null);
          }
        } else {
          // No token found
          setUser(null);
        }
      } catch (error) {
        console.error('Auth status check failed:', error);
        TokenManager.clearAuthData();
        setUser(null);
        router.push('/signin');
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, [router]);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setLoading(true);
      const response = await authService.login(credentials);

      // Only store access token
      TokenManager.setAccessToken(response.token);
      setUser(response.user);

      //Identify the user in PostHog
      posthog.identify(String(response.user.id), {
        email: response.user.email,
        name: response.user.name,
        isNewUser: response.user.isNewUser,
        lastLogin: new Date().toISOString(),
      });

      //Track login event
      posthog.capture('user_logged_in');

      // Route based on isNewUser flag from response
      if (response.user.isNewUser) {
        router.push('/onboard');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (credentials: SignupCredentials): Promise<void> => {
    try {
      setLoading(true);
      const response = await authService.signup(credentials);

      // Only store access token
      TokenManager.setAccessToken(response.token);
      setUser(response.user);

      // 👇 Identify user and track event
      posthog.identify(String(response.user.id), {
        email: response.user.email,
        name: response.user.name,
      });

      posthog.capture('user_signed_up', {
        method: 'email_password',
      });
      // Route based on isNewUser flag from response
      if (response.user.isNewUser) {
        router.push('/onboard');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    try {
      setLoading(true);

      // First, authenticate with Firebase to get the ID token
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      // OAuth providers already verify emails, so we skip email verification
      const firebaseToken = await firebaseUser.getIdToken();

      // Then send the Firebase token to your backend for validation
      const googleCredentials: GoogleAuthCredentials = {
        idToken: firebaseToken,
      };

      const response = await authService.googleAuth(googleCredentials);

      // Only store access token
      TokenManager.setAccessToken(response.token);
      setUser(response.user);

      //Identify and capture
      posthog.identify(String(response.user.id), {
        email: response.user.email,
        name: response.user.name,
      });

      posthog.capture('user_logged_in', {
        method: 'google_oauth',
      });

      // Route based on isNewUser flag from response
      if (response.user.isNewUser) {
        router.push('/onboard');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGithub = async (): Promise<void> => {
    try {
      setLoading(true);

      // First, authenticate with Firebase to get the ID token
      const result = await signInWithPopup(auth, githubProvider);
      const firebaseUser = result.user;

      // OAuth providers already verify emails, so we skip email verification
      const firebaseToken = await firebaseUser.getIdToken();

      // Then send the Firebase token to your backend for validation (same as Google)
      const githubCredentials: GithubAuthCredentials = {
        idToken: firebaseToken,
      };

      const response = await authService.githubAuth(githubCredentials);

      // Only store access token
      TokenManager.setAccessToken(response.token);
      setUser(response.user);

      //Identify and capture
      posthog.identify(String(response.user.id), {
        email: response.user.email,
        name: response.user.name,
      });

      posthog.capture('user_logged_in', {
        method: 'github_oauth',
      });

      // Route based on isNewUser flag from response
      if (response.user.isNewUser) {
        router.push('/onboard');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('GitHub sign-in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setLoading(true);

      // Sign out from Firebase
      await signOut(auth);

      // Clear local tokens and user data
      TokenManager.clearAuthData();
      setUser(null);

      //Clear PostHog identity and capture logout
      posthog.capture('user_logged_out');

      router.push('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const isAuthenticated = TokenManager.getAccessToken() !== null && !TokenManager.isTokenExpired(TokenManager.getAccessToken() || '');

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      signup,
      signInWithGoogle,
      signInWithGithub,
      logout,
      isAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
