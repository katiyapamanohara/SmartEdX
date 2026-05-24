import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";

import { ThemeProvider } from "@/context/ThemeContext";
import Link from "next/link";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-1 dark:bg-gray-900 min-h-screen">
      <ThemeProvider>
        {/* Modern Header for Auth pages */}
        <div className="absolute top-0 left-0 right-0 w-full z-50 px-6 py-4 sm:px-10 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-gray-500 transition-colors hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400 group relative z-50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800"
          >
            <svg
              className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Back to Home
          </Link>

          

          <div className="relative z-50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md p-1.5 rounded-full border border-gray-200 dark:border-gray-800">
            <ThemeTogglerTwo />
          </div>
        </div>

        <div className="relative flex lg:flex-row w-full min-h-screen justify-center flex-col dark:bg-gray-900">
          <div className="w-full flex justify-center pt-24 pb-4 sm:hidden">
            <Link href="/" className="block">
              <span className="text-3xl font-black tracking-tighter text-brand-950 dark:text-white drop-shadow-sm">
                SmartEdX
              </span>
            </Link>
          </div>
          {children}
          <div className="lg:w-1/2 w-full h-full min-h-screen bg-brand-950 dark:bg-white/5 lg:grid items-center hidden">
            <div className="relative items-center justify-center flex z-1 pt-16">
              {/* <!-- ===== Common Grid Shape Start ===== --> */}
              <GridShape />
              <div className="flex flex-col items-center max-w-xs">
                <Link href="/" className="block mb-4 hover:scale-105 transition-transform duration-300">
                  <div className="flex items-center gap-3">
                   
                    <span className="text-5xl md:text-6xl font-black tracking-tighter text-white drop-shadow-sm">
                      SmartEdX
                    </span>
                  </div>
                </Link>
                <p className="text-center text-gray-400 dark:text-white/60">
                  The Complete Operating System for Modern Educational Institutes
                </p>
              </div>
            </div>
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
