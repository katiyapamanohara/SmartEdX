// API service for authentication
import { TokenManager } from '@/utils/tokenManager';
import { getErrorMessage, isApiError } from '@/utils/errorUtils';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  phone: string;
  password: string;
  companyName: string;
  employeeCount?: string;
  referralSource: string;
  useCases: string[];
}

export interface GoogleAuthCredentials {
  idToken: string;
}

export interface GithubAuthCredentials {
  idToken: string;
}

export interface AuthResponse {
  token: string;
  user: {
    userID: string;
    email: string;
    firstName: string;
    lastName: string;
    isNewUser: boolean;
    [key: string]: unknown;
  };
}

export interface OnboardingData {
  auth: Record<string, unknown>;
  authMeta: {
    phoneNumber: string;
    country: string;
    companyName: string;
    numberOfEmployees: string;
    hearAboutUs: string;
    primaryUseCase: string[];
  };
}

export interface UserMeResponse {
  user: {
    id: string;
    email: string;
    firebaseUID: string | null;
    firstName: string;
    lastName: string;
    avatar: string | null;
  };
  tokenValid: boolean;
}

export interface ResetPasswordSendEmailInput {
  email: string;
}

export interface ResetPasswordSendEmailOutput {
  message: string;
  success: boolean;
}

export interface ResetPasswordConfirmInput {
  token: string;
  password: string;
}

export interface ResetPasswordConfirmOutput {
  message: string;
  success: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

class AuthService {

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();
        
        if (isApiError(errorData.error)) {
          throw new Error(getErrorMessage(errorData.error));
        } else if (errorData.message) {
          throw new Error(getErrorMessage(errorData));
        } else {
          throw new Error('Login failed. Please check your credentials and try again.');
        }
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
          throw parseError; 
        }
        throw new Error('Login failed. Please check your credentials and try again.');
      }
    }

    return response.json();
  }

  async signup(credentials: SignupCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();
        
        if (isApiError(errorData.error)) {
          throw new Error(getErrorMessage(errorData.error));
        } else if (errorData.message) {
          throw new Error(getErrorMessage(errorData));
        } else {
          throw new Error('Signup failed. Please try again.');
        }
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
          throw parseError; 
        }
        throw new Error('Signup failed. Please try again.');
      }
    }

    return response.json();
  }

  async googleAuth(credentials: GoogleAuthCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();
        
        if (isApiError(errorData.error)) {
          throw new Error(getErrorMessage(errorData.error));
        } else if (errorData.message) {
          throw new Error(getErrorMessage(errorData));
        } else {
          throw new Error('Google authentication failed. Please try again.');
        }
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
          throw parseError;
        }
        throw new Error('Google authentication failed. Please try again.');
      }
    }

    return response.json();
  }

  async githubAuth(credentials: GithubAuthCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();
        
        if (isApiError(errorData.error)) {
          throw new Error(getErrorMessage(errorData.error));
        } else if (errorData.message) {
          throw new Error(getErrorMessage(errorData));
        } else {
          throw new Error('GitHub authentication failed. Please try again.');
        }
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
          throw parseError;
        }
        throw new Error('GitHub authentication failed. Please try again.');
      }
    }

    return response.json();
  }

  async submitOnboardingData(data: OnboardingData): Promise<void> {
    const token = TokenManager.getAccessToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Submitting onboarding data failed' }));
      throw new Error(errorData.message || 'Submitting onboarding data failed');
    }
  }

  async getCurrentUser(): Promise<UserMeResponse> {
    const token = TokenManager.getAccessToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to get user data' }));
      const errorMessage = `${response.status}: ${errorData.message || 'Failed to get user data'}`;
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async resetPasswordSendEmail(email: string): Promise<ResetPasswordSendEmailOutput> {
    const response = await fetch(`${API_BASE_URL}/reset-password/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      let errorData;
      try {
        errorData = responseText ? JSON.parse(responseText) : { message: 'Unknown error' };
      } catch (parseError) {
        console.error('Could not parse error response as JSON:', parseError);
        throw new Error(`Server error (${response.status}): ${responseText || 'Unknown error'}`);
      }
      
      if (isApiError(errorData.error)) {
        throw new Error(getErrorMessage(errorData.error));
      } else if (errorData.message) {
        throw new Error(getErrorMessage(errorData));
      } else {
        throw new Error('Failed to send reset password email. Please try again.');
      }
    }

    // Try to parse success response as JSON
    try {
      // Handle empty response body
      if (!responseText || responseText.trim() === '') {
        console.log('Server returned empty response body, treating as success');
        return { 
          message: 'Reset password email sent successfully!', 
          success: true 
        };
      }
      
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error('Could not parse success response as JSON:', parseError);
      // If parsing fails but status is success, return a default success response
      return { 
        message: 'Reset password email sent successfully!', 
        success: true 
      };
    }
  }

  async resetPasswordConfirm(token: string, password: string, email?: string): Promise<ResetPasswordConfirmOutput> {    
    const response = await fetch(`${API_BASE_URL}/reset-password/confirm`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email: email,
        newPassword: password,
        token: token 
      }),
    });
    
    // Get response text first to see what we're actually receiving
    const responseText = await response.text();

    if (!response.ok) {
      // Try to parse as JSON if possible, otherwise use the text
      let errorData;
      try {
        errorData = responseText ? JSON.parse(responseText) : { message: 'Unknown error' };
      } catch (parseError) {
        console.error('Could not parse error response as JSON:', parseError);
        throw new Error(`Server error (${response.status}): ${responseText || 'Unknown error'}`);
      }
      
      // Check specifically for JWT expired error
      if (errorData.error && 
          errorData.error.message && 
          (Array.isArray(errorData.error.message) && 
           errorData.error.message.some((msg: string) => msg.toLowerCase().includes('jwt expired')))) {
        throw new Error('Your password reset link has expired. Please request a new link and use it immediately.');
      }
      
      if (isApiError(errorData.error)) {
        throw new Error(getErrorMessage(errorData.error));
      } else if (errorData.message) {
        throw new Error(getErrorMessage(errorData));
      } else {
        throw new Error('Failed to reset password. Please try again.');
      }
    }

    // Try to parse success response as JSON
    try {
      // Handle empty response body
      if (!responseText || responseText.trim() === '') {
        console.log('Server returned empty response body, treating as success');
        return { 
          message: 'Password reset successfully!', 
          success: true 
        };
      }
      
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error('Could not parse success response as JSON:', parseError);
      // If parsing fails but status is success, return a default success response
      return { 
        message: 'Password reset successfully!', 
        success: true 
      };
    }
  }
}

export const authService = new AuthService();
