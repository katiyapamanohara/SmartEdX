"use client";

import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/landing-animations';

const features = [
  {
    color: "blue",
    title: "Live Classes",
    desc: "Real-time video classes with screen sharing, interactive chat, and multi-student breakout rooms.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    ),
  },
  {
    color: "purple",
    title: "Session Recordings",
    desc: "Auto-record every live session. Students replay on demand, teachers annotate for deeper learning.",
    icon: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </>
    ),
  },
  {
    color: "indigo",
    title: "AI Tools & Grading",
    desc: "Lesson plan generator, AI essay grader, class insights, and at-risk student alerts — all in one copilot.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2"
      />
    ),
  },
  {
    color: "red",
    title: "Exam Proctoring",
    desc: "AI-powered integrity monitoring: multi-face detection, gaze tracking, tab-switch alerts, and audio analysis.",
    icon: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </>
    ),
  },
  {
    color: "orange",
    title: "Advanced Reports",
    desc: "Detailed performance analytics, student engagement insights, and CSV exports for leadership decisions.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    ),
  },
  {
    color: "teal",
    title: "Virtual Labs",
    desc: "Browser-based simulation labs for STEM, coding, and vocational courses — no installation required.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
      />
    ),
  },
  {
    color: "pink",
    title: "Voice AI Agent",
    desc: "A 24/7 conversational AI that answers student queries, sends reminders, and guides learners through material.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    ),
  },
  {
    color: "green",
    title: "White-Label Portal",
    desc: "Fully branded institute portal with custom domain, logo, and colour scheme. Your brand, our backbone.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    ),
  },
];

const colorMap: Record<string, { bg: string; text: string; gradient: string }> = {
  blue:   { bg: "bg-blue-50 dark:bg-blue-900/30",   text: "text-blue-600 dark:text-blue-400",   gradient: "from-blue-50 dark:from-blue-900/10" },
  purple: { bg: "bg-purple-50 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", gradient: "from-purple-50 dark:from-purple-900/10" },
  indigo: { bg: "bg-indigo-50 dark:bg-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400", gradient: "from-indigo-50 dark:from-indigo-900/10" },
  red:    { bg: "bg-red-50 dark:bg-red-900/30",    text: "text-red-600 dark:text-red-400",    gradient: "from-red-50 dark:from-red-900/10" },
  orange: { bg: "bg-orange-50 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400", gradient: "from-orange-50 dark:from-orange-900/10" },
  teal:   { bg: "bg-teal-50 dark:bg-teal-900/30",  text: "text-teal-600 dark:text-teal-400",  gradient: "from-teal-50 dark:from-teal-900/10" },
  pink:   { bg: "bg-pink-50 dark:bg-pink-900/30",  text: "text-pink-600 dark:text-pink-400",  gradient: "from-pink-50 dark:from-pink-900/10" },
  green:  { bg: "bg-green-50 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400", gradient: "from-green-50 dark:from-green-900/10" },
};

export function Features() {
  return (
    <section id="features" className="py-24 bg-gray-50 dark:bg-gray-900/50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <div className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            Platform Features
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Everything your institute needs,{" "}
            <span className="text-indigo-600 dark:text-indigo-400">in one place</span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-lg">
            From live teaching to AI-powered grading and exam integrity — SmartEdX covers
            the full learning lifecycle for modern institutes.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, i) => {
            const styles = colorMap[feature.color];
            return (
              <motion.div
                key={i}
                variants={fadeInUp}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="bg-white dark:bg-gray-800 p-7 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700/50 group relative overflow-hidden"
              >
                <div
                  className={`absolute inset-0 bg-linear-to-br ${styles.gradient} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                />
                <div
                  className={`w-12 h-12 ${styles.bg} rounded-2xl flex items-center justify-center ${styles.text} mb-5 group-hover:scale-110 transition-transform duration-300 relative z-10 shadow-sm`}
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {feature.icon}
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 relative z-10">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed relative z-10">
                  {feature.desc}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-1/3 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/3 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl -z-10" />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute top-20 right-10 w-48 h-48 bg-orange-400/10 rounded-full blur-2xl -z-10"
      />
      <motion.div
        animate={{ x: [0, 50, 0], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 12, repeat: Infinity }}
        className="absolute bottom-20 left-10 w-56 h-56 bg-teal-400/10 rounded-full blur-2xl -z-10"
      />
    </section>
  );
}
