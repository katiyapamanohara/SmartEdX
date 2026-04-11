"use client";

import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/landing-animations';

const testimonials = [
  {
    name: "Dr. Sarah J.",
    role: "Dean, MIT School of Tech",
    quote: "SmartEdX's AI proctoring let us run our certification exams online with full confidence. Integrity flags dropped by 90% in the first semester.",
    stars: 5,
  },
  {
    name: "James K.",
    role: "Director of L&D, Global Tech Corp",
    quote: "The Advanced Reports dashboard is now our single source of truth. We finally understand which courses drive real employee performance.",
    stars: 5,
  },
  {
    name: "Prof. Emily R.",
    role: "Chancellor, Open University",
    quote: "Virtual Labs alone justified the switch. Our STEM students complete practicals from home, and engagement scores have never been higher.",
    stars: 5,
  },
];

const StarIcon = () => (
  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

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
          <div className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            Testimonials
          </div>
          <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-indigo-600 to-violet-500 mb-4">
            Trusted by educators worldwide
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Institutions of every size use SmartEdX to deliver better learning outcomes at scale.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-8"
        >
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              variants={fadeInUp}
              whileHover={{ y: -10 }}
              className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 relative flex flex-col"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.stars }).map((_, s) => <StarIcon key={s} />)}
              </div>

              <div className="absolute -top-4 left-8 text-6xl text-indigo-100 dark:text-indigo-900/50 font-serif leading-none select-none">"</div>
              <p className="text-gray-600 dark:text-gray-300 mb-6 relative z-10 italic leading-relaxed flex-1">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-4 border-t border-gray-100 dark:border-gray-700/50 pt-6">
                <div className="w-12 h-12 bg-linear-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center font-bold text-white text-lg shrink-0">
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
