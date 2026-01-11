
import { auth, googleProvider } from '@/lib/firebase/firebase';
import { signInWithPopup } from 'firebase/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const authService = {
  isAuthenticated: () => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('accessToken');
  },

  getToken: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  },

  saveToken: (token: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', token);
    document.cookie = `accessToken=${token}; path=/; max-age=86400; SameSite=Strict`;
  },

  logout: () => {
    if (typeof window === 'undefined') return;
    const theme = localStorage.getItem('theme'); // Preserve theme
    localStorage.clear();
    if (theme) localStorage.setItem('theme', theme); // Restore theme
    sessionStorage.clear();
    // Clear cookies with common probable paths and domains to be safe
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    }
    window.location.href = '/signin';
  },

  login: async (credentials: any) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      if (data.access_token) {
        authService.saveToken(data.access_token);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      }
      return data;
    } catch (error) {
      throw error;
    }
  },

  loginWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const user = result.user;

      // First try to login
      try {
        const loginResponse = await fetch(`${API_URL}/auth/firebase/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });

        if (loginResponse.ok) {
          const data = await loginResponse.json();
          authService.saveToken(data.access_token);
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
          }
          return data;
        }
      } catch (loginError) {
         console.log('Firebase login failed, trying registration', loginError);
      }

      // If login failed, try to register
      const nameParts = user.displayName ? user.displayName.split(' ') : ['User'];
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      const registerResponse = await fetch(`${API_URL}/auth/firebase/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          email: user.email,
          firstName: firstName || 'User',
          lastName: lastName || 'User',
          photoUrl: user.photoURL || undefined,
        }),
      });

      if (!registerResponse.ok) {
        const error = await registerResponse.json();
        throw new Error(error.message || 'Firebase registration failed');
      }

      const data = await registerResponse.json();
      authService.saveToken(data.access_token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      return data;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  },

  register: async (userData: any) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const data = await response.json();
      if (data.access_token) {
        authService.saveToken(data.access_token);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      }
      return data;
    } catch (error) {
      throw error;
    }
  },

  submitOnboardingData: async (data: any) => {
    console.log('Submitting onboarding data:', data);
    // Mock API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return Promise.resolve({ success: true });
  },

  getProfile: async () => {
    try {
      const token = authService.getToken();
      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }
};
