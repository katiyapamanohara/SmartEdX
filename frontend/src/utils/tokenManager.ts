// Token management utilities
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export class TokenManager {
  // Store access token in localStorage
  static setAccessToken(accessToken: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    }
  }

  // Store tokens in localStorage (for backward compatibility)
  static setTokens(accessToken: string, refreshToken?: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      // Only store refresh token if provided
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
    }
  }

  // Get access token
  static getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return null;
  }

  // Get refresh token
  static getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return null;
  }

  // Clear all auth data
  static clearAuthData() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      // Clean up any remaining old user data keys if they exist
      localStorage.removeItem('user_data');
      localStorage.removeItem('is_new_user');
    }
  }

  // Check if user is authenticated and token is not expired
  static isAuthenticated(): boolean {
    const token = this.getAccessToken();
    
    // Must have token
    if (!token) return false;
    
    // Check if token is expired
    if (this.isTokenExpired(token)) {
      return false;
    }
    
    return true;
  }

  // Check if token is expired (basic check)
  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch {
      return true; // If we can't parse the token, consider it expired
    }
  }

  // Get Authorization header
  static getAuthHeader(): { Authorization: string } | Record<string, never> {
    const token = this.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}
