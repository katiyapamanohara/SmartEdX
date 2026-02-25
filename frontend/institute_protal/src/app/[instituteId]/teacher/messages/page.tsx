"use client";
import React, { useState } from "react";
import { ChatIcon } from "@/icons";

type Message = {
  id: string;
  from: string;
  avatar: string;
  preview: string;
  time: string;
  unread: number;
};

const MOCK_THREADS: Message[] = [
  { id: "1", from: "Alex Johnson", avatar: "AJ", preview: "Hi, I had a question about the assignment...", time: "10:32 AM", unread: 2 },
  { id: "2", from: "Maria Garcia", avatar: "MG", preview: "Thank you for the feedback on my quiz!", time: "Yesterday", unread: 0 },
  { id: "3", from: "James Lee", avatar: "JL", preview: "When is the next live class?", time: "Mon", unread: 1 },
];

export default function TeacherMessagesPage() {
  const [active, setActive] = useState<string | null>(null);
  const activeThread = MOCK_THREADS.find((t) => t.id === active);

  return (
    <div className="flex flex-col gap-4">
      <div className="py-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Communicate with your students</p>
      </div>

      <div className="flex h-[calc(100vh-220px)] min-h-[480px] rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Thread list */}
        <div className="w-full sm:w-72 border-r border-gray-100 dark:border-gray-700 bg-white dark:bg-white/[0.03] flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <input
              type="text"
              placeholder="Search…"
              className="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {MOCK_THREADS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors border-b border-gray-50 dark:border-gray-800 ${
                  active === t.id ? "bg-brand-50 dark:bg-brand-500/10" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-600 dark:text-brand-400 shrink-0">
                  {t.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-800 dark:text-white/90 truncate">{t.from}</span>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">{t.time}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{t.preview}</p>
                </div>
                {t.unread > 0 && (
                  <span className="mt-1 w-5 h-5 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center shrink-0">
                    {t.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat pane */}
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-white/[0.01]">
          {activeThread ? (
            <>
              <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-600 dark:text-brand-400">
                  {activeThread.avatar}
                </div>
                <span className="font-semibold text-gray-800 dark:text-white">{activeThread.from}</span>
              </div>
              <div className="flex-1 p-5 flex items-center justify-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">Full messaging coming soon. This is a preview.</p>
              </div>
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message…"
                  className="flex-1 text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-brand-500"
                />
                <button className="px-4 py-2 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition-colors">
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <ChatIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400 dark:text-gray-500">Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
