"use client";

import type { InstituteData } from "@/app/dashboard/page";

interface Props { institutes: InstituteData[] }

const ALL_FEATURES = [
  { key: "live_sessions",     label: "Live Classes",      icon: "📹" },
  { key: "recordings",        label: "Recordings",        icon: "🎬" },
  { key: "ai_tools",          label: "AI Tools",          icon: "🤖" },
  { key: "exam_proctoring",   label: "Exam Proctoring",   icon: "👁️" },
  { key: "advanced_reports",  label: "Advanced Reports",  icon: "📊" },
  { key: "virtual_labs",      label: "Virtual Labs",      icon: "🧪" },
  { key: "voice_agent",       label: "Voice Agent",       icon: "🎙️" },
];

export default function FeatureUsageCard({ institutes }: Props) {
  const total = institutes.length || 1;

  // Count how many institutes have each feature enabled
  const featureCounts = ALL_FEATURES.map(({ key, label, icon }) => {
    const count = institutes.filter((i) => (i.enabledFeatures || []).includes(key)).length;
    const pct = Math.round((count / total) * 100);
    return { key, label, icon, count, pct };
  }).sort((a, b) => b.count - a.count);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] h-full sm:px-6 sm:pt-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">Feature Adoption</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Which features are enabled across institutes</p>

      {institutes.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No institutes yet.</p>
      ) : (
        <div className="space-y-3">
          {featureCounts.map(({ key, label, icon, count, pct }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">{icon}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{count}/{total}</span>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 w-8 text-right">{pct}%</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {institutes.length > 0 && (
        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Avg. features per institute</span>
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              {(
                institutes.reduce((sum, i) => sum + (i.enabledFeatures || []).length, 0) / institutes.length
              ).toFixed(1)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
