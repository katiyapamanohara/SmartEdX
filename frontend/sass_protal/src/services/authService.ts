
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

  getUser: () => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  saveToken: (token: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', token);
    document.cookie = `accessToken=${token}; path=/; max-age=86400; SameSite=Strict`;
  },

  logout: () => {
    if (typeof window === 'undefined') return;
    
    // Preserve theme
    const theme = localStorage.getItem('theme');

    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();

    // Restore theme
    if (theme) {
      localStorage.setItem('theme', theme);
    }

    // Clear cookies
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name.trim() + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      document.cookie = name.trim() + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
      document.cookie = name.trim() + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + window.location.hostname;
    }
    
    window.location.href = '/signin';
  },

  login: async (credentials: any) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
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
        const loginResponse = await fetch(`${API_URL}/api/auth/firebase/login`, {
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

      const registerResponse = await fetch(`${API_URL}/api/auth/firebase/register`, {
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
      const response = await fetch(`${API_URL}/api/auth/register`, {
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
    try {
      const token = authService.getToken();
      // data.authMeta contains the fields we defined in the DTO
      const payload = data.authMeta; 
      
      const response = await fetch(`${API_URL}/api/auth/complete-onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Onboarding submission failed:', response.status, errorText);
        throw new Error(`Failed to submit onboarding data: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      
      // Update local user data to reflect isNew: false
      if (result.user) {
         const currentUser = authService.getUser();
         const updatedUser = { ...currentUser, ...result.user };
         localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      return result;
    } catch (error) {
      console.error('Submit onboarding error:', error);
      throw error;
    }
  },

  getProfile: async () => {
    try {
      // Check session storage first
      if (typeof window !== 'undefined') {
        const cachedProfile = sessionStorage.getItem('userProfile');
        if (cachedProfile) {
          return JSON.parse(cachedProfile);
        }
      }

      const token = authService.getToken();

      if (!token) {
        throw new Error("No auth token found");
      }

      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Read raw text first
      const responseData = await response.json();

      // Store in session storage if successful
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('userProfile', JSON.stringify(responseData));
      }

      return responseData;

    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

};
