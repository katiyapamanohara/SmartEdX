"use client";

import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import type { InstituteData } from "@/app/dashboard/page";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface Props { institutes: InstituteData[] }

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function buildMonthlyGrowth(institutes: InstituteData[]) {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Count institutes created per month this year
  const institutesPerMonth = Array(12).fill(0);
  const usersPerMonth = Array(12).fill(0);

  institutes.forEach((inst) => {
    const d = new Date(inst.createdAt);
    if (d.getFullYear() === currentYear) {
      institutesPerMonth[d.getMonth()]++;
      usersPerMonth[d.getMonth()] += inst.userCount || 0;
    }
  });

  // Make cumulative
  for (let i = 1; i < 12; i++) {
    institutesPerMonth[i] += institutesPerMonth[i - 1];
    usersPerMonth[i] += usersPerMonth[i - 1];
  }

  return { institutesPerMonth, usersPerMonth };
}

export default function UsersGrowthChart({ institutes }: Props) {
  const { institutesPerMonth, usersPerMonth } = buildMonthlyGrowth(institutes);

  const options: ApexOptions = {
    colors: ["#465FFF", "#10b981"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "area",
      height: 200,
      toolbar: { show: false },
      sparkline: { enabled: false },
    },
    stroke: { curve: "smooth", width: [2, 2] },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.4, opacityTo: 0.05 },
    },
    markers: { size: 0, hover: { size: 5 } },
    legend: { show: true, position: "top", horizontalAlign: "left", fontFamily: "Outfit" },
    dataLabels: { enabled: false },
    xaxis: {
      categories: MONTHS,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "11px", colors: Array(12).fill("#9CA3AF") } },
    },
    yaxis: {
      labels: {
        style: { fontSize: "11px", colors: ["#9CA3AF"] },
        formatter: (v) => Math.floor(v).toString(),
      },
      min: 0,
    },
    grid: { yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
    tooltip: { x: { show: true } },
  };

  const series = [
    { name: "Institutes", data: institutesPerMonth },
    { name: "Users", data: usersPerMonth },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pt-5 pb-3 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Growth Over Time</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Cumulative institutes & users this year</p>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[500px] xl:min-w-full">
          <ReactApexChart options={options} series={series} type="area" height={200} />
        </div>
      </div>
    </div>
  );
}
