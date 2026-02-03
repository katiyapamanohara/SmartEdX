"use client";

import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/landing-animations';

export function ProctoringSection() {
  return (
    <section className="py-24 overflow-hidden relative">
          <div className="max-w-7xl mx-auto px-6">
              <div className="flex flex-col lg:flex-row items-center gap-16">
                  <motion.div 
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeInUp}
                    className="lg:w-1/2"
                  >
                      <div className="inline-block px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full text-xs font-bold uppercase tracking-wider mb-6">Compliance & Integrity</div>
                      <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">AI Accreditation & Proctoring</h2>
                      <p className="text-lg text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                          Automate compliance reporting and ensure academic integrity across thousands of students simultaneously.
                      </p>
                      <ul className="space-y-4">
                          {[
                              "Multi-face detection",
                              "Tab switching monitoring",
                              "Suspicious gaze tracking",
                              "Audio background analysis"
                          ].map((item, i) => (
                              <motion.li 
                                key={i} 
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-center gap-3 text-gray-700 dark:text-gray-300 font-medium"
                              >
                                  <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                  </div>
                                  {item}
                              </motion.li>
                          ))}
                      </ul>
                  </motion.div>
                  <motion.div 
                     initial={{ opacity: 0, scale: 0.8 }}
                     whileInView={{ opacity: 1, scale: 1 }}
                     transition={{ duration: 0.8 }}
                     className="lg:w-1/2 relative"
                  >
                      <div className="absolute inset-0 bg-red-500/10 blur-3xl rounded-full"></div>
                      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 p-2">
                           {/* Mock UI for Proctoring */}
                           <div className="bg-gray-900 aspect-video rounded-xl relative flex items-center justify-center overflow-hidden">
                               <div className="absolute top-4 right-4 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.7)]">• REC</div>
                               <div className="text-center w-full h-full flex flex-col items-center justify-center relative">
                                   <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544717297-fa95b6ee9643?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
                                   <div className="w-48 h-48 border-2 border-red-500 rounded-lg relative z-10 shadow-[0_0_20px_rgba(220,38,38,0.5)] flex flex-col justify-between p-2">
                                        <div className="text-xs text-red-500 font-mono">TRACKING FACE...</div>
                                        <div className="self-end"><div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div></div>
                                   </div>
                                   <p className="text-gray-300 text-sm mt-4 font-mono z-10">Webcam Feed Analysis • 98% Confidence</p>
                                   <div className="mt-4 flex gap-2 justify-center z-10">
                                       <span className="w-12 h-1 bg-green-500 rounded animate-pulse"></span>
                                       <span className="w-12 h-1 bg-green-500 rounded animate-pulse delay-75"></span>
                                       <span className="w-12 h-1 bg-gray-600 rounded"></span>
                                   </div>
                               </div>
                           </div>
                      </div>
                  </motion.div>
              </div>
          </div>
      </section>
  );
}
