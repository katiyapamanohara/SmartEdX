"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { instituteService } from "@/services/instituteService";
import { authService } from "@/services/authService";
import { BoxIconLine, ArrowUpIcon, TaskIcon, VideoIcon } from "@/icons";
import StudentFloatingAiChat from "@/components/student/StudentFloatingAiChat";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface DashboardMetrics {
  courseCount: number;
  assignmentCount: number;
}

export default function StudentDashboard() {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    courseCount: 0,
    assignmentCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!instituteId) return;
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const allCourses = await instituteService.getCourses(instituteId);
        setMetrics({
          courseCount: allCourses.length,
          assignmentCount: 0,
        });
      } catch (e) {
        console.error("StudentDashboard: failed to fetch metrics", e);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [instituteId]);

  const areaOptions: ApexOptions = {
    colors: ["#465fff"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "area",
      height: 180,
      toolbar: { show: false },
    },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { title: { text: undefined } },
    grid: { yaxis: { lines: { show: true } } },
    fill: { type: "gradient", gradient: { opacityFrom: 0.4, opacityTo: 0 } },
    tooltip: { x: { show: false } },
  };

  const areaSeries = [
    { name: "Progress (%)", data: [30, 45, 55, 60, 70, 65, 80, 75, 85, 90, 88, 95] },
  ];

  return (
    <>
    <div className="grid grid-cols-12 gap-4 md:gap-6">

      {/* Welcome Banner */}
      <div className="col-span-12 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-600 p-6 text-white">
        <h2 className="text-xl font-bold">Welcome back! 👋</h2>
        <p className="text-sm text-white/80 mt-1">Here&apos;s an overview of your learning progress.</p>
      </div>

      {/* Metric Cards */}
      <div className="col-span-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">

          {/* Enrolled Courses */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
              <BoxIconLine className="text-gray-800 dark:text-white/90" />
            </div>
            <div className="flex items-end justify-between mt-5">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Enrolled Courses</span>
                <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                  {loading ? <span className="animate-pulse text-gray-300">---</span> : metrics.courseCount.toLocaleString()}
                </h4>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-1 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
                <ArrowUpIcon className="w-3 h-3" /> Active
              </span>
            </div>
          </div>

          {/* Assignments Pending */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
              <TaskIcon className="w-6 h-6 text-gray-800 dark:text-white/90" />
            </div>
            <div className="flex items-end justify-between mt-5">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Pending Assignments</span>
                <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                  {loading ? <span className="animate-pulse text-gray-300">---</span> : "—"}
                </h4>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2 py-1 text-xs font-medium text-warning-600 dark:bg-warning-500/15 dark:text-warning-500">
                Pending
              </span>
            </div>
          </div>

          {/* Live Classes Today */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
              <VideoIcon className="w-6 h-6 text-gray-800 dark:text-white/90" />
            </div>
            <div className="flex items-end justify-between mt-5">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Live Classes Today</span>
                <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">—</h4>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                Scheduled
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Progress Chart */}
      <div className="col-span-12">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Learning Progress (%)
            </h3>
          </div>
          <div className="max-w-full overflow-x-auto custom-scrollbar">
            <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
              <ReactApexChart options={areaOptions} series={areaSeries} type="area" height={180} />
            </div>
          </div>
        </div>
      </div>

    </div>
      <StudentFloatingAiChat instituteId={instituteId} />
    </>
  );
}
