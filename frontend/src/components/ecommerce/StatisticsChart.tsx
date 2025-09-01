"use client";
import React, { useState } from "react";
import { ApexOptions } from "apexcharts";
import ChartTab from "../common/ChartTab";
import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

const dailySeries = [
  { name: "Sales", data: [30, 40, 35, 50, 49, 60, 70] },      // 7 days in a week
  { name: "Revenue", data: [10, 15, 12, 18, 17, 20, 22] },
];
const dailyCategories = [
  "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
];

const weeklySeries = [
  { name: "Sales", data: [200, 220, 210, 230] },              // 4 weeks in a month
  { name: "Revenue", data: [80, 90, 85, 95] },
];
const weeklyCategories = [
  "Week 1", "Week 2", "Week 3", "Week 4"
];

const monthlySeries = [
  { name: "Sales", data: [180, 190, 170, 160, 175, 165, 170, 205, 230, 210, 240, 235] }, // 12 months
  { name: "Revenue", data: [40, 30, 50, 40, 55, 40, 70, 100, 110, 120, 150, 140] },
];
const monthlyCategories = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export default function StatisticsChart() {
  const [selected, setSelected] = useState<"optionOne" | "optionTwo" | "optionThree">("optionOne");

  let series = monthlySeries;
  let categories = monthlyCategories;

  if (selected === "optionTwo") {
    series = weeklySeries;
    categories = weeklyCategories;
  } else if (selected === "optionThree") {
    series = dailySeries;
    categories = dailyCategories;
  }

  const options: ApexOptions = {
    legend: { show: false, position: "top", horizontalAlign: "left" },
    colors: ["#465FFF", "#9CB9FF"],
    chart: { fontFamily: "Outfit, sans-serif", height: 310, type: "area", toolbar: { show: false } },
    stroke: { curve: "straight", width: [2, 2] },
    fill: { type: "gradient", gradient: { opacityFrom: 0.55, opacityTo: 0 } },
    markers: { size: 0, strokeColors: "#fff", strokeWidth: 2, hover: { size: 6 } },
    grid: {
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    dataLabels: { enabled: false },
    tooltip: { enabled: true, x: { format: "dd MMM yyyy" } },
    xaxis: {
      type: "category",
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      labels: { style: { fontSize: "12px", colors: ["#6B7280"] } },
      title: { text: "", style: { fontSize: "0px" } },
    },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Token Usage
          </h3>
        </div>
        <div className="flex items-start w-full gap-3 sm:justify-end">
          <ChartTab selected={selected} setSelected={setSelected} />
        </div>
      </div>
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[1000px] xl:min-w-full">
          <ReactApexChart
            options={options}
            series={series}
            type="area"
            height={310}
          />
        </div>
      </div>
    </div>
  );
}