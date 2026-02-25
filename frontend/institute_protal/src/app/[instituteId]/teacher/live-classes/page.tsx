"use client";
import React, { useState } from "react";
import { VideoIcon } from "@/icons";

const DEMO_SESSIONS = [
  { id: "1", title: "Introduction to Web Development", course: "CS101", date: "2026-03-01", time: "10:00 AM", status: "upcoming" },
  { id: "2", title: "Advanced Data Structures", course: "CS201", date: "2026-02-28", time: "2:00 PM", status: "upcoming" },
];

export default function TeacherLiveClassesPage() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const sessions = DEMO_SESSIONS.filter((s) => s.status === tab);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Classes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Schedule and manage your live sessions</p>
        </div>
        <button
          disabled
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white text-sm rounded-lg opacity-60 cursor-not-allowed"
        >
          + Schedule Class
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <VideoIcon className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">No {tab} sessions found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] p-5"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
                  <VideoIcon className="w-6 h-6 text-brand-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">{s.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.course} · {s.date} at {s.time}</p>
                </div>
              </div>
              <button className="px-4 py-1.5 text-sm rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors">
                Join
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
