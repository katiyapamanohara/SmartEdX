"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { instituteService } from "@/services/instituteService";
import { PieChartIcon } from "@/icons";

// ─── Types ───────────────────────────────────────────────────────────────────

type Teacher = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
  designation?: string;
  department?: string;
  isActive?: boolean;
};

type TeacherStat = {
  teacher: Teacher;
  courseCount: number;
  examCount: number;
  totalSubmissions: number;
  avgScore: number | null;
  avgPassRate: number | null;
  weakAreaCount: number;
  pendingEssays: number;
};

type WeakArea = {
  id: string;
  examTitle: string;
  courseName: string;
  questionText: string;
  questionType: string;
  failRate: number;
  failCount: number;
  totalAttempts: number;
  avgScore?: number;
  isPendingEssay?: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Avatar({ teacher }: { teacher: Teacher }) {
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
      {teacher.profilePicture ? (
        <Image
          src={teacher.profilePicture}
          alt={`${teacher.firstName} ${teacher.lastName}`}
          width={36}
          height={36}
          className="object-cover w-full h-full"
          unoptimized
        />
      ) : (
        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
          {teacher.firstName?.charAt(0).toUpperCase()}
          {teacher.lastName?.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function ScoreBadge({ value, type = "score" }: { value: number | null; type?: "score" | "pass" }) {
  if (value === null) return <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>;
  const color =
    value >= 70
      ? "text-green-600 dark:text-green-400"
      : value >= 50
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";
  return <span className={`text-sm font-semibold ${color}`}>{value}%</span>;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InstitutePerformancePage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherStats, setTeacherStats] = useState<TeacherStat[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "detail">("overview");

  // Detail drill-down state
  const [detailExams, setDetailExams] = useState<any[]>([]);
  const [detailWeakAreas, setDetailWeakAreas] = useState<WeakArea[]>([]);
  const [detailCourses, setDetailCourses] = useState<string[]>([]);

  useEffect(() => {
    if (!instituteId) return;
    (async () => {
      setLoading(true);
      try {
        const [teacherList, allCourses, allExams] = await Promise.all([
          instituteService.getInstituteUsers(instituteId, "teacher"),
          instituteService.getCourses(instituteId),
          instituteService.getAllInstituteExams(instituteId),
        ]);

        const teachersById = new Map<string, Teacher>(
          (teacherList as Teacher[]).map((t) => [t.id, t])
        );

        // Build per-teacher stats
        const statsMap = new Map<string, TeacherStat>();

        for (const t of teacherList as Teacher[]) {
          statsMap.set(t.id, {
            teacher: t,
            courseCount: 0,
            examCount: 0,
            totalSubmissions: 0,
            avgScore: null,
            avgPassRate: null,
            weakAreaCount: 0,
            pendingEssays: 0,
          });
        }

        // ── Map courses → teacher ──────────────────────────────────────────────
        for (const c of allCourses as any[]) {
          const tid = c.assignedTeacher?.id;
          if (!tid || !statsMap.has(tid)) continue;
          const s = statsMap.get(tid)!;
          s.courseCount += 1;
          statsMap.set(tid, s);
        }

        // ── Process exams → teacher ────────────────────────────────────────────
        const weakAreasByTeacher = new Map<string, WeakArea[]>();

        for (const exam of allExams as any[]) {
          const tid = exam.createdByUserId;
          if (!tid || !statsMap.has(tid)) continue;
          const s = statsMap.get(tid)!;
          s.examCount += 1;

          const attempts: Record<string, any> = exam.studentAttempts ?? {};
          const attemptList = Object.values(attempts) as any[];

          if (attemptList.length > 0) {
            const scores = attemptList
              .filter((a: any) => a?.totalMarks > 0)
              .map((a: any) => Math.round((a.score / a.totalMarks) * 100));
            const passCount = attemptList.filter((a: any) => a?.passed).length;

            s.totalSubmissions += attemptList.length;

            const examAvg = scores.length
              ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
              : null;
            const passRate =
              attemptList.length > 0
                ? Math.round((passCount / attemptList.length) * 100)
                : null;

            if (examAvg !== null) {
              s.avgScore =
                s.avgScore === null ? examAvg : Math.round((s.avgScore + examAvg) / 2);
            }
            if (passRate !== null) {
              s.avgPassRate =
                s.avgPassRate === null ? passRate : Math.round((s.avgPassRate + passRate) / 2);
            }
          }

          // Compute weak areas per exam
          if (!weakAreasByTeacher.has(tid)) weakAreasByTeacher.set(tid, []);
          const weakAreas = weakAreasByTeacher.get(tid)!;

          for (const q of exam.questions ?? []) {
            const qType: string = q.type ?? "mcq";
            if (qType === "mcq") {
              if (q.correctAnswer === undefined) continue;
              const correct = Number(q.correctAnswer);
              const failed = (Object.values(attempts) as any[]).filter((a) => {
                const ans = a.answers?.[q.id];
                if (ans === undefined || ans === null || ans === "") return true;
                return Number(ans) !== correct;
              });
              if (failed.length === 0) continue;
              const failRate = Math.round((failed.length / Math.max(Object.values(attempts).length, 1)) * 100);
              if (failRate < 30) continue;
              weakAreas.push({
                id: `exam-${exam.id}-${q.id}`,
                examTitle: exam.title,
                courseName: exam.courseName ?? "—",
                questionText: q.question,
                questionType: "mcq",
                failRate,
                failCount: failed.length,
                totalAttempts: Object.values(attempts).length,
              });
            } else if (qType === "short_answer") {
              const attemptList2 = Object.values(attempts) as any[];
              const graded = attemptList2.filter((a) => a.essayGrades?.[q.id] !== undefined);
              if (graded.length === 0) continue;
              const avgPct = Math.round(
                graded.reduce((sum: number, a: any) => {
                  const g = a.essayGrades[q.id];
                  return sum + Math.round((g.score / (q.marks || 1)) * 100);
                }, 0) / graded.length
              );
              if (avgPct >= 60) continue;
              const failCount = graded.filter(
                (a: any) => Math.round((a.essayGrades[q.id].score / (q.marks || 1)) * 100) < 60
              ).length;
              const failRate = Math.round((failCount / graded.length) * 100);
              if (failRate < 30) continue;
              weakAreas.push({
                id: `exam-${exam.id}-${q.id}`,
                examTitle: exam.title,
                courseName: exam.courseName ?? "—",
                questionText: q.question,
                questionType: "short_answer",
                failRate,
                failCount,
                totalAttempts: graded.length,
                avgScore: avgPct,
              });
            } else if (qType === "essay") {
              const attemptList3 = Object.values(attempts) as any[];
              const pendingCount = attemptList3.filter(
                (a) => a.answers?.[q.id] !== undefined && a.answers[q.id] !== "" && !a.essayGrades?.[q.id]
              ).length;
              if (pendingCount === 0) continue;
              weakAreas.push({
                id: `exam-${exam.id}-${q.id}`,
                examTitle: exam.title,
                courseName: exam.courseName ?? "—",
                questionText: q.question,
                questionType: "short_answer",
                failRate: Math.round((pendingCount / Math.max(attemptList3.length, 1)) * 100),
                failCount: pendingCount,
                totalAttempts: attemptList3.length,
                isPendingEssay: true,
              });
              s.pendingEssays += pendingCount;
            }
          }

          statsMap.set(tid, s);
        }

        // Store weak area counts
        for (const [tid, areas] of weakAreasByTeacher.entries()) {
          const s = statsMap.get(tid);
          if (s) {
            s.weakAreaCount = areas.filter((a) => !a.isPendingEssay).length;
            statsMap.set(tid, s);
          }
        }

        const sortedStats = Array.from(statsMap.values()).sort(
          (a, b) => b.totalSubmissions - a.totalSubmissions
        );

        setTeachers(teacherList as Teacher[]);
        setTeacherStats(sortedStats);

        // Cache weak areas globally for drill-down
        (window as any).__instituteWeakAreas = weakAreasByTeacher;
        (window as any).__instituteCoursesByTeacher = (() => {
          const m = new Map<string, string[]>();
          for (const c of allCourses as any[]) {
            const tid = c.assignedTeacher?.id;
            if (!tid) continue;
            if (!m.has(tid)) m.set(tid, []);
            m.get(tid)!.push(c.name);
          }
          return m;
        })();
        (window as any).__instituteExamsByTeacher = (() => {
          const m = new Map<string, any[]>();
          for (const e of allExams as any[]) {
            const tid = e.createdByUserId;
            if (!tid) continue;
            if (!m.has(tid)) m.set(tid, []);
            m.get(tid)!.push(e);
          }
          return m;
        })();
      } finally {
        setLoading(false);
      }
    })();
  }, [instituteId]);

  // ── Open teacher detail ──────────────────────────────────────────────────────

  const openTeacherDetail = (teacherId: string) => {
    const weakMap: Map<string, WeakArea[]> = (window as any).__instituteWeakAreas ?? new Map();
    const courseMap: Map<string, string[]> = (window as any).__instituteCoursesByTeacher ?? new Map();
    const examMap: Map<string, any[]> = (window as any).__instituteExamsByTeacher ?? new Map();

    const areas = weakMap.get(teacherId) ?? [];
    areas.sort((a, b) => b.failRate - a.failRate);

    setDetailWeakAreas(areas);
    setDetailCourses(courseMap.get(teacherId) ?? []);
    setDetailExams(examMap.get(teacherId) ?? []);
    setSelectedTeacherId(teacherId);
    setActiveTab("detail");
  };

  const selectedStat = teacherStats.find((s) => s.teacher.id === selectedTeacherId) ?? null;

  // ── Summary totals ──────────────────────────────────────────────────────────
  const totalTeachers = teacherStats.length;
  const totalExams = teacherStats.reduce((s, t) => s + t.examCount, 0);
  const totalSubmissions = teacherStats.reduce((s, t) => s + t.totalSubmissions, 0);
  const avgPassAll =
    teacherStats.filter((t) => t.avgPassRate !== null).length > 0
      ? Math.round(
          teacherStats
            .filter((t) => t.avgPassRate !== null)
            .reduce((s, t) => s + (t.avgPassRate ?? 0), 0) /
            teacherStats.filter((t) => t.avgPassRate !== null).length
        )
      : null;

  const EXAM_STATUS_COLORS: Record<string, string> = {
    completed: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
    active: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
    scheduled: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    draft: "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400",
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Teacher Performance</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Institute-wide overview of all teacher activity, exam results, and class weak areas
        </p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Teachers", value: loading ? "—" : totalTeachers.toString() },
          { label: "Total Exams", value: loading ? "—" : totalExams.toString() },
          { label: "Total Submissions", value: loading ? "—" : totalSubmissions.toString() },
          {
            label: "Avg Pass Rate",
            value: loading ? "—" : avgPassAll !== null ? `${avgPassAll}%` : "—",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-5"
          >
            <span className="text-sm text-gray-500 dark:text-gray-400">{s.label}</span>
            <p className="text-2xl font-bold mt-1 text-gray-800 dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "overview"
              ? "text-brand-600 dark:text-brand-400 border-b-2 border-brand-500"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          All Teachers
        </button>
        {selectedStat && (
          <div
            className={`flex items-center gap-1 rounded-t-lg transition-colors ${
              activeTab === "detail"
                ? "border-b-2 border-brand-500"
                : ""
            }`}
          >
            {/* Clickable tab label */}
            <button
              type="button"
              onClick={() => setActiveTab("detail")}
              className={`pl-4 pr-2 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors ${
                activeTab === "detail"
                  ? "text-brand-600 dark:text-brand-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Avatar teacher={selectedStat.teacher} />
              {selectedStat.teacher.firstName} {selectedStat.teacher.lastName}
            </button>
            {/* Close — sibling, NOT nested inside the tab button */}
            <button
              type="button"
              aria-label="Close teacher tab"
              onClick={() => {
                setSelectedTeacherId(null);
                setActiveTab("overview");
              }}
              className="pr-3 py-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-white">Teachers Performance Overview</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Click a row to drill into a teacher&rsquo;s detailed performance
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/2 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Teacher</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Courses</th>
                  <th className="px-5 py-3 text-left font-medium">Exams</th>
                  <th className="px-5 py-3 text-left font-medium">Submissions</th>
                  <th className="px-5 py-3 text-left font-medium">Avg Score</th>
                  <th className="px-5 py-3 text-left font-medium">Avg Pass Rate</th>
                  <th className="px-5 py-3 text-left font-medium">Weak Areas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : teacherStats.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <PieChartIcon className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-400 dark:text-gray-500 text-sm">
                          No teachers found. Add lecture staff from User Management.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  teacherStats.map((s) => (
                    <tr
                      key={s.teacher.id}
                      onClick={() => openTeacherDetail(s.teacher.id)}
                      className="hover:bg-gray-50 dark:hover:bg-white/2 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar teacher={s.teacher} />
                          <div>
                            <p className="font-medium text-gray-800 dark:text-gray-200">
                              {s.teacher.firstName} {s.teacher.lastName}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {s.teacher.designation || s.teacher.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                            s.teacher.isActive
                              ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                              : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              s.teacher.isActive ? "bg-green-500" : "bg-gray-400"
                            }`}
                          />
                          {s.teacher.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-600 dark:text-gray-300">{s.courseCount}</td>
                      <td className="px-5 py-4 text-gray-600 dark:text-gray-300">{s.examCount}</td>
                      <td className="px-5 py-4 text-gray-600 dark:text-gray-300">{s.totalSubmissions}</td>
                      <td className="px-5 py-4">
                        <ScoreBadge value={s.avgScore} />
                      </td>
                      <td className="px-5 py-4">
                        <ScoreBadge value={s.avgPassRate} type="pass" />
                      </td>
                      <td className="px-5 py-4">
                        {s.weakAreaCount > 0 ? (
                          <span className="text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 px-2 py-0.5 rounded-full">
                            {s.weakAreaCount}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Detail Tab ───────────────────────────────────────────────────────── */}
      {activeTab === "detail" && selectedStat && (
        <div className="flex flex-col gap-6">
          {/* Teacher profile card */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
              {selectedStat.teacher.profilePicture ? (
                <Image
                  src={selectedStat.teacher.profilePicture}
                  alt={`${selectedStat.teacher.firstName} ${selectedStat.teacher.lastName}`}
                  width={64}
                  height={64}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              ) : (
                <span className="text-2xl font-bold text-gray-400 dark:text-gray-500">
                  {selectedStat.teacher.firstName?.charAt(0).toUpperCase()}
                  {selectedStat.teacher.lastName?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedStat.teacher.firstName} {selectedStat.teacher.lastName}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedStat.teacher.email}
                {selectedStat.teacher.designation ? ` · ${selectedStat.teacher.designation}` : ""}
                {selectedStat.teacher.department ? ` · ${selectedStat.teacher.department}` : ""}
              </p>
            </div>
            {/* Mini stats */}
            <div className="flex flex-wrap gap-4">
              {[
                { label: "Courses", value: selectedStat.courseCount },
                { label: "Exams", value: selectedStat.examCount },
                { label: "Submissions", value: selectedStat.totalSubmissions },
                {
                  label: "Avg Score",
                  value: selectedStat.avgScore !== null ? `${selectedStat.avgScore}%` : "—",
                },
                {
                  label: "Avg Pass Rate",
                  value: selectedStat.avgPassRate !== null ? `${selectedStat.avgPassRate}%` : "—",
                },
              ].map((s) => (
                <div key={s.label} className="text-center min-w-[60px]">
                  <p className="text-lg font-bold text-gray-800 dark:text-white">{s.value}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Courses assigned */}
          {detailCourses.length > 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 p-5">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Assigned Courses</h3>
              <div className="flex flex-wrap gap-2">
                {detailCourses.map((name, i) => (
                  <span
                    key={i}
                    className="text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-500/30"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Exam performance table */}
          {detailExams.length > 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-800 dark:text-white">Exam Performance</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Student results for each exam created by this teacher
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/2 text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium">Exam</th>
                      <th className="px-5 py-3 text-left font-medium">Course</th>
                      <th className="px-5 py-3 text-left font-medium">Submissions</th>
                      <th className="px-5 py-3 text-left font-medium">Avg Score</th>
                      <th className="px-5 py-3 text-left font-medium">Pass Rate</th>
                      <th className="px-5 py-3 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {detailExams.map((exam) => {
                      const attempts = Object.values(exam.studentAttempts ?? {}) as any[];
                      const scores = attempts
                        .filter((a) => a?.totalMarks > 0)
                        .map((a) => Math.round((a.score / a.totalMarks) * 100));
                      const passCount = attempts.filter((a) => a?.passed).length;
                      const avgScore = scores.length
                        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                        : null;
                      const passRate = attempts.length > 0
                        ? Math.round((passCount / attempts.length) * 100)
                        : null;

                      return (
                        <tr key={exam.id} className="hover:bg-gray-50 dark:hover:bg-white/2">
                          <td className="px-5 py-4 font-medium text-gray-800 dark:text-gray-200">
                            {exam.title}
                          </td>
                          <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                            {exam.courseName ?? "—"}
                          </td>
                          <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                            {attempts.length}
                          </td>
                          <td className="px-5 py-4">
                            <ScoreBadge value={avgScore} />
                          </td>
                          <td className="px-5 py-4">
                            {passRate !== null ? (
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  passRate >= 60
                                    ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                                }`}
                              >
                                {passRate}%
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">No submissions</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                                EXAM_STATUS_COLORS[exam.status] ?? ""
                              }`}
                            >
                              {exam.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Class Weak Areas for this teacher */}
          <div className="rounded-2xl border border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-500/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-red-200 dark:border-red-800/50 flex items-center gap-2">
              <span className="text-lg">📉</span>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">Class Weak Areas</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Questions where 30%+ of students struggled across this teacher&rsquo;s exams
                </p>
              </div>
            </div>

            {detailWeakAreas.length === 0 ? (
              <div className="px-5 py-10 flex flex-col items-center gap-2 text-center">
                <span className="text-3xl">✅</span>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  No class-wide weak areas detected
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Will appear once 30%+ of students struggle with a question.
                </p>
              </div>
            ) : (
              <div className="p-4 flex flex-col gap-3">
                {detailWeakAreas.map((area, idx) => {
                  const failColor = area.isPendingEssay
                    ? "border-l-amber-400 dark:border-l-amber-500"
                    : area.failRate >= 70
                    ? "border-l-red-500 dark:border-l-red-400"
                    : area.failRate >= 50
                    ? "border-l-orange-500 dark:border-l-orange-400"
                    : "border-l-amber-400 dark:border-l-amber-400";

                  const barColor =
                    area.failRate >= 70 ? "bg-red-500" : area.failRate >= 50 ? "bg-orange-500" : "bg-amber-500";

                  const rateColor =
                    area.failRate >= 70
                      ? "text-red-600 dark:text-red-400"
                      : area.failRate >= 50
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-amber-600 dark:text-amber-400";

                  return (
                    <div
                      key={area.id}
                      className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 border-l-4 ${failColor} overflow-hidden`}
                    >
                      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
                        <div className="flex items-center flex-wrap gap-2 min-w-0">
                          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/15 px-2 py-0.5 rounded-full shrink-0">
                            Exam
                          </span>
                          {area.questionType !== "mcq" && area.questionType !== "voice" && (
                            <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/15 px-2 py-0.5 rounded-full shrink-0 capitalize">
                              {area.questionType.replace("_", " ")}
                            </span>
                          )}
                          {area.isPendingEssay && (
                            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 rounded-full shrink-0">
                              ⏳ Pending review
                            </span>
                          )}
                          <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                            {area.examTitle} · {area.courseName}
                          </span>
                        </div>
                        {!area.isPendingEssay ? (
                          <div className="shrink-0 text-right">
                            <p className={`text-xl font-bold leading-none ${rateColor}`}>{area.failRate}%</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                              {area.failCount}/{area.totalAttempts} students
                            </p>
                          </div>
                        ) : (
                          <div className="shrink-0 text-right">
                            <p className="text-xl font-bold leading-none text-amber-600 dark:text-amber-400">
                              {area.failCount}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                              awaiting grade
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="px-4 pb-3">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug">
                          {area.questionText}
                        </p>
                      </div>

                      {!area.isPendingEssay && (
                        <div className="px-4 pb-3 flex items-center gap-3">
                          <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${barColor} transition-all`}
                              style={{ width: `${area.failRate}%` }}
                            />
                          </div>
                          {area.avgScore !== undefined && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                              Class avg:{" "}
                              <span className="font-semibold text-gray-700 dark:text-gray-300">
                                {area.avgScore}%
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* No data at all */}
          {detailExams.length === 0 && detailCourses.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 px-6 py-10 text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <PieChartIcon className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This teacher has no courses or exams assigned yet.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
