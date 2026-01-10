"use client";

import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/landing-animations';

export function AnalyticsSection() {
  return (
    <section className="py-24 bg-gray-50 dark:bg-gray-900/30">
          <div className="max-w-7xl mx-auto px-6">
              <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
                  <motion.div 
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeInUp}
                    className="lg:w-1/2"
                   >
                       <div className="inline-block px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider mb-6">Executive Overview</div>
                      <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">Institutional ROI Analytics</h2>
                      <p className="text-lg text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                          Track enrollment trends, faculty performance, and student retention rates in real-time. Make data-backed decisions.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                           {[
                               { val: "98%", label: "Completion Rate", color: "text-green-500" },
                               { val: "4.2h", label: "Avg. Engagement", color: "text-blue-500" },
                               { val: "15k+", label: "Quizzes Graded", color: "text-purple-500" },
                               { val: "24/7", label: "Availability", color: "text-orange-500" },
                           ].map((stat, i) => (
                               <motion.div 
                                    key={i}
                                    whileHover={{ scale: 1.05 }}
                                    className="p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all"
                               >
                                   <div className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.val}</div>
                                   <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
                               </motion.div>
                           ))}
                      </div>
                  </motion.div>
                   <motion.div 
                     initial={{ opacity: 0, x: -50 }}
                     whileInView={{ opacity: 1, x: 0 }}
                     transition={{ duration: 0.8 }}
                     className="lg:w-1/2 relative"
                   >
                      <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full"></div>
                      {/* Mock Chart UI */}
                      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 p-6">
                          <div className="flex justify-between items-center mb-6">
                              <h4 className="font-bold text-gray-700 dark:text-gray-200">Student Progress</h4>
                              <div className="flex gap-2 text-xs">
                                  <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-md">Weekly</span>
                              </div>
                          </div>
                          <div className="h-64 flex items-end justify-between gap-2">
                              {[30, 45, 35, 60, 50, 75, 65, 80, 70, 90, 85, 95].map((h, i) => (
                                  <motion.div 
                                    key={i} 
                                    initial={{ height: 0 }}
                                    whileInView={{ height: `${h}%` }}
                                    transition={{ duration: 1, delay: i * 0.05 }}
                                    className="w-full bg-indigo-100 dark:bg-indigo-900/30 rounded-t-lg relative group overflow-hidden"
                                  >
                                      <div className="absolute bottom-0 w-full h-full bg-gradient-to-t from-indigo-600 to-indigo-400 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                                  </motion.div>
                              ))}
                          </div>
                      </div>
                  </motion.div>
              </div>
          </div>
      </section>
  );
}
