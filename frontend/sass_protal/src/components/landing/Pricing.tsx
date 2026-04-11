"use client";

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/landing-animations';

const plans = [
  {
    key: "starter",
    name: "Starter",
    price: { monthly: 29, yearly: 290 },
    tagline: "For small institutes and bootcamps getting started.",
    cta: "Request Demo",
    href: "/signin",
    highlight: false,
    color: "blue",
    features: [
      "Live Classes",
      "Session Recordings",
      "Up to 200 students",
      "Basic student & teacher portal",
      "Email support",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: { monthly: 79, yearly: 790 },
    tagline: "For growing institutes that need AI and proctoring.",
    cta: "Get Started",
    href: "/signin",
    highlight: true,
    color: "indigo",
    badge: "Most Popular",
    features: [
      "Everything in Starter",
      "AI Tools & Grading",
      "Exam Proctoring",
      "Advanced Analytics & Reports",
      "Up to 1,000 students",
      "Priority support",
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: { monthly: 199, yearly: 1990 },
    tagline: "For established institutions with full platform needs.",
    cta: "Contact Sales",
    href: "/signin",
    highlight: false,
    color: "amber",
    features: [
      "Everything in Pro",
      "Virtual Labs",
      "Voice AI Agent",
      "Unlimited students",
      "White-label custom domain",
      "Dedicated support & SLA",
      "Custom integrations",
    ],
  },
];

const CheckIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="py-24 relative bg-gray-50 dark:bg-gray-900/30 overflow-hidden">
      {/* Background blobs */}
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
          className="text-center mb-12"
        >
          <div className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            Pricing
          </div>
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-lg mb-8">
            Start small and scale as your institute grows. No hidden fees, no lock-in.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setYearly(false)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${!yearly ? "bg-indigo-600 text-white shadow" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${yearly ? "bg-indigo-600 text-white shadow" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
            >
              Yearly
              <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-md font-bold">
                −17%
              </span>
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {plans.map((plan, i) => {
            const price = yearly ? plan.price.yearly : plan.price.monthly;
            const period = yearly ? "/yr" : "/mo";

            if (plan.highlight) {
              return (
                <motion.div
                  key={plan.key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -10 }}
                  className="p-10 bg-indigo-600 dark:bg-indigo-700 rounded-4xl shadow-2xl relative z-10 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/50"
                >
                  {plan.badge && (
                    <div className="absolute top-0 right-0 bg-linear-to-l from-yellow-400 to-orange-400 text-white text-xs font-bold px-4 py-1.5 rounded-bl-2xl rounded-tr-4xl shadow-lg">
                      {plan.badge}
                    </div>
                  )}
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-indigo-200 mb-5 opacity-90">{plan.tagline}</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-5xl font-bold">${price}</span>
                    <span className="text-indigo-200">{period}</span>
                  </div>
                  <Link
                    href={plan.href}
                    className="block w-full py-4 px-6 bg-white text-indigo-600 rounded-xl font-bold text-center hover:bg-indigo-50 transition-colors shadow-lg hover:shadow-xl active:scale-95"
                  >
                    {plan.cta}
                  </Link>
                  <ul className="mt-8 space-y-3 text-sm text-indigo-100 font-medium">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-3 items-start">
                        <span className="text-indigo-300 mt-0.5"><CheckIcon /></span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, x: i === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                className="p-8 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm relative h-fit"
              >
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{plan.tagline}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">${price}</span>
                  <span className="text-gray-500 dark:text-gray-400">{period}</span>
                </div>
                <Link
                  href={plan.href}
                  className="block w-full py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-xl font-bold text-center text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {plan.cta}
                </Link>
                <ul className="mt-8 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-3 items-start">
                      <span className="text-green-500 mt-0.5"><CheckIcon /></span>
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        {/* Feature comparison note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-gray-400 dark:text-gray-500 mt-10"
        >
          All plans include SSL, GDPR-compliant data handling, and 99.9% uptime SLA.
          <span className="text-indigo-500 dark:text-indigo-400 font-medium ml-1 cursor-pointer hover:underline">
            View full feature comparison →
          </span>
        </motion.p>
      </div>
    </section>
  );
}
