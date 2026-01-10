"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export function Navbar() {
  return (
    <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="fixed top-0 w-full bg-white/70 dark:bg-gray-950/70 backdrop-blur-xl z-50 border-b border-gray-200/50 dark:border-gray-800/50 supports-[backdrop-filter]:bg-white/60"
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 group-hover:from-indigo-600 group-hover:to-violet-600 transition-all">SmartEdX</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-300">
            {["Features", "Pricing", "FAQ"].map((item) => (
              <Link key={item} href={`#${item.toLowerCase()}`} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors relative group">
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-600 transition-all group-hover:w-full"></span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/signin" className="hidden sm:block text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Log in
            </Link>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/signin" className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 hover:shadow-indigo-600/50 transition-all">
                Get Started
                </Link>
            </motion.div>
          </div>
        </div>
      </motion.header>
  );
}
