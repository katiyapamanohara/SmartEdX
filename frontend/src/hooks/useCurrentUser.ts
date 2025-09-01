"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService, UserMeResponse } from '@/services/authService';
import { TokenManager } from '@/utils/tokenManager';

export function useCurrentUser() {
  const [user, setUser] = useState<UserMeResponse['user'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogoutAndRedirect = useCallback(() => {
    TokenManager.clearAuthData();
    setUser(null);
    setError(null);
    router.push('/signin');
  }, [router]);

  const fetchUser = useCallback(async () => {
    const token = TokenManager.getAccessToken();
    
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await authService.getCurrentUser();
      
      if (response.tokenValid) {
        setUser(response.user);
      } else {
        handleLogoutAndRedirect();
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
      
      handleLogoutAndRedirect();
      return;
    } finally {
      setLoading(false);
    }
  }, [handleLogoutAndRedirect]);

  useEffect(() => {
    fetchUser();

    const handleVisibilityChange = () => {
      if (!document.hidden && TokenManager.getAccessToken()) {
        fetchUser();
      }
    };

    const handleWindowFocus = () => {
      if (TokenManager.getAccessToken()) {
        fetchUser();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token' || e.key === null) {
        fetchUser();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchUser]);

  return { user, loading, error, refetch: () => {
    const token = TokenManager.getAccessToken();
    if (token) {
      setLoading(true);
      authService.getCurrentUser()
        .then(response => {
          if (response.tokenValid) {
            setUser(response.user);
          } else {
            handleLogoutAndRedirect();
          }
        })
        .catch(err => {
          console.error('Failed to refetch user data:', err);
          
          handleLogoutAndRedirect();
        })
        .finally(() => setLoading(false));
    }
  }};
}