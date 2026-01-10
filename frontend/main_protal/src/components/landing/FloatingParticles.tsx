"use client";

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function FloatingParticles() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const colors = [
    "bg-red-500/30 dark:bg-red-500/40", 
    "bg-blue-500/30 dark:bg-blue-500/40", 
    "bg-green-500/30 dark:bg-green-500/40", 
    "bg-yellow-500/30 dark:bg-yellow-500/40", 
    "bg-purple-500/30 dark:bg-purple-500/40", 
    "bg-pink-500/30 dark:bg-pink-500/40", 
    "bg-indigo-500/30 dark:bg-indigo-500/40", 
    "bg-teal-500/30 dark:bg-teal-500/40", 
    "bg-orange-500/30 dark:bg-orange-500/40", 
    "bg-cyan-500/30 dark:bg-cyan-500/40"
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 30 }).map((_, i) => {
        const randomClassName = colors[Math.floor(Math.random() * colors.length)];
        return (
          <motion.div
            key={i}
            className={`absolute ${randomClassName} rounded-full blur-sm`}
            initial={{
              y: "110vh",
              x: Math.random() * 100 + "vw",
              opacity: 0,
              scale: 0
            }}
            animate={{
              y: "-10vh",
              opacity: [0, 0.8, 0],
              scale: 1
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 10
            }}
            style={{
              width: Math.random() * 30 + 10 + "px",
              height: Math.random() * 30 + 10 + "px",
            }}
          />
        );
      })}
    </div>
  );
}
