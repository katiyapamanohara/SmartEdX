"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { instituteService, Course, StudentAssessmentGroup } from "@/services/instituteService";
import { authService } from "@/services/authService";
import { useFeatures } from "@/context/InstituteFeatureContext";
import { BoxIconLine, ArrowUpIcon, TaskIcon } from "@/icons";
import { FiMic, FiCheckCircle, FiClock, FiBookOpen } from "react-icons/fi";
import VoiceAssessmentPlayer from "@/components/student/VoiceAssessmentPlayer";
import CourseVoiceAssistant from "@/components/student/CourseVoiceAssistant";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function StudentDashboard() {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const [courses, setCourses] = useState<Course[]>([]);
  const [assessmentGroups, setAssessmentGroups] = useState<StudentAssessmentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [voicePlayerOpen, setVoicePlayerOpen] = useState(false);
  const [courseAssistantOpen, setCourseAssistantOpen] = useState(false);

  const { hasFeature } = useFeatures();

  const [user, setUser] = useState<ReturnType<typeof authService.getUser>>(null);
  const userId = user?.id ?? null;
  const firstName = user?.firstName ?? "";

  useEffect(() => {
    setUser(authService.getUser());
  }, []);

  useEffect(() => {
    if (!instituteId) return;
    (async () => {
      setLoading(true);
      try {
        const [enrolledCourses, groups] = await Promise.all([
          instituteService.getMyEnrolledCourses(instituteId),
          instituteService.getMyStudentAssessments(instituteId),
        ]);
        setCourses(enrolledCourses);
        setAssessmentGroups(groups);
      } catch (e) {
        console.error("StudentDashboard:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [instituteId]);

  // ── Derived metrics ───────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const allQuizzes = assessmentGroups.flatMap((g) => g.quizzes);
    const total = allQuizzes.length;
    const completed = userId
      ? allQuizzes.filter((q) => (q.content.studentAttempts ?? {})[userId]).length
      : 0;
    const pending = total - completed;
    return { courseCount: courses.length, total, completed, pending };
  }, [courses, assessmentGroups, userId]);

  // ── Donut chart: assessments by status ───────────────────────────────────

  const donutOptions: ApexOptions = {
    chart: { type: "donut", fontFamily: "Outfit, sans-serif" },
    labels: ["Completed", "Pending"],
    colors: ["#22c55e", "#f59e0b"],
    legend: { position: "bottom", fontFamily: "Outfit" },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: "70%" } } },
    tooltip: { y: { formatter: (v) => `${v}` } },
  };
  const donutSeries = [metrics.completed, metrics.pending];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="grid grid-cols-12 gap-4 md:gap-6">

        {/* ── Welcome Banner ── */}
        <div className="col-span-12 rounded-2xl bg-linear-to-r from-brand-500 to-indigo-600 p-6 text-white flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Welcome back{firstName ? `, ${firstName}` : ""}! 👋</h2>
            <p className="text-sm text-white/80 mt-1">
              {loading
                ? "Loading your progress…"
                : `You have ${metrics.pending} pending assessment${metrics.pending !== 1 ? "s" : ""} across ${metrics.courseCount} course${metrics.courseCount !== 1 ? "s" : ""}.`}
            </p>
          </div>
          {hasFeature("ai_tutor") && (
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/${instituteId}/student/ai-chat`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition-colors backdrop-blur-sm border border-white/25"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              </svg>
              Ask AI Tutor
            </Link>
          </div>
          )}
        </div>

        {/* ── Metric Cards ── */}
        <div className="col-span-12">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:gap-6">

            {/* Enrolled Courses */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 md:p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl dark:bg-blue-500/10">
                <BoxIconLine className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex items-end justify-between mt-5">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Enrolled Courses</span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    {loading ? <span className="animate-pulse text-gray-300">—</span> : metrics.courseCount}
                  </h4>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-1 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
                  <ArrowUpIcon className="w-3 h-3" /> Active
                </span>
              </div>
            </div>

            {/* Total Assessments */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 md:p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-50 rounded-xl dark:bg-purple-500/10">
                <TaskIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex items-end justify-between mt-5">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total Assessments</span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    {loading ? <span className="animate-pulse text-gray-300">—</span> : metrics.total}
                  </h4>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-600 dark:bg-purple-500/15 dark:text-purple-400">
                  Assigned
                </span>
              </div>
            </div>

            {/* Completed */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 md:p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-xl dark:bg-green-500/10">
                <FiCheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex items-end justify-between mt-5">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Completed</span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    {loading ? <span className="animate-pulse text-gray-300">—</span> : metrics.completed}
                  </h4>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-600 dark:bg-green-500/15 dark:text-green-400">
                  Done
                </span>
              </div>
            </div>

            {/* Pending */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 md:p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-amber-50 rounded-xl dark:bg-amber-500/10">
                <FiClock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex items-end justify-between mt-5">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Pending</span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    {loading ? <span className="animate-pulse text-gray-300">—</span> : metrics.pending}
                  </h4>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                  Todo
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ── Donut chart + Recent Assessments ── */}
        <div className="col-span-12 xl:col-span-4">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 p-5 h-full flex flex-col">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">
              Assessment Progress
            </h3>
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
              </div>
            ) : metrics.total === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                No assessments yet.
              </div>
            ) : (
              <ReactApexChart
                options={donutOptions}
                series={donutSeries}
                type="donut"
                height={220}
              />
            )}
          </div>
        </div>

        {/* ── Recent assessments list ── */}
        <div className="col-span-12 xl:col-span-8">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 overflow-hidden h-full flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                Recent Assessments
              </h3>
              <Link
                href={`/${instituteId}/student/assignments`}
                className="text-xs text-brand-500 hover:underline font-medium"
              >
                View all
              </Link>
            </div>

            {loading ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-5 py-4 flex items-center gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/5 bg-gray-200 dark:bg-gray-700 rounded" />
                      <div className="h-2.5 w-1/4 bg-gray-100 dark:bg-gray-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : assessmentGroups.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-12 text-sm text-gray-400">
                No assessments assigned yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800 overflow-y-auto">
                {assessmentGroups.flatMap((g) =>
                  g.quizzes.slice(0, 3).map(({ content }) => {
                    const attempted = userId && (content.studentAttempts ?? {})[userId];
                    const score = attempted ? (content.studentAttempts![userId].score ?? 0) : null;
                    const passing = content.quizData?.passingScore ?? 70;
                    const isVoice = (content.quizData as any)?.assessmentType === "voice";
                    return (
                      <div key={content.id} className="flex items-center gap-3 px-5 py-3.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isVoice
                            ? "bg-purple-50 dark:bg-purple-500/10"
                            : "bg-blue-50 dark:bg-blue-500/10"
                        }`}>
                          {isVoice
                            ? <FiMic className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            : <TaskIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                            {content.title}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {g.course.name}
                          </p>
                        </div>
                        {attempted ? (
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${
                            score! >= passing
                              ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                          }`}>
                            {score}%
                          </span>
                        ) : (
                          <Link
                            href={`/${instituteId}/student/assignments`}
                            className="text-xs font-medium text-brand-500 hover:underline shrink-0"
                          >
                            Start →
                          </Link>
                        )}
                      </div>
                    );
                  })
                ).slice(0, 6)}
              </div>
            )}
          </div>
        </div>

        {/* ── Enrolled Courses ── */}
        <div className="col-span-12">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                My Courses
              </h3>
              <Link
                href={`/${instituteId}/student/my-courses`}
                className="text-xs text-brand-500 hover:underline font-medium"
              >
                View all
              </Link>
            </div>

            {loading ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {Array.from({ length: 3 }).map((_, i) => (
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
              <div className="py-12 text-center text-sm text-gray-400">
                You are not enrolled in any courses yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 divide-y divide-gray-100 dark:divide-gray-800 sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-3">
                {courses.slice(0, 6).map((course) => (
                  <Link
                    key={course.id}
                    href={`/${instituteId}/student/my-courses/${course.id}/modules`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors border-b border-gray-100 dark:border-gray-800"
                  >
                    {course.coverImage ? (
                      <img
                        src={course.coverImage}
                        alt={course.name}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-linear-to-br from-violet-500 to-blue-400 shrink-0 flex items-center justify-center">
                        <FiBookOpen className="w-4 h-4 text-white" />
                      </div>
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
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">→</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    
     
    </>
  );
}
