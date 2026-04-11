"use client";

import Link from "next/link";
import type { InstituteData } from "@/app/dashboard/page";

interface Props { institutes: InstituteData[] }

const PLAN_COLORS: Record<string, string> = {
  starter:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pro:        "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  enterprise: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const PLAN_PRICES: Record<string, number> = { starter: 29, pro: 79, enterprise: 199 };

const AVATAR_GRADIENTS = [
  "from-brand-400 to-brand-600",
  "from-emerald-400 to-emerald-600",
  "from-violet-400 to-violet-600",
  "from-amber-400 to-amber-600",
  "from-rose-400 to-rose-600",
];

export default function RecentInstitutes({ institutes }: Props) {
  const sorted = [...institutes]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <div className="flex flex-col gap-2 px-5 pt-5 pb-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pt-6 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Your Institutes</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{institutes.length} institute{institutes.length !== 1 ? "s" : ""} total</p>
        </div>
        <Link
          href="/dashboard/institute"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 transition-colors"
        >
          Manage all
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {institutes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">No institutes yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-4">Create your first institute to get started</p>
          <Link
            href="/dashboard/institute"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            Create Institute
          </Link>
        </div>
      ) : (
        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                <th className="px-5 py-3 sm:px-6">Institute</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3 hidden sm:table-cell">Users</th>
                <th className="px-5 py-3 hidden md:table-cell">Students</th>
                <th className="px-5 py-3 hidden lg:table-cell">Features</th>
                <th className="px-5 py-3 text-right sm:px-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {sorted.map((inst, idx) => (
                <tr
                  key={inst.id}
                  className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  {/* Name + category */}
                  <td className="px-5 py-3.5 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-xl bg-gradient-to-br ${AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]} flex items-center justify-center text-white font-bold text-sm shrink-0`}
                      >
                        {inst.name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 dark:text-white/90 truncate max-w-[140px]">
                          {inst.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{inst.category || "General"} · {inst.country || "—"}</p>
                      </div>
                    </div>
                  </td>

                  {/* Plan badge */}
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${PLAN_COLORS[inst.plan || "starter"]}`}>
                        {inst.plan || "starter"}
                      </span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        ${PLAN_PRICES[inst.plan || "starter"]}/mo
                      </span>
                    </div>
                  </td>

                  {/* Users */}
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-gray-600 dark:text-gray-300 font-medium">{inst.userCount || 0}</span>
                    </div>
                  </td>

                  {/* Students */}
                  <td className="px-5 py-3.5 hidden md:table-cell text-gray-600 dark:text-gray-300">
                    {inst.studentCount || "—"}
                  </td>

                  {/* Feature pills */}
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {(inst.enabledFeatures || []).slice(0, 3).map((f) => (
                        <span
                          key={f}
                          className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        >
                          {f.replace("_", " ")}
                        </span>
                      ))}
                      {(inst.enabledFeatures || []).length > 3 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 dark:bg-gray-700">
                          +{(inst.enabledFeatures || []).length - 3}
                        </span>
                      )}
                      {(inst.enabledFeatures || []).length === 0 && (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-5 py-3.5 text-right sm:px-6">
                    <Link
                      href={`/dashboard/institute/${inst.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 transition-colors"
                    >
                      Manage
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
