"use client";

import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/landing-animations';

export function Pricing() {
  return (
    <section id="pricing" className="py-24 relative bg-gray-50 dark:bg-gray-900/30 overflow-hidden">
           {/* Pricing Bubbles */}
           <motion.div 
              animate={{ y: [0, -30, 0], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 8, repeat: Infinity }}
              className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none"
           />
           <motion.div 
              animate={{ x: [0, -30, 0], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 10, repeat: Infinity }}
              className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"
           />
           <div className="max-w-7xl mx-auto px-6 relative z-10">
                <motion.div 
                    initial="hidden"
                    whileInView="visible"
                    variants={fadeInUp}
                    className="text-center mb-16"
                >
                  <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Simple, transparent pricing</h2>
                  <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-lg">
                      Start for free, scale as you grow. No hidden fees.
                  </p>
               </motion.div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                   {/* Standard Plan */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        whileHover={{ y: -5 }}
                        className="p-8 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm relative h-fit"
                    >
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Institute Starter</h3>
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-4xl font-bold text-gray-900 dark:text-white">$499</span>
                            <span className="text-gray-500">/mo</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">For small colleges and bootcamps.</p>
                        <button className="w-full py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Request Demo</button>
                        <ul className="mt-8 space-y-4 text-sm text-gray-600 dark:text-gray-300">
                            {[1,2,3].map(i => <li key={i} className="flex gap-3 items-center"><svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Basic White-labeling</li>)}
                        </ul>
                    </motion.div>

                    {/* Pro Plan (Highlighted) */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        whileHover={{ y: -10 }}
                        className="p-10 bg-indigo-600 dark:bg-indigo-700 rounded-[2rem] shadow-2xl relative z-10 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/50"
                    >
                         <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-400 to-orange-400 text-white text-xs font-bold px-4 py-1.5 rounded-bl-2xl rounded-tr-xl shadow-lg">POPULAR</div>
                        <h3 className="text-xl font-bold mb-2">Campus Scale</h3>
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-5xl font-bold">$1,999</span>
                            <span className="text-indigo-200">/mo</span>
                        </div>
                        <p className="text-sm text-indigo-100 mb-8 font-medium opacity-90">For growing universities.</p>
                        <button className="w-full py-4 px-6 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg hover:shadow-xl transform active:scale-95">Get Started</button>
                        <ul className="mt-8 space-y-4 text-sm text-indigo-100 font-medium">
                             {[1,2,3,4,5].map(i => <li key={i} className="flex gap-3 items-center"><svg className="w-5 h-5 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Advanced Accreditation</li>)}
                        </ul>
                    </motion.div>

                    {/* Enterprise Plan */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        whileHover={{ y: -5 }}
                        className="p-8 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm relative h-fit"
                    >
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Global University</h3>
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-4xl font-bold text-gray-900 dark:text-white">Custom</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">For multi-campus networks.</p>
                        <button className="w-full py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Contact Sales</button>
                         <ul className="mt-8 space-y-4 text-sm text-gray-600 dark:text-gray-300">
                            {[1,2,3,4].map(i => <li key={i} className="flex gap-3 items-center"><svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Dedicated Infrastructure</li>)}
                        </ul>
                    </motion.div>
               </div>
           </div>
      </section>
  );
}
