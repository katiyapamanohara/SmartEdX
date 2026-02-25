"use client";
import React from "react";
import { VideoIcon } from "@/icons";

export default function StudentLiveClassesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Classes</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Join scheduled live sessions for your enrolled courses</p>
      </div>

      {/* Stat bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Upcoming Today", value: "—" },
          { label: "This Week", value: "—" },
          { label: "Total Attended", value: "—" },
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
          <VideoIcon className="w-8 h-8 text-gray-400" />
        </div>
        <div>
          <p className="font-semibold text-gray-700 dark:text-gray-300">No live classes scheduled</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Upcoming live sessions will appear here. 🎥 Live class integration coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
