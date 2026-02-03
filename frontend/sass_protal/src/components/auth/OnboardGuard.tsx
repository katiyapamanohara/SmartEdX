"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';

export default function OnboardGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const isAuth = authService.isAuthenticated();
    console.log('OnboardGuard: Checking auth', { isAuth });

    if (!isAuth) {
      console.log('OnboardGuard: Not authenticated, redirecting to /signin');
      router.push('/signin'); 
      setAuthorized(false);
    } else {
      const user = authService.getUser();
      console.log('OnboardGuard: Checking user status', user);
      
      if (user && user.isNew === false) {
        console.log('OnboardGuard: User is not new, redirecting to /dashboard');
        router.push('/dashboard');
        setAuthorized(false);
      } else {
        console.log('OnboardGuard: User is new or status unknown, authorizing');
        setAuthorized(true);
      }
    }
    setLoading(false);
  }, [router]);

  // Show loading while checking authentication
  if (loading) {
     return <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }

  // Show nothing if not authorized (and not loading)
  if (!authorized) {
    return <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white">Not Authorized</div>;
  }

  // Render children if authorized
  return <>{children}</>;
}
