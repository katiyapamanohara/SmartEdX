"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FloatingParticles } from '@/components/landing/FloatingParticles';
import { fadeInUp, staggerContainer } from '@/lib/landing-animations';

export function Hero() {
  return (
    <section className="h-screen overflow-hidden flex justify-center items-center ">
        {/* Animated Background Blobs */}
        <motion.div 
            animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0],
                opacity: [0.3, 0.5, 0.3] 
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[100px] -z-10"
        />
        <motion.div 
            animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, -60, 0],
                opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-violet-500/10 dark:bg-violet-500/20 rounded-full blur-[80px] -z-10"
        />
        {/* Floating Particles */}
        <FloatingParticles />
        {/* New Colorful Bubbles */}
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

        <div className="max-w-7xl mx-auto px-6 text-center">
            <motion.div 
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-8 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-default"
            >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                New: AI Proctoring 2.0
            </motion.div>
            
            <motion.h1 
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight leading-1.1"
            >
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-200 dark:to-gray-400">The Operating System for </span>
                <br/>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 dark:from-pink-400 dark:via-purple-400 dark:to-indigo-400 relative">
                    Modern Institutes
                    <svg className="absolute w-full h-3 -bottom-1 left-0 text-pink-400 opacity-40" viewBox="0 0 200 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.00025 6.99997C25.7501 9.75017 84.8503 12.5162 197.697 1.57966" stroke="currentColor" strokeWidth="3"></path></svg>
                </span>
            </motion.h1>

            <motion.p 
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
                A unified, white-label platform to manage multi-campus operations, automate accreditation, and deliver world-class learning experiences at scale.
            </motion.p>

            <motion.div 
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
                <motion.div variants={fadeInUp} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link href="/signin" className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                        Start Free Trial
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </Link>
                </motion.div>

                <motion.div variants={fadeInUp} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link href="#demo" className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2">
                         <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                            <svg className="w-3 h-3 text-indigo-600 dark:text-indigo-400 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                         </div>
                        Schedule Demo
                    </Link>
                </motion.div>
            </motion.div>
        </div>
      </section>
  );
}
