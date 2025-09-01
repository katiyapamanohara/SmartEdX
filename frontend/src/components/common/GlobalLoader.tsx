"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// Define a type for the extended globalThis
interface ExtendedGlobal {
  pageLoading: boolean;
  isUsingGlobalLoading: boolean;
}

// Extend the Window interface to match our usage
declare global {
  interface Window {
    pageLoading: boolean;
    isUsingGlobalLoading: boolean;
  }
}

// Simple global variable and flag to track if any page is using global loading
(globalThis as unknown as ExtendedGlobal).pageLoading = false;
(globalThis as unknown as ExtendedGlobal).isUsingGlobalLoading = false;

// Common function that any page can use
export function setGlobalLoading(loading: boolean): void {
  (globalThis as unknown as ExtendedGlobal).pageLoading = loading;
  (globalThis as unknown as ExtendedGlobal).isUsingGlobalLoading = true;
}

export default function GlobalLoader() {
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  // Check global variable for any page loading with API requests
  useEffect(() => {
    const checkPageLoading = () => {
      const isPageUsingGlobalLoading = (globalThis as unknown as ExtendedGlobal).isUsingGlobalLoading;

      // Only poll if a page is actually using setGlobalLoading
      if (isPageUsingGlobalLoading) {
        const currentlyLoading = (globalThis as unknown as ExtendedGlobal).pageLoading;
        if (currentlyLoading !== undefined) {
          setIsLoading(currentlyLoading);
        }
      }
    };

    const interval = setInterval(checkPageLoading, 100);
    return () => clearInterval(interval);
  }, []);

  // Default timer for pages that don't use setGlobalLoading
  useEffect(() => {
    // Show loader
    setIsLoading(true);

    // Reset the global loading flag for new page
    (globalThis as unknown as ExtendedGlobal).isUsingGlobalLoading = false;

    // Wait a bit to see if page will use setGlobalLoading
    const checkTimer = setTimeout(() => {
      const isPageUsingGlobalLoading = (globalThis as unknown as ExtendedGlobal).isUsingGlobalLoading;

      // Only use default timer if page is NOT using global loading
      if (!isPageUsingGlobalLoading) {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(checkTimer);
  }, [pathname]);

  // Add event listener for page reload
  useEffect(() => {
    const handleBeforeUnload = () => {
      setIsLoading(true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-white dark:bg-gray-900 bg-opacity-90 dark:bg-opacity-90 backdrop-blur-sm">
      <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin" style={{ animationDuration: '0.5s' }}></div>
    </div>
  );
}
