"use client";

import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/landing-animations';

export function Features() {
  return (
    <section id="features" className="py-24 bg-gray-50 dark:bg-gray-900/50 relative">
          <div className="max-w-7xl mx-auto px-6">
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={fadeInUp}
                className="text-center mb-16"
              >
                  <h2 className="text-4xl md:text-5xl font-bold mb-4"><span className="text-indigo-600 dark:text-indigo-400">Enterprise-Grade</span> Infrastructure</h2>
                  <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-lg">
                      Everything you need to digitize your entire institution, from admissions to alumni.
                  </p>
              </motion.div>

              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                variants={staggerContainer}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                  {[
                      { icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />, title: "Unified Campus ID", desc: "Seamless SSO integration for students, faculty, and staff.", color: "green" },
                      { icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />, title: "Curriculum Orchestration", desc: "Centralized syllabus management across multiple departments.", color: "blue" },
                      { icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />, title: "Accreditation AI", desc: "Automated compliance monitoring and report generation.", extraPath: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />, color: "red" },
                      { icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />, title: "Institutional Insights", desc: "Real-time ROI and retention dashboards for leadership.", color: "orange" },
                      { icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />, title: "Faculty Copilot", desc: "AI assistant for grading, scheduling, and research.", color: "purple" },
                      { icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />, title: "White-Label Portal", desc: "Fully branded student experience with custom domains.", color: "teal" },
                  ].map((feature, i) => {
                      const colorMap: Record<string, { bg: string, text: string, gradient: string }> = {
                          green: { bg: "bg-green-50 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400", gradient: "from-green-50 dark:from-green-900/10" },
                          blue: { bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", gradient: "from-blue-50 dark:from-blue-900/10" },
                          red: { bg: "bg-red-50 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400", gradient: "from-red-50 dark:from-red-900/10" },
                          orange: { bg: "bg-orange-50 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400", gradient: "from-orange-50 dark:from-orange-900/10" },
                          purple: { bg: "bg-purple-50 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", gradient: "from-purple-50 dark:from-purple-900/10" },
                          teal: { bg: "bg-teal-50 dark:bg-teal-900/30", text: "text-teal-600 dark:text-teal-400", gradient: "from-teal-50 dark:from-teal-900/10" },
                      };
                      const styles = colorMap[feature.color || "blue"];

                      return (
                      <motion.div 
                        key={i} 
                        variants={fadeInUp}
                        whileHover={{ y: -5, transition: { duration: 0.2 } }}
                        className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700/50 group relative overflow-hidden"
                      >
                           <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                          <div className={`w-14 h-14 ${styles.bg} rounded-2xl flex items-center justify-center ${styles.text} mb-6 group-hover:scale-110 transition-transform duration-300 relative z-10 shadow-sm`}>
                              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  {feature.extraPath}
                                  {feature.icon}
                              </svg>
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 relative z-10">{feature.title}</h3>
                          <p className="text-gray-500 dark:text-gray-400 leading-relaxed relative z-10">{feature.desc}</p>
                      </motion.div>
                  )})}
              </motion.div>
          </div>
          {/* Decorative Elements */}
          <div className="absolute top-1/3 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10"></div>
          <div className="absolute bottom-1/3 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl -z-10"></div>
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute top-20 right-10 w-48 h-48 bg-orange-400/10 rounded-full blur-[40px] -z-10"
          />
          <motion.div 
            animate={{ x: [0, 50, 0], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 12, repeat: Infinity }}
            className="absolute bottom-20 left-10 w-56 h-56 bg-teal-400/10 rounded-full blur-[40px] -z-10"
          />
      </section>
  );
}
