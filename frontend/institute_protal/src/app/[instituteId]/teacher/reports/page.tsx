"use client";
import React from "react";
import { DocsIcon, ArrowDownIcon } from "@/icons";

const REPORTS = [
  { id: "1", title: "Student Performance Report", desc: "Overall grade distribution and completion rates", updated: "Feb 2026", type: "Performance" },
  { id: "2", title: "Course Engagement Summary", desc: "Module access frequency and time spent per student", updated: "Feb 2026", type: "Engagement" },
  { id: "3", title: "Assessment Results Export", desc: "Individual scores for all quizzes and exams", updated: "Jan 2026", type: "Assessment" },
];

const TYPE_COLORS: Record<string, string> = {
  Performance: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  Engagement: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",
  Assessment: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
};

export default function TeacherReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Download and view detailed teaching reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {REPORTS.map((r) => (
          <div
            key={r.id}
            className="flex flex-col gap-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <DocsIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[r.type] ?? ""}`}>{r.type}</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white leading-snug">{r.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{r.desc}</p>
            </div>
            <div className="mt-auto flex items-center justify-between">
              <span className="text-xs text-gray-400 dark:text-gray-500">Updated {r.updated}</span>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors">
                <ArrowDownIcon className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Coming soon banner */}
      <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] px-6 py-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          📊 Custom report builder and scheduled exports coming soon.
        </p>
      </div>
    </div>
  );
}
