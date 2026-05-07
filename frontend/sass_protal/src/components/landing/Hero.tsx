"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FloatingParticles } from '@/components/landing/FloatingParticles';
import { fadeInUp, staggerContainer } from '@/lib/landing-animations';

const pills = [
  { label: "Live Classes", color: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800" },
  { label: "AI Grading", color: "bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-800" },
  { label: "Exam Proctoring", color: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800" },
  { label: "Virtual Labs", color: "bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-800" },
];

export function Hero() {
  return (
    <section className="min-h-screen flex justify-center items-center py-24 sm:py-0 sm:h-screen sm:overflow-hidden">
      {/* Animated Background Blobs */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-0 left-1/4 w-200 h-200 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[100px] -z-10"
      />
      <motion.div
        animate={{ scale: [1, 1.1, 1], rotate: [0, -60, 0], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-0 right-1/4 w-150 h-150 bg-violet-500/10 dark:bg-violet-500/20 rounded-full blur-[80px] -z-10"
      />
      <FloatingParticles />
      <motion.div
        animate={{ x: [0, 100, 0], y: [0, -50, 0], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute top-20 right-20 w-64 h-64 bg-pink-400/20 dark:bg-pink-500/20 rounded-full blur-[60px] -z-10"
      />
      <motion.div
        animate={{ x: [0, -80, 0], y: [0, 60, 0], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-20 left-20 w-72 h-72 bg-cyan-400/20 dark:bg-cyan-500/20 rounded-full blur-[60px] -z-10"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
        {/* Badge */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-8 cursor-default"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
          </span>
          Now with Voice AI Agent
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="text-4xl sm:text-5xl md:text-7xl font-extrabold mb-6 tracking-tight leading-tight"
        >
          <span className="bg-clip-text text-transparent bg-linear-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-200 dark:to-gray-400">
            The SaaS platform for{" "}
          </span>
          <br />
          <span className="bg-clip-text text-transparent bg-linear-to-r from-pink-500 via-purple-500 to-indigo-500 dark:from-pink-400 dark:via-purple-400 dark:to-indigo-400 relative">
            Modern Institutes
            <svg
              className="absolute w-full h-3 -bottom-1 left-0 text-pink-400 opacity-40"
              viewBox="0 0 200 9"
              fill="none"
            >
              <path
                d="M2.00025 6.99997C25.7501 9.75017 84.8503 12.5162 197.697 1.57966"
                stroke="currentColor"
                strokeWidth="3"
              />
            </svg>
          </span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="text-base sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed"
        >
          Live classes, AI-powered grading, exam proctoring, virtual labs, and a
          white-label portal — everything your institute needs, in one platform.
        </motion.p>

        {/* Feature pills */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="flex flex-wrap justify-center gap-2 mb-10"
        >
          {pills.map((p) => (
            <motion.span
              key={p.label}
              variants={fadeInUp}
              className={`px-3 py-1 text-xs font-bold rounded-full border ${p.color}`}
            >
              {p.label}
            </motion.span>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <motion.div variants={fadeInUp} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="/signin"
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
            >
              Start Free Trial
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </motion.div>

          <motion.div variants={fadeInUp} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="#pricing"
              className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
            >
              See Pricing
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
