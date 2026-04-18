"use client";

import type { InstituteData } from "@/app/dashboard/page";

const PLAN_PRICES: Record<string, number> = { starter: 29, pro: 79, enterprise: 199 };

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pro: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  enterprise: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

interface Props { institutes: InstituteData[] }

export default function InstituteMetrics({ institutes }: Props) {
  const totalInstitutes = institutes.length;
  const activeInstitutes = institutes.filter((i) => i.isActive).length;
  const totalUsers = institutes.reduce((sum, i) => sum + (i.userCount || 0), 0);
  const totalStudents = institutes.reduce((sum, i) => sum + (i.realStudentCount ?? 0), 0);

  const planMap = institutes.reduce<Record<string, number>>((acc, i) => {
    const p = i.plan || "starter";
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  const mrr = Object.entries(planMap).reduce(
    (sum, [plan, count]) => sum + (PLAN_PRICES[plan] || 0) * count,
    0
  );

  const topPlan = Object.entries(planMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const metrics = [
    {
      label: "Total Institutes",
      value: totalInstitutes,
      sub: `${activeInstitutes} active`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      gradient: "from-brand-500 to-brand-600",
    },
    {
      label: "Total Users",
      value: totalUsers,
      sub: "Across all institutes",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      gradient: "from-emerald-500 to-emerald-600",
    },
    {
      label: "Total Students",
      value: totalStudents.toLocaleString(),
      sub: "Enrolled across institutes",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      ),
      gradient: "from-violet-500 to-violet-600",
    },
    {
      label: "Est. MRR",
      value: `$${mrr.toLocaleString()}`,
      sub: `Top plan: ${topPlan}`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: "from-amber-500 to-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">{m.label}</span>
            <div className={`bg-gradient-to-br ${m.gradient} rounded-xl p-2 text-white`}>
              {m.icon}
            </div>
          </div>
          <h4 className="text-2xl font-bold text-gray-800 dark:text-white/90">{m.value}</h4>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{m.sub}</p>
        </div>
      ))}

      {/* Plan breakdown pills */}
      {Object.keys(planMap).length > 0 && (
        <div className="col-span-2 flex flex-wrap gap-2">
          {Object.entries(planMap).map(([plan, count]) => (
            <span
              key={plan}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold capitalize ${PLAN_COLORS[plan] || PLAN_COLORS.starter}`}
            >
              {plan} <span className="font-normal opacity-70">· {count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
