"use client";
import React from "react";
import { PieChartIcon, ArrowUpIcon, ArrowDownIcon } from "@/icons";

const PERFORMANCE_ROWS = [
  { course: "Mathematics 101", grade: "—", progress: "—", status: "In Progress" },
  { course: "Science Fundamentals", grade: "—", progress: "—", status: "In Progress" },
  { course: "English Literature", grade: "—", progress: "—", status: "In Progress" },
];

const STATUS_COLORS: Record<string, string> = {
  "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  Completed: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  "Not Started": "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400",
};

export default function StudentPerformancePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Performance</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track your grades and progress across all courses</p>
      </div>

      {/* Stat bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Overall GPA", value: "—", icon: <ArrowUpIcon className="w-4 h-4" />, color: "text-success-600 bg-success-50 dark:bg-success-500/15 dark:text-success-500" },
          { label: "Highest Score", value: "—", icon: <ArrowUpIcon className="w-4 h-4" />, color: "text-success-600 bg-success-50 dark:bg-success-500/15 dark:text-success-500" },
          { label: "Lowest Score", value: "—", icon: <ArrowDownIcon className="w-4 h-4" />, color: "text-error-600 bg-error-50 dark:bg-error-500/15 dark:text-error-500" },
          { label: "Completion Rate", value: "—%", icon: null, color: "text-blue-600 bg-blue-50 dark:bg-blue-500/15 dark:text-blue-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5">
            <span className="text-sm text-gray-500 dark:text-gray-400">{s.label}</span>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{s.value}</p>
              {s.icon && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${s.color}`}>
                  {s.icon}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Performance Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-white">Course Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/[0.02] text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Course</th>
                <th className="px-5 py-3 text-left font-medium">Grade</th>
                <th className="px-5 py-3 text-left font-medium">Progress</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {PERFORMANCE_ROWS.map((row) => (
                <tr key={row.course} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4 text-gray-800 dark:text-gray-200 font-medium">{row.course}</td>
                  <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{row.grade}</td>
                  <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{row.progress}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[row.status] ?? ""}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coming soon */}
      <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] px-6 py-8 text-center flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <PieChartIcon className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          📊 Detailed analytics and grade breakdowns coming soon.
        </p>
      </div>
    </div>
  );
}
