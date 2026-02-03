"use client";

import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/landing-animations';

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 overflow-hidden">
           <div className="max-w-7xl mx-auto px-6">
                <motion.div 
                    initial="hidden"
                    whileInView="visible"
                    variants={fadeInUp}
                    className="text-center mb-16"
                >
                  <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-500 mb-4">Loved by Educators</h2>
                  <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                      Join thousands of institutions transforming education with SmartEdX.
                  </p>
               </motion.div>
               <motion.div 
                 initial="hidden"
                 whileInView="visible"
                 variants={staggerContainer}
                 className="grid md:grid-cols-3 gap-8"
               >
                   {[
                       { name: "Dr. Sarah J.", role: "Dean, MIT School of Tech", quote: "SmartEdX enabled us to scale our online programs by 300% without compromising on quality or integrity." },
                       { name: "James K.", role: "Director of L&D, Google", quote: "The institutional insights dashboard has become our single source of truth for global training effectiveness." },
                       { name: "Prof. Emily R.", role: "Chancellor, Open Univ.", quote: "Finally, a platform that understands the complexity of modern university orchestration." },
                   ].map((t, i) => (
                       <motion.div 
                            key={i} 
                            variants={fadeInUp}
                            whileHover={{ y: -10 }}
                            className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 relative"
                       >
                           <div className="absolute -top-4 left-8 text-6xl text-indigo-100 dark:text-indigo-900/50 font-serif">"</div>
                           <p className="text-gray-600 dark:text-gray-300 mb-6 relative z-10 italic">"{t.quote}"</p>
                           <div className="flex items-center gap-4 border-t border-gray-50 dark:border-gray-700/50 pt-6">
                               <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center font-bold text-white text-lg">
                                   {t.name[0]}
                               </div>
                               <div>
                                   <div className="font-bold text-gray-900 dark:text-white">{t.name}</div>
                                   <div className="text-xs font-bold text-indigo-500 uppercase tracking-wide">{t.role}</div>
                               </div>
                           </div>
                       </motion.div>
                   ))}
               </motion.div>
           </div>
      </section>
  );
}
