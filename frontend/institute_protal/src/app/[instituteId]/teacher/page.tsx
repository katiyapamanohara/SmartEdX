"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { instituteService } from "@/services/instituteService";
import { authService } from "@/services/authService";
import { GroupIcon, BoxIconLine, ArrowUpIcon } from "@/icons";
import TeacherFloatingAiChat from "@/components/teacher/TeacherFloatingAiChat";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardMetrics {
  studentCount: number;
  courseCount: number;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeacherDashboard() {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    studentCount: 0,
    courseCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!instituteId) return;
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const user = authService.getUser();
        const teacherId = user?.id;

        const [students, allCourses] = await Promise.all([
          instituteService.getInstituteUsers(instituteId, "student"),
          instituteService.getCourses(instituteId),
        ]);

        // Only count courses assigned to the logged-in teacher
        const assignedCourses = allCourses.filter(
          (c) => c.assignedTeacher?.id === teacherId
        );

        setMetrics({
          studentCount: students.length,
          courseCount: assignedCourses.length,
        });
      } catch (e) {
        console.error("TeacherDashboard: failed to fetch metrics", e);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [instituteId]);

  // ── Chart configs ──────────────────────────────────────────────────────────

  const barOptions: ApexOptions = {
    colors: ["#465fff"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 180,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "39%",
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 4, colors: ["transparent"] },
    xaxis: {
      categories: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    legend: { show: true, position: "top", horizontalAlign: "left", fontFamily: "Outfit" },
    yaxis: { title: { text: undefined } },
    grid: { yaxis: { lines: { show: true } } },
    fill: { opacity: 1 },
    tooltip: { x: { show: false }, y: { formatter: (v: number) => `${v}` } },
  };

  const barSeries = [
    { name: "Students", data: [168, 385, 201, 298, 187, 195, 291, 110, 215, 390, 280, 112] },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
    <div className="grid grid-cols-12 gap-4 md:gap-6">

      {/* ── Metric Cards ── */}
      <div className="col-span-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">

          {/* Total Students */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
              <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />
            </div>
            <div className="flex items-end justify-between mt-5">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Students</span>
                <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                  {loading ? (
                    <span className="animate-pulse text-gray-300">---</span>
                  ) : (
                    metrics.studentCount.toLocaleString()
                  )}
                </h4>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-1 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
                <ArrowUpIcon className="w-3 h-3" /> Live
              </span>
            </div>
          </div>

          {/* Total Courses Assigned */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
              <BoxIconLine className="text-gray-800 dark:text-white/90" />
            </div>
            <div className="flex items-end justify-between mt-5">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Courses Assigned</span>
                <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                  {loading ? (
                    <span className="animate-pulse text-gray-300">---</span>
                  ) : (
                    metrics.courseCount.toLocaleString()
                  )}
                </h4>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-1 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
                <ArrowUpIcon className="w-3 h-3" /> Live
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ── Bar Chart ── */}
      <div className="col-span-12">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Monthly Student Enrollment
            </h3>
          </div>
          <div className="max-w-full overflow-x-auto custom-scrollbar">
            <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
              <ReactApexChart options={barOptions} series={barSeries} type="bar" height={180} />
            </div>
          </div>
        </div>
      </div>

    </div>
      <TeacherFloatingAiChat instituteId={instituteId} />
    </>
  );
}

