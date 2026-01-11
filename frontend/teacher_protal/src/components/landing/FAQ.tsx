"use client";

import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/landing-animations';

export function FAQ() {
  return (
    <section id="faq" className="py-24">
          <div className="max-w-3xl mx-auto px-6">
               <motion.h2 
                    initial="hidden"
                    whileInView="visible"
                    variants={fadeInUp}
                    className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12"
               >
                   Frequently Asked Questions
               </motion.h2>
               <div className="space-y-4">
                   {[
                       { q: "How does AI Proctoring work?", a: "Our AI monitors webcam and screen activity to detect suspicious behavior like multiple faces, tab switching, or external voices, flagging them for instructor review." },
                       { q: "Can I customize the grading criteria?", a: "Yes! You can set specific rubrics and keywords for the AI to look for when grading essays and open-ended questions." },
                       { q: "Is my data secure?", a: "Absolutely. We use enterprise-grade encryption and comply with FERPA and GDPR regulations to ensure student data privacy." },
                   ].map((item, i) => (
                       <motion.details 
                           key={i} 
                           initial={{ opacity: 0, y: 10 }}
                           whileInView={{ opacity: 1, y: 0 }}
                           transition={{ delay: i * 0.1 }}
                           className="group bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer open:ring-2 open:ring-indigo-100 dark:open:ring-indigo-900"
                       >
                           <summary className="font-bold text-lg text-gray-900 dark:text-white mb-2 list-none flex justify-between items-center">
                               {item.q}
                               <span className="transition-transform group-open:rotate-180">
                                   <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                               </span>
                           </summary>
                           <p className="text-gray-500 dark:text-gray-400 mt-2 leading-relaxed animate-fadeIn">{item.a}</p>
                       </motion.details>
                   ))}
               </div>
          </div>
      </section>
  );
}
