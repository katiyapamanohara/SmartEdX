import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import { ThemeProvider } from "@/context/ThemeContext";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <ThemeProvider>
        <div className="relative flex lg:flex-row w-full h-screen justify-center flex-col  dark:bg-gray-900 sm:p-0">
          {children}
          <div className="lg:w-1/2 w-full h-full bg-white dark:bg-gray-800 lg:grid items-center hidden relative overflow-hidden">
            <div className="absolute inset-0 w-full h-full opacity-100 dark:opacity-100 z-0">
              <Image 
                src="/images/shape/BG-dark.png" 
                alt="Background Pattern Light"
                fill
                className="object-cover dark:hidden block"
                priority
              />
              <Image 
                src="/images/shape/BG.png" 
                alt="Background Pattern Dark"
                fill
                className="object-cover hidden dark:block"
                priority
              />
            </div>
            <div className="relative items-center justify-center flex z-1">
              <div className="flex flex-col items-center text-center max-w-xl space-y-2">
                <Link href="/" className="block mb-4">
                  <Image
                    width={231}
                    height={48}
                    src="/images/logo/articom-light-logo.svg"
                    alt="Articom Logo Light"
                    className="dark:block hidden"
                  />
                  <Image
                    width={231}
                    height={48}
                    src="/images/logo/articom-dark-logo.svg"
                    alt="Articom Logo Dark"
                    className="dark:hidden block"
                  />
                </Link>
                <h2 className="text-lg font-semibold text-white dark:text-black">
                  Empower Your Workflow with AI Agents
                </h2>
                <p className="text-sm text-white/80 dark:text-black/70">
                  Articom is your intelligent command center — automate tasks, streamline operations, and let your AI agents do the heavy lifting while you focus on what matters most.
                </p>
              </div>
            </div>
          </div>
          <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
