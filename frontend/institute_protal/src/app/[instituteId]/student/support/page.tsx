"use client";
import React, { useState } from "react";
import { InfoIcon } from "@/icons";

const FAQS = [
  { q: "How do I enroll in a course?", a: "Course enrollment is managed by your institute administrator. Contact them for assistance." },
  { q: "How do I submit an assignment?", a: "Assignment submission will be available directly from the Assignments page once your teacher publishes one." },
  { q: "What do I do if I miss a live class?", a: "Recorded sessions will be available in the Live Classes section after the session ends." },
  { q: "How can I view my grades?", a: "Navigate to the Performance page to see all your grades and progress across courses." },
  { q: "Who do I contact for technical issues?", a: "Use the contact form below or email support@smartedx.com for technical assistance." },
];

export default function StudentSupportPage() {
  const [open, setOpen] = useState<number | null>(null);
  const [form, setForm] = useState({ subject: "", message: "" });

  return (
    <div className="flex flex-col gap-8">
      <div className="py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Find answers or reach out for help</p>
      </div>

      {/* FAQ */}
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white">Frequently Asked Questions</h2>
        {FAQS.map((faq, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
            >
              <span className="font-medium text-gray-700 dark:text-gray-200 text-sm">{faq.q}</span>
              <span className="text-gray-400 text-lg leading-none shrink-0">{open === i ? "−" : "+"}</span>
            </button>
            {open === i && (
              <div className="px-5 pb-4 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-3">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Contact Form */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] p-6 flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <InfoIcon className="w-5 h-5 text-brand-500" />
          <h2 className="text-base font-semibold text-gray-800 dark:text-white">Contact Support</h2>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Brief description of your issue"
              className="w-full text-sm bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500/30 text-gray-800 dark:text-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
            <textarea
              rows={4}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Describe your issue in detail…"
              className="w-full text-sm bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500/30 text-gray-800 dark:text-gray-200 resize-none"
            />
          </div>
          <button
            disabled
            className="self-start px-5 py-2 bg-brand-500 text-white text-sm rounded-lg opacity-50 cursor-not-allowed"
          >
            Submit Ticket (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  );
}
