"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/landing-animations';

const outcomes = [
  { val: "98%", label: "Course completion rate" },
  { val: "4.2h", label: "Avg. daily engagement" },
  { val: "15k+", label: "Exams proctored" },
  { val: "24/7", label: "AI support uptime" },
];

export function CTA() {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        {/* Outcome stats strip */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          variants={staggerContainer}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          {outcomes.map((o, i) => (
            <motion.div
              key={i}
              variants={fadeInUp}
              className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 text-center shadow-sm"
            >
              <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mb-1">{o.val}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">{o.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Main CTA card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-linear-to-r from-indigo-600 to-violet-600 rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-indigo-600/40"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 relative z-10">
            Ready to digitise your institute?
          </h2>
          <p className="text-indigo-100 text-lg md:text-xl max-w-2xl mx-auto mb-10 relative z-10">
            Go live with live classes, AI grading, and exam proctoring in days —
            not months. Start free, no credit card required.
          </p>

          <motion.div
            initial="hidden"
            whileInView="visible"
            variants={staggerContainer}
            className="flex flex-col sm:flex-row justify-center gap-4 relative z-10"
          >
            <motion.div variants={fadeInUp} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/signin"
                className="px-8 py-4 bg-white text-indigo-600 font-bold rounded-xl shadow-xl hover:bg-gray-50 transition-all block"
              >
                Get Started Free
              </Link>
            </motion.div>
            <motion.div variants={fadeInUp} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="#pricing"
                className="px-8 py-4 bg-indigo-700/50 backdrop-blur-sm text-white border border-indigo-500/30 font-bold rounded-xl hover:bg-indigo-800 transition-all block"
              >
                View Pricing
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
