
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
  },

  logout: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
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
  }
};
