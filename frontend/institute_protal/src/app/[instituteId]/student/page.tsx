"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { instituteService } from "@/services/instituteService";
import { BoxIconLine, ArrowUpIcon, TaskIcon, VideoIcon } from "@/icons";
import StudentFloatingAiChat from "@/components/student/StudentFloatingAiChat";
import VoiceAssessmentPlayer from "@/components/student/VoiceAssessmentPlayer";
import CourseVoiceAssistant from "@/components/student/CourseVoiceAssistant";

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
  const [voicePlayerOpen, setVoicePlayerOpen] = useState(false);
  const [courseAssistantOpen, setCourseAssistantOpen] = useState(false);

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
      <div className="col-span-12 rounded-2xl bg-linear-to-r from-brand-500 to-indigo-600 p-6 text-white flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Welcome back! 👋</h2>
          <p className="text-sm text-white/80 mt-1">Here&apos;s an overview of your learning progress.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setCourseAssistantOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition-colors backdrop-blur-sm border border-white/25"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
            Ask AI Tutor
          </button>
          <button
            onClick={() => setVoicePlayerOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition-colors backdrop-blur-sm border border-white/25"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
            Voice Assessment
          </button>
        </div>
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
      <VoiceAssessmentPlayer
        isOpen={voicePlayerOpen}
        onClose={() => setVoicePlayerOpen(false)}
      />
      <CourseVoiceAssistant
        isOpen={courseAssistantOpen}
        onClose={() => setCourseAssistantOpen(false)}
      />
    </>
  );
}
