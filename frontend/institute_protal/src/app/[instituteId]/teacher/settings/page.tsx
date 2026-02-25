"use client";
import React, { useState } from "react";
import { authService } from "@/services/authService";

export default function TeacherSettingsPage() {
  const user = authService.getUser();

  const [notifications, setNotifications] = useState({
    emailAssessments: true,
    emailMessages: true,
    emailSessionReminders: false,
    pushAll: false,
  });

  const toggle = (key: keyof typeof notifications) =>
    setNotifications((p) => ({ ...p, [key]: !p[key] }));

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
      <div className="px-6 py-4">
        <h2 className="font-semibold text-gray-800 dark:text-white">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </div>
  );

  const Toggle = ({ label, sublabel, checked, onChange }: { label: string; sublabel?: string; checked: boolean; onChange: () => void }) => (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-white/90">{label}</p>
        {sublabel && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
      <label className="inline-flex items-center cursor-pointer shrink-0">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-500" />
      </label>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your account preferences</p>
      </div>

      {/* Profile info (read-only) */}
      <Section title="Profile Information">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">First Name</label>
              <div className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
                {user?.firstName || "—"}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Last Name</label>
              <div className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
                {user?.lastName || "—"}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email Address</label>
            <div className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
              {user?.email || "—"}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Role</label>
            <div className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 capitalize">
              {user?.role || "Teacher"}
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Profile details are managed by your institute administrator.
          </p>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <Toggle
          label="New Assessment Submissions"
          sublabel="Get emailed when a student submits an assessment"
          checked={notifications.emailAssessments}
          onChange={() => toggle("emailAssessments")}
        />
        <Toggle
          label="New Messages"
          sublabel="Email alerts for student messages"
          checked={notifications.emailMessages}
          onChange={() => toggle("emailMessages")}
        />
        <Toggle
          label="Session Reminders"
          sublabel="Reminder 15 minutes before a live class starts"
          checked={notifications.emailSessionReminders}
          onChange={() => toggle("emailSessionReminders")}
        />
        <Toggle
          label="Push Notifications"
          sublabel="Browser push notifications for all activity"
          checked={notifications.pushAll}
          onChange={() => toggle("pushAll")}
        />
      </Section>

      {/* Danger zone */}
      <Section title="Account">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">Sign Out</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Sign out from your current session</p>
          </div>
          <button
            onClick={() => authService.logout()}
            className="px-4 py-2 text-sm rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </Section>
    </div>
  );
}
