"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import GridShape from "@/components/common/GridShape";

interface InstituteInfo {
  id: string;
  name: string;
  logo?: string;
  phoneNumber?: string;
}

interface AuthInstituteInfoProps {
  instituteInfo: InstituteInfo | null;
  isLoading: boolean;
}

export default function AuthInstituteInfo({ instituteInfo, isLoading }: AuthInstituteInfoProps) {
  return (
    <div className="lg:w-1/2 w-full h-full bg-brand-950 dark:bg-white/5 lg:grid items-center hidden">
      <div className="relative items-center justify-center flex z-1 flex-col">
        {/* <!-- ===== Common Grid Shape Start ===== --> */}
        <GridShape />
        
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 z-10">
            <div className="w-32 h-32 rounded-full bg-white/10 animate-pulse"></div>
            <div className="h-8 w-48 bg-white/10 rounded animate-pulse"></div>
            <div className="h-6 w-36 bg-white/10 rounded animate-pulse"></div>
          </div>
        ) : instituteInfo ? (
          <div className="flex flex-col items-center max-w-xs z-10">
            <div className="mb-6">
              {instituteInfo.logo ? (
                 <div className="w-32 h-32 rounded-full overflow-hidden bg-white/10 flex items-center justify-center border-4 border-white/20">
                   <Image
                     src={instituteInfo.logo}
                     alt={instituteInfo.name}
                     width={128}
                     height={128}
                     className="w-full h-full object-cover"
                     unoptimized
                   />
                 </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center border-4 border-white/20">
                  <span className="text-4xl font-bold text-white/50">
                    {instituteInfo.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              {instituteInfo.name}
            </h2>
            
            <p className="text-center text-gray-400 dark:text-white/60 mb-6">
              Welcome to the institute portal. Sign in to access your dashboard and resources.
            </p>

            {instituteInfo.phoneNumber && (
              <p className="text-white/80 flex items-center justify-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" 
                  />
                </svg>
                {instituteInfo.phoneNumber}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center max-w-xs z-10">
            <Link href="/" className="block mb-4">
               {/* Fallback content if no institute info found */}
            </Link>
            <p className="text-center text-gray-400 dark:text-white/60">
              SmartEdX Institute Portal
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
