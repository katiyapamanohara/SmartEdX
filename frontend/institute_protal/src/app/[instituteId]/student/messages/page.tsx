"use client";
import React, { useState } from "react";
import { ChatIcon, PaperPlaneIcon } from "@/icons";

const CONVERSATIONS = [
  { id: "1", name: "Mathematics 101 — Teacher", lastMessage: "No messages yet", time: "", unread: 0 },
  { id: "2", name: "Science Fundamentals — Teacher", lastMessage: "No messages yet", time: "", unread: 0 },
];

export default function StudentMessagesPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Communicate with your teachers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[500px]">
        {/* Sidebar */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Conversations</p>
          </div>
          {CONVERSATIONS.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors border-b border-gray-100 dark:border-gray-800 ${selected === c.id ? "bg-brand-50 dark:bg-brand-500/10" : ""}`}
            >
              <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
                {c.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{c.name}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{c.lastMessage}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Chat Area */}
        <div className="md:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] flex flex-col">
          {selected ? (
            <>
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <p className="font-semibold text-gray-800 dark:text-white text-sm">
                  {CONVERSATIONS.find((c) => c.id === selected)?.name}
                </p>
              </div>
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-sm text-gray-400 dark:text-gray-500">No messages yet. Start the conversation!</p>
              </div>
              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3">
                <input
                  type="text"
                  disabled
                  placeholder="Messaging coming soon…"
                  className="flex-1 text-sm bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 outline-none text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
                <button disabled className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center opacity-50 cursor-not-allowed">
                  <PaperPlaneIcon className="w-4 h-4 text-white" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <ChatIcon className="w-7 h-7 text-gray-400" />
              </div>
              <p className="font-semibold text-gray-700 dark:text-gray-300">Select a conversation</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Choose a conversation from the left to start messaging.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
