"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PieChartIcon } from "@/icons";
import { instituteService, Course } from "@/services/instituteService";

type CourseStat = {
  id: string;
  name: string;
  quizCount: number;
  examCount: number;
  avgScore: number | null;
  submissionCount: number;
  studentCount: number;
};

type ExamStat = {
  id: string;
  title: string;
  courseName: string;
  totalMarks: number;
  submissionCount: number;
  avgScore: number | null;
  passCount: number;
  passRate: number | null;
  status: string;
};

const EXAM_STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  active: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  scheduled: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400",
};

export default function TeacherPerformancePage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const [loading, setLoading] = useState(true);
  const [courseStats, setCourseStats] = useState<CourseStat[]>([]);
  const [examStats, setExamStats] = useState<ExamStat[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [overallAvg, setOverallAvg] = useState<number | null>(null);
  const [totalSubmissions, setTotalSubmissions] = useState(0);

  useEffect(() => {
    if (!instituteId) return;
    (async () => {
      setLoading(true);
      try {
        const [assessmentGroups, exams, courses] = await Promise.all([
          instituteService.getMyTeacherAssessments(instituteId),
          instituteService.getTeacherExams(instituteId),
          instituteService.getMyTeacherCourses(instituteId),
        ]);

        // ── Build per-course stats from quizzes ──────────────────────────────
        const courseMap = new Map<string, CourseStat>();

        // Seed from courses list
        for (const c of courses as Course[]) {
          courseMap.set(c.id, {
            id: c.id,
            name: c.name,
            quizCount: 0,
            examCount: 0,
            avgScore: null,
            submissionCount: 0,
            studentCount: 0,
          });
        }

        // Accumulate quiz data
        for (const group of assessmentGroups as any[]) {
          const cid = group.course?.id;
          if (!cid) continue;
          const stat = courseMap.get(cid) ?? {
            id: cid,
            name: group.course?.name ?? "Unknown",
            quizCount: 0,
            examCount: 0,
            avgScore: null,
            submissionCount: 0,
            studentCount: 0,
          };

          const scores: number[] = [];
          for (const { content } of group.quizzes ?? []) {
            stat.quizCount += 1;
            const attempts: Record<string, any> = content.studentAttempts ?? {};
            for (const attempt of Object.values(attempts)) {
              if (attempt?.score !== undefined && attempt?.totalMarks > 0) {
                scores.push(Math.round((attempt.score / attempt.totalMarks) * 100));
                stat.submissionCount += 1;
              }
            }
          }

          if (scores.length) {
            const avg = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
            stat.avgScore = stat.avgScore === null ? avg : Math.round((stat.avgScore + avg) / 2);
          }

          courseMap.set(cid, stat);
        }

        // ── Build exam stats ─────────────────────────────────────────────────
        const eStats: ExamStat[] = [];

        for (const exam of exams as any[]) {
          const attempts: Record<string, any> = exam.studentAttempts ?? {};
          const attemptValues = Object.values(attempts);
          const scores = attemptValues
            .filter((a) => a?.totalMarks > 0)
            .map((a) => Math.round((a.score / a.totalMarks) * 100));
          const passCount = attemptValues.filter((a) => a?.passed).length;
          const submissionCount = attemptValues.length;

          const avgScore = scores.length
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : null;
          const passRate = submissionCount > 0 ? Math.round((passCount / submissionCount) * 100) : null;

          // Update course map with exam count
          const cid = exam.courseId;
          if (cid && courseMap.has(cid)) {
            const stat = courseMap.get(cid)!;
            stat.examCount += 1;
            stat.submissionCount += submissionCount;
            if (avgScore !== null) {
              stat.avgScore =
                stat.avgScore === null ? avgScore : Math.round((stat.avgScore + avgScore) / 2);
            }
            courseMap.set(cid, stat);
          }

          eStats.push({
            id: exam.id,
            title: exam.title,
            courseName: exam.courseName ?? "—",
            totalMarks: exam.totalMarks,
            submissionCount,
            avgScore,
            passCount,
            passRate,
            status: exam.status,
          });
        }

        setCourseStats(Array.from(courseMap.values()));
        setExamStats(eStats);

        // ── Summary stats ────────────────────────────────────────────────────
        const allScores: number[] = [
          ...eStats.filter((e) => e.avgScore !== null).map((e) => e.avgScore as number),
          ...Array.from(courseMap.values())
            .filter((c) => c.avgScore !== null)
            .map((c) => c.avgScore as number),
        ];

        if (allScores.length) {
          setOverallAvg(Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length));
        }

        const totalSubs = eStats.reduce((s, e) => s + e.submissionCount, 0) +
          Array.from(courseMap.values()).reduce((s, c) => s + c.submissionCount, 0);
        setTotalSubmissions(totalSubs);

        // Rough unique student count from attempts across exams
        const studentIds = new Set<string>();
        for (const exam of exams as any[]) {
          for (const sid of Object.keys(exam.studentAttempts ?? {})) studentIds.add(sid);
        }
        setTotalStudents(studentIds.size);
      } finally {
        setLoading(false);
      }
    })();
  }, [instituteId]);

  const summaryStats = [
    { label: "Class Avg Score", value: loading ? "—" : overallAvg !== null ? `${overallAvg}%` : "—" },
    { label: "Total Submissions", value: loading ? "—" : totalSubmissions.toString() },
    { label: "Exams Created", value: loading ? "—" : examStats.length.toString() },
    { label: "Students with Attempts", value: loading ? "—" : totalStudents.toString() },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Performance</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Overview of student results across your courses, assessments, and exams
        </p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {summaryStats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5"
          >
            <span className="text-sm text-gray-500 dark:text-gray-400">{s.label}</span>
            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Exam Performance Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-white">Exam Performance</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Student submission stats for each exam you created
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/[0.02] text-gray-500 dark:text-gray-400">
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
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : examStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-400 dark:text-gray-500">
                    No exams created yet.
                  </td>
                </tr>
              ) : (
                examStats.map((exam) => (
                  <tr
                    key={exam.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-4 text-gray-800 dark:text-gray-200 font-medium">
                      {exam.title}
                    </td>
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{exam.courseName}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                      {exam.submissionCount}
                    </td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                      {exam.avgScore !== null ? `${exam.avgScore}%` : "—"}
                    </td>
                    <td className="px-5 py-4">
                      {exam.passRate !== null ? (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            exam.passRate >= 60
                              ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                          }`}
                        >
                          {exam.passRate}%
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-xs">No submissions</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          EXAM_STATUS_COLORS[exam.status] ?? ""
                        }`}
                      >
                        {exam.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Course Overview Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-white">Course Overview</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Aggregated performance across assessments and exams per course
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/[0.02] text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Course</th>
                <th className="px-5 py-3 text-left font-medium">Quizzes</th>
                <th className="px-5 py-3 text-left font-medium">Exams</th>
                <th className="px-5 py-3 text-left font-medium">Total Submissions</th>
                <th className="px-5 py-3 text-left font-medium">Avg Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : courseStats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-gray-400 dark:text-gray-500">
                    No courses found.
                  </td>
                </tr>
              ) : (
                courseStats.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-4 text-gray-800 dark:text-gray-200 font-medium">
                      {c.name}
                    </td>
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{c.quizCount}</td>
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{c.examCount}</td>
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{c.submissionCount}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                      {c.avgScore !== null ? `${c.avgScore}%` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty state */}
      {!loading && courseStats.length === 0 && examStats.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] px-6 py-8 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <PieChartIcon className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No performance data yet. Create assessments or exams and wait for student submissions.
          </p>
        </div>
      )}
    </div>
  );
}
