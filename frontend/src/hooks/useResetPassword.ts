"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, ResetPasswordSendEmailOutput, ResetPasswordConfirmOutput } from '@/services/authService';

interface UseResetPasswordReturn {
  sendResetEmail: (email: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  success: boolean;
  message: string | null;
}

interface UseConfirmResetPasswordReturn {
  confirmReset: (token: string, password: string, email?: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  success: boolean;
  message: string | null;
}

export const useResetPassword = (): UseResetPasswordReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sendResetEmail = async (email: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setMessage(null);

    try {
      const result: ResetPasswordSendEmailOutput = await authService.resetPasswordSendEmail(email);
      setSuccess(true);
      setMessage(result.message || 'Reset password link has been sent to your email address.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset password email');
      setSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendResetEmail,
    isLoading,
    error,
    success,
    message,
  };
};

export const useConfirmResetPassword = (): UseConfirmResetPasswordReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const confirmReset = async (token: string, password: string, email?: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setMessage(null);

    try {
      // Pass the email to the API service if provided
      const result: ResetPasswordConfirmOutput = await authService.resetPasswordConfirm(token, password, email);
      setSuccess(true);
      setMessage(result.message || 'Your password has been reset successfully!');
      
      // After 3 seconds, redirect to login page
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password';
      setError(errorMessage);
      setSuccess(false);
      
      // Rethrow the error for the component to handle token expiration
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    confirmReset,
    isLoading,
    error,
    success,
    message,
  };
};
