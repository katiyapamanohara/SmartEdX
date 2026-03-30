"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { instituteService, Course } from "@/services/instituteService";
import { authService } from "@/services/authService";
import { GroupIcon, BoxIconLine, ArrowUpIcon, TaskIcon } from "@/icons";
import { FiMic, FiBookOpen, FiAward } from "react-icons/fi";
import TeacherFloatingAiChat from "@/components/teacher/TeacherFloatingAiChat";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface DashboardMetrics {
  studentCount: number;
  courseCount: number;
  assessmentCount: number;
  newStudentsThisMonth: number;
}

export default function TeacherDashboard() {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    studentCount: 0,
    courseCount: 0,
    assessmentCount: 0,
    newStudentsThisMonth: 0,
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollmentData, setEnrollmentData] = useState<number[]>(Array(12).fill(0));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!instituteId) return;

    (async () => {
      setLoading(true);
      try {
        const user = authService.getUser();
        const teacherId = user?.id;

        const [students, allCourses, assessmentGroups, enrollment] = await Promise.all([
          instituteService.getInstituteUsers(instituteId, "student"),
          instituteService.getMyTeacherCourses(instituteId),
          instituteService.getMyTeacherAssessments(instituteId),
          instituteService.getMonthlyStudentEnrollment(instituteId),
        ]);

        const assignedCourses = teacherId
          ? allCourses.filter((c) => c.assignedTeacher?.id === teacherId)
          : allCourses;

        const assessmentCount = (assessmentGroups as any[]).reduce(
          (sum: number, g: any) => sum + (g.quizzes?.length ?? 0),
          0,
        );

        const currentMonth = new Date().getMonth(); // 0-indexed
        const newStudentsThisMonth = enrollment[currentMonth] ?? 0;

        setMetrics({
          studentCount: students.length,
          courseCount: assignedCourses.length,
          assessmentCount,
          newStudentsThisMonth,
        });
        setCourses(assignedCourses.slice(0, 6));
        setEnrollmentData(enrollment);
      } catch (e) {
        console.error("TeacherDashboard: failed to fetch data", e);
      } finally {
        setLoading(false);
      }
    })();
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

  const barSeries = [{ name: "New Students", data: enrollmentData }];

  // ── Metric card helper ─────────────────────────────────────────────────────

  const MetricCard = ({
    icon,
    label,
    value,
    badge,
    iconBg = "bg-gray-100 dark:bg-gray-800",
  }: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    badge?: React.ReactNode;
    iconBg?: string;
  }) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 md:p-6">
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div className="flex items-end justify-between mt-5">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {loading ? <span className="animate-pulse text-gray-300">---</span> : value}
          </h4>
        </div>
        {badge}
      </div>
    </div>
  );

  const LiveBadge = () => (
    <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-1 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
      <ArrowUpIcon className="w-3 h-3" /> Live
    </span>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="grid grid-cols-12 gap-4 md:gap-6">

        {/* ── Metric Cards ── */}
        <div className="col-span-12">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:gap-6">
            <MetricCard
              icon={<GroupIcon className="text-gray-800 size-6 dark:text-white/90" />}
              label="Total Students"
              value={metrics.studentCount.toLocaleString()}
              badge={<LiveBadge />}
            />
            <MetricCard
              icon={<BoxIconLine className="text-gray-800 dark:text-white/90" />}
              label="My Courses"
              value={metrics.courseCount.toLocaleString()}
              badge={<LiveBadge />}
            />
            <MetricCard
              icon={<FiAward className="text-gray-800 size-5 dark:text-white/90" />}
              label="Assessments"
              value={metrics.assessmentCount.toLocaleString()}
              badge={<LiveBadge />}
            />
            <MetricCard
              icon={<ArrowUpIcon className="text-gray-800 size-5 dark:text-white/90" />}
              label="New Students (This Month)"
              value={metrics.newStudentsThisMonth.toLocaleString()}
              badge={<LiveBadge />}
            />
          </div>
        </div>

        {/* ── Bar Chart ── */}
        <div className="col-span-12 xl:col-span-8">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/3 sm:px-6 sm:pt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Monthly Student Enrollment
              </h3>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {new Date().getFullYear()}
              </span>
            </div>
            <div className="max-w-full overflow-x-auto custom-scrollbar">
              <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
                <ReactApexChart options={barOptions} series={barSeries} type="bar" height={180} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Stats ── */}
        <div className="col-span-12 xl:col-span-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 h-full">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">Summary</h3>
            <div className="space-y-4">
              {[
                { icon: <GroupIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />, label: "Total Students", value: metrics.studentCount, bg: "bg-blue-50 dark:bg-blue-500/10" },
                { icon: <FiBookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />, label: "Courses Assigned", value: metrics.courseCount, bg: "bg-purple-50 dark:bg-purple-500/10" },
                { icon: <TaskIcon className="w-4 h-4 text-green-600 dark:text-green-400" />, label: "Total Assessments", value: metrics.assessmentCount, bg: "bg-green-50 dark:bg-green-500/10" },
                { icon: <FiMic className="w-4 h-4 text-amber-600 dark:text-amber-400" />, label: "Enrolled This Month", value: metrics.newStudentsThisMonth, bg: "bg-amber-50 dark:bg-amber-500/10" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-800 dark:text-white">
                    {loading ? "—" : s.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Courses Table ── */}
        <div className="col-span-12">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">My Courses</h3>
              <Link
                href={`/${instituteId}/teacher/courses`}
                className="text-xs text-brand-500 hover:underline font-medium"
              >
                View all
              </Link>
            </div>

            {loading ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                    <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/5 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="h-2.5 w-1/4 bg-gray-100 dark:bg-gray-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : courses.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">No courses assigned yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {courses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/${instituteId}/teacher/courses/${course.id}/modules`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    {course.coverImage ? (
                      <img
                        src={course.coverImage}
                        alt={course.name}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-linear-to-br from-violet-500 to-blue-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                        {course.name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {course.code}
                        {course.batchNumber ? ` · Batch ${course.batchNumber}` : ""}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                      View →
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      <TeacherFloatingAiChat instituteId={instituteId} />
    </>
  );
}
