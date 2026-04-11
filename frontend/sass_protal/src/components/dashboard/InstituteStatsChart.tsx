"use client";

import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { InstituteData } from "@/app/dashboard/page";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface Props { institutes: InstituteData[] }

type Tab = "users" | "students" | "features";

export default function InstituteStatsChart({ institutes }: Props) {
  const [tab, setTab] = useState<Tab>("users");

  const names = institutes.map((i) => i.name.length > 14 ? i.name.slice(0, 14) + "…" : i.name);

  const seriesData: Record<Tab, number[]> = {
    users: institutes.map((i) => i.userCount || 0),
    students: institutes.map((i) => parseInt(i.studentCount || "0", 10) || 0),
    features: institutes.map((i) => (i.enabledFeatures || []).length),
  };

  const seriesLabel: Record<Tab, string> = {
    users: "Users",
    students: "Students",
    features: "Features Enabled",
  };

  const colors: Record<Tab, string> = {
    users: "#465FFF",
    students: "#10b981",
    features: "#f59e0b",
  };

  const options: ApexOptions = {
    colors: [colors[tab]],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 260,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: institutes.length > 5 ? "55%" : "35%",
        borderRadius: 6,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: names.length > 0 ? names : ["No institutes"],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "11px", colors: Array(names.length || 1).fill("#9CA3AF") } },
    },
    yaxis: {
      labels: {
        style: { fontSize: "11px", colors: ["#9CA3AF"] },
        formatter: (v) => Math.floor(v).toString(),
      },
      min: 0,
    },
    grid: { yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
    fill: { opacity: 1 },
    tooltip: { y: { formatter: (v) => `${v} ${seriesLabel[tab].toLowerCase()}` } },
  };

  const series = [{ name: seriesLabel[tab], data: seriesData[tab].length > 0 ? seriesData[tab] : [0] }];

  const tabs: { key: Tab; label: string }[] = [
    { key: "users", label: "Users" },
    { key: "students", label: "Students" },
    { key: "features", label: "Features" },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Institute Comparison</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Compare metrics across your institutes</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === t.key
                  ? "bg-white text-brand-600 shadow-sm dark:bg-gray-700 dark:text-brand-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {institutes.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          No institute data yet.
        </div>
      ) : (
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <div className="min-w-[600px] xl:min-w-full">
            <ReactApexChart options={options} series={series} type="bar" height={260} />
          </div>
        </div>
      )}
    </div>
  );
}
