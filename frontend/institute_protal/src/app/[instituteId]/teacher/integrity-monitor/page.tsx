"use client";
import React from "react";
import { PieChartIcon, AlertIcon, CheckCircleIcon } from "@/icons";

const MOCK_FLAGS = [
  { id: "1", student: "Alex Johnson", exam: "CS101 Midterm", issue: "Multiple tab switches detected", severity: "high", time: "2026-02-24 10:32 AM" },
  { id: "2", student: "Maria Garcia", exam: "CS201 Quiz 1", issue: "Camera disabled during exam", severity: "medium", time: "2026-02-23 02:15 PM" },
  { id: "3", student: "James Lee", exam: "CS101 Midterm", issue: "External monitor detected", severity: "low", time: "2026-02-22 09:50 AM" },
];

const severityConfig = {
  high: { label: "High", cls: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
  medium: { label: "Medium", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
  low: { label: "Low", cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" },
};

export default function TeacherIntegrityMonitorPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integrity Monitor</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review AI-detected academic integrity flags</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Flags", value: MOCK_FLAGS.length, color: "text-red-500" },
          { label: "Reviewed", value: 0, color: "text-green-500" },
          { label: "Pending Review", value: MOCK_FLAGS.length, color: "text-amber-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5">
            <span className="text-sm text-gray-500 dark:text-gray-400">{s.label}</span>
            <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Flags table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03]">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 dark:text-white">Flagged Incidents</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">Demo data · Connect AI service for live flags</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-white/[0.02]">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Student</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Exam</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Issue</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Severity</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Time</th>
                <th className="px-5 py-3 text-end text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {MOCK_FLAGS.map((f) => {
                const sev = severityConfig[f.severity as keyof typeof severityConfig];
                return (
                  <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4 font-medium text-gray-800 dark:text-white/90">{f.student}</td>
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{f.exam}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">{f.issue}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sev.cls}`}>{sev.label}</span>
                    </td>
                    <td className="px-5 py-4 text-gray-400 dark:text-gray-500 text-xs">{f.time}</td>
                    <td className="px-5 py-4 text-end">
                      <button className="text-xs font-medium text-brand-500 hover:underline">Review</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
