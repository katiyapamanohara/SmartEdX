// Utility functions for handling authentication errors
export interface ApiError {
  code: number;
  traceid: string;
  context: string;
  message: string[];
  timestamp: string;
  path: string;
}

// Map backend error messages to user-friendly messages
export const getErrorMessage = (error: ApiError | { message: string[] } | string): string => {
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Handle errors with message array
  if (error.message && Array.isArray(error.message)) {
    const errorCode = error.message[0];
    
    switch (errorCode) {
      case 'userNotFound':
        return 'No account found with this email address. Please check your email or sign up for a new account.';
      case 'invalidCredentials':
        return 'Invalid email or password. Please check your credentials and try again.';
      case 'accountLocked':
        return 'Your account has been temporarily locked due to multiple failed login attempts. Please try again later or reset your password.';
      case 'emailNotVerified':
        return 'Please verify your email address before signing in. Check your inbox for a verification link.';
      case 'accountDisabled':
        return 'Your account has been disabled. Please contact support for assistance.';
      case 'invalidEmail':
        return 'Please enter a valid email address.';
      case 'weakPassword':
        return 'Password is too weak. Please use a stronger password with at least 8 characters.';
      case 'emailAlreadyExists':
        return 'An account with this email already exists. Please sign in or use a different email address.';
      case 'serverError':
        return 'An internal server error occurred. Please try again later.';
      case 'networkError':
        return 'Network connection error. Please check your internet connection and try again.';
      case 'rateLimitExceeded':
        return 'Too many login attempts. Please wait a few minutes before trying again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  // Fallback for unknown error formats
  return 'An unexpected error occurred. Please try again.';
};

// Check if error response is from API with specific structure
export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    Array.isArray((error as ApiError).message)
  );
};
