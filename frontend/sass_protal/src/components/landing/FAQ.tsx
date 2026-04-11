"use client";

import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/landing-animations';

const faqs = [
  {
    q: "How does Exam Proctoring work?",
    a: "Our AI monitors the webcam in real time — detecting multiple faces, suspicious gaze direction, tab switching, and background audio. Every flag is logged for instructor review, so you can run trustworthy online exams without a physical supervisor.",
  },
  {
    q: "What's included in AI Tools & Grading?",
    a: "The AI suite includes a lesson plan generator, an essay grader with custom rubrics, per-class engagement insights, and automatic at-risk student alerts so teachers can intervene before a student falls behind.",
  },
  {
    q: "Can I brand the platform with my institute's identity?",
    a: "Yes. Enterprise plans include a fully white-labeled portal — your own domain, logo, and color scheme. Students and teachers see your brand, not ours.",
  },
  {
    q: "What are Virtual Labs?",
    a: "Virtual Labs are browser-based simulation environments for STEM, coding, and vocational courses. Students run experiments and write code directly in the platform — no software installation required.",
  },
  {
    q: "How does the Voice AI Agent help students?",
    a: "The Voice AI Agent is a 24/7 conversational assistant that answers student questions, sends course reminders, and guides learners through material — reducing the support load on teaching staff.",
  },
  {
    q: "Is student data secure and compliant?",
    a: "Absolutely. SmartEdX uses enterprise-grade encryption, GDPR-compliant data handling, and a 99.9% uptime SLA. All plans include SSL and role-based access controls.",
  },
  {
    q: "Can I switch plans as my institute grows?",
    a: "Yes, you can upgrade or downgrade at any time. Moving to a higher plan unlocks additional features immediately; downgrades take effect at the next billing cycle.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="py-24">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          variants={fadeInUp}
          className="text-center mb-12"
        >
          <div className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            FAQ
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Frequently asked questions
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((item, i) => (
            <motion.details
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer open:ring-2 open:ring-indigo-100 dark:open:ring-indigo-900"
            >
              <summary className="font-bold text-base text-gray-900 dark:text-white list-none flex justify-between items-center gap-4">
                {item.q}
                <span className="transition-transform duration-200 group-open:rotate-180 shrink-0">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <p className="text-gray-500 dark:text-gray-400 mt-3 leading-relaxed text-sm">{item.a}</p>
            </motion.details>
          ))}
        </div>
      </div>
    </section>
  );
}
