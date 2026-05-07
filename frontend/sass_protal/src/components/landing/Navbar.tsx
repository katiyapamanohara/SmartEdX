"use client";

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useState, useEffect } from 'react';
import { authService } from '@/services/authService';
import UserDropdown from '../header/dashboard/UserDropdown';

export function Navbar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = authService.isAuthenticated();
      if (isAuth) {
        try {
          const profile = await authService.getProfile();
          if (!profile) {
            authService.logout();
            setIsAuthenticated(false);
          } else {
            setIsAuthenticated(true);
          }
        } catch (error) {
          setIsAuthenticated(false);
          authService.logout();
        }
      } else {
        setIsAuthenticated(false);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="fixed top-0 w-full bg-white/70 dark:bg-gray-950/70 backdrop-blur-xl z-50 border-b border-gray-200/50 dark:border-gray-800/50"
    >
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <span className="text-xl md:text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-brand-950 dark:bg-white drop-shadow-sm transition-all hover:scale-105">
            SmartEdX
          </span>
        </Link>

        {/* Desktop nav — hidden on mobile */}
        <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-300">
          {["Features", "Pricing", "FAQ"].map((item) => (
            <Link
              key={item}
              href={`#${item.toLowerCase()}`}
              className="hover:text-brand-500 dark:hover:text-brand-400 transition-colors relative group"
            >
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-500 transition-all group-hover:w-full" />
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative z-50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md p-1.5 rounded-full border border-gray-200 dark:border-gray-800">
            <ThemeToggle />
          </div>

          {/* Desktop auth — hidden on mobile */}
          {!loading && (
            <div className="hidden lg:flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link
                      href="/dashboard"
                      className="px-5 py-2.5 bg-brand-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-brand-500/30 hover:bg-brand-600 transition-all"
                    >
                      Dashboard
                    </Link>
                  </motion.div>
                  <UserDropdown />
                </>
              ) : (
                <>
                  <Link
                    href="/signin"
                    className="text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
                  >
                    Log in
                  </Link>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link
                      href="/signin"
                      className="px-5 py-2.5 bg-brand-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-brand-500/30 hover:bg-brand-600 transition-all"
                    >
                      Get Started
                    </Link>
                  </motion.div>
                </>
              )}
            </div>
          )}

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="lg:hidden overflow-hidden border-t border-gray-200/50 dark:border-gray-800/50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl"
          >
            <div className="px-4 py-3 flex flex-col gap-1">
              {["Features", "Pricing", "FAQ"].map((item) => (
                <Link
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-brand-500 dark:hover:text-brand-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                >
                  {item}
                </Link>
              ))}

              {!loading && (
                <div className="pt-3 mt-2 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2">
                  {isAuthenticated ? (
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full px-3 py-2.5 bg-brand-500 text-white text-sm font-bold rounded-xl text-center hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/30"
                    >
                      Dashboard
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/signin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-3 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-brand-500 dark:hover:text-brand-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                      >
                        Log in
                      </Link>
                      <Link
                        href="/signin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full px-3 py-2.5 bg-brand-500 text-white text-sm font-bold rounded-xl text-center hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/30"
                      >
                        Get Started
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
