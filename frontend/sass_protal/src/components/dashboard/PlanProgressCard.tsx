"use client";

import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import type { InstituteData } from "@/app/dashboard/page";
import Link from "next/link";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface Props { institutes: InstituteData[] }

const PLAN_PRICES: Record<string, number> = { starter: 29, pro: 79, enterprise: 199 };
const PLAN_LABELS = ["Starter", "Pro", "Enterprise"];
const PLAN_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b"];

export default function PlanProgressCard({ institutes }: Props) {
  const planCounts = [
    institutes.filter((i) => (i.plan || "starter") === "starter").length,
    institutes.filter((i) => i.plan === "pro").length,
    institutes.filter((i) => i.plan === "enterprise").length,
  ];

  const totalInstitutes = institutes.length || 1;
  const mrr = institutes.reduce((sum, i) => sum + (PLAN_PRICES[i.plan || "starter"] || 0), 0);
  const mrrTarget = Math.max(mrr * 1.25, 500);
  const mrrPct = Math.min(Math.round((mrr / mrrTarget) * 100), 100);

  const activeCount = institutes.filter((i) => i.isActive).length;
  const activePct = Math.round((activeCount / totalInstitutes) * 100);

  const options: ApexOptions = {
    colors: ["#465FFF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "radialBar",
      height: 280,
      sparkline: { enabled: true },
    },
    plotOptions: {
      radialBar: {
        startAngle: -85,
        endAngle: 85,
        hollow: { size: "75%" },
        track: { background: "#E4E7EC", strokeWidth: "100%", margin: 5 },
        dataLabels: {
          name: { show: false },
          value: {
            fontSize: "34px",
            fontWeight: "700",
            offsetY: -35,
            color: "#1D2939",
            formatter: (val) => val + "%",
          },
        },
      },
    },
    fill: { type: "solid", colors: ["#465FFF"] },
    stroke: { lineCap: "round" },
    labels: ["Active Institutes"],
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] h-full">
      {/* Top card */}
      <div className="px-5 pt-5 bg-white shadow-sm rounded-2xl pb-6 dark:bg-gray-900 sm:px-6 sm:pt-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Institute Health</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Active vs total institutes</p>

        <div className="relative">
          <div className="max-h-[280px]">
            <ReactApexChart options={options} series={[activePct]} type="radialBar" height={280} />
          </div>
          <span className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-[95%] rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
            {activeCount}/{institutes.length} active
          </span>
        </div>

        <p className="mx-auto mt-8 w-full max-w-[360px] text-center text-sm text-gray-500 dark:text-gray-400">
          {institutes.length === 0
            ? "No institutes created yet. Create your first institute to get started."
            : `You have ${activeCount} active institute${activeCount !== 1 ? "s" : ""} generating an estimated $${mrr}/mo.`}
        </p>
      </div>

      {/* Plan breakdown bottom */}
      <div className="px-5 py-4 space-y-2 sm:px-6">
        <p className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mb-3">Plan Distribution</p>
        {PLAN_LABELS.map((label, i) => {
          const count = planCounts[i];
          const pct = Math.round((count / totalInstitutes) * 100);
          return (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                  {count} &nbsp;·&nbsp; ${PLAN_PRICES[label.toLowerCase()]}/mo each
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: PLAN_COLORS[i] }}
                />
              </div>
            </div>
          );
        })}

        {/* MRR progress */}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase text-gray-400">MRR Progress</span>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">${mrr} / ${Math.round(mrrTarget)}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-500"
              style={{ width: `${mrrPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{mrrPct}% of monthly target</p>
        </div>

        {institutes.length === 0 && (
          <Link
            href="/dashboard/institute"
            className="mt-3 block w-full text-center rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
          >
            Create your first institute
          </Link>
        )}
      </div>
    </div>
  );
}
