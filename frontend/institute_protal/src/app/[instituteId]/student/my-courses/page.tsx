"use client";
import React from "react";
import { BoxIconLine } from "@/icons";

export default function StudentMyCoursesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Courses</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View all courses you are enrolled in</p>
      </div>

      {/* Stat bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Enrolled", value: "—" },
          { label: "In Progress", value: "—" },
          { label: "Completed", value: "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5">
            <span className="text-sm text-gray-500 dark:text-gray-400">{s.label}</span>
            <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <BoxIconLine className="w-8 h-8 text-gray-400" />
        </div>
        <div>
          <p className="font-semibold text-gray-700 dark:text-gray-300">No courses yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Your enrolled courses will appear here once assigned.</p>
        </div>
      </div>
    </div>
  );
}
