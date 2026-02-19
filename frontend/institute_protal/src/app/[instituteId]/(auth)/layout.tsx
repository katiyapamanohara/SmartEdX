"use client";
import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import AuthInstituteInfo from "@/components/auth/AuthInstituteInfo";
import { ThemeProvider } from "@/context/ThemeContext";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface InstituteInfo {
  id: string;
  name: string;
  logo?: string;
  phoneNumber?: string;
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const [instituteInfo, setInstituteInfo] = useState<InstituteInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchInstituteInfo = async () => {
      try {
        const instituteId = Array.isArray(params.instituteId) ? params.instituteId[0] : params.instituteId;
        
        if (!instituteId) {
          setLoadingInfo(false);
          setNotFound(true);
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(`${apiUrl}/api/institutes/auth/institutes/${instituteId}/info`);
        
        if (response.ok) {
          const data = await response.json();
          setInstituteInfo(data);
          setNotFound(false);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error("Failed to fetch institute info:", err);
        setNotFound(true);
      } finally {
        setLoadingInfo(false);
      }
    };

    fetchInstituteInfo();
  }, [params.instituteId]);

  if (loadingInfo) {
    return (
      <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0 h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading institute...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0 h-screen flex items-center justify-center">
        <div className="flex flex-col items-center max-w-md p-8 text-center">
          <div className="w-24 h-24 mb-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <svg 
              className="w-12 h-12 text-red-500" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Institute Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We couldn't find the institute you're looking for. Please check the URL or contact support.
          </p>
          <a 
            href="https://smartedx.com" 
            className="px-6 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-medium"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <ThemeProvider>
        <div className="relative flex lg:flex-row w-full h-screen justify-center flex-col  dark:bg-gray-900 sm:p-0">
          {children}
          <AuthInstituteInfo instituteInfo={instituteInfo} isLoading={loadingInfo} />
          <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}

