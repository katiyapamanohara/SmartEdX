"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PieChartIcon, ArrowUpIcon, ArrowDownIcon } from "@/icons";
import { instituteService, Course, StudentAssessmentGroup } from "@/services/instituteService";
import { authService } from "@/services/authService";

type CourseRow = {
  id: string;
  course: string;
  avgScore: number | null;
  highScore: number | null;
  totalAttempts: number;
  status: "In Progress" | "Completed" | "Not Started";
};

type ExamRow = {
  id: string;
  title: string;
  courseName: string;
  score: number | null;
  totalMarks: number;
  passed: boolean | null;
  submittedAt: string | null;
  status: string;
};

const STATUS_COLORS: Record<string, string> = {
  "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  Completed: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  "Not Started": "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400",
};

const EXAM_STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  active: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  scheduled: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400",
};

export default function StudentPerformancePage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const [loading, setLoading] = useState(true);
  const [courseRows, setCourseRows] = useState<CourseRow[]>([]);
  const [examRows, setExamRows] = useState<ExamRow[]>([]);
  const [overallAvg, setOverallAvg] = useState<number | null>(null);
  const [highestScore, setHighestScore] = useState<number | null>(null);
  const [lowestScore, setLowestScore] = useState<number | null>(null);
  const [completionRate, setCompletionRate] = useState<number | null>(null);

  useEffect(() => {
    if (!instituteId) return;
    (async () => {
      setLoading(true);
      try {
        const userId = authService.getUserId();

        const [assessmentGroups, exams, courses]: [StudentAssessmentGroup[], any[], Course[]] =
          await Promise.all([
            instituteService.getMyStudentAssessments(instituteId),
            instituteService.getStudentExams(instituteId),
            instituteService.getMyEnrolledCourses(instituteId),
          ]);

        // ── Build per-course rows from quizzes ───────────────────────────────
        const courseMap = new Map<string, CourseRow>();

        for (const group of assessmentGroups) {
          const cid = group.course.id;
          const scores: number[] = [];

          for (const { content } of group.quizzes) {
            const attempt = userId && content.studentAttempts?.[userId];
            if (attempt) {
              const pct =
                attempt.totalMarks > 0
                  ? Math.round((attempt.score / attempt.totalMarks) * 100)
                  : null;
              if (pct !== null) scores.push(pct);
            }
          }

          const avgScore = scores.length
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : null;
          const highScore = scores.length ? Math.max(...scores) : null;
          const totalAttempts = scores.length;
          const totalQuizzes = group.quizzes.length;

          const status: CourseRow["status"] =
            totalQuizzes === 0
              ? "Not Started"
              : totalAttempts === 0
              ? "Not Started"
              : totalAttempts < totalQuizzes
              ? "In Progress"
              : "Completed";

          courseMap.set(cid, {
            id: cid,
            course: group.course.name,
            avgScore,
            highScore,
            totalAttempts,
            status,
          });
        }

        // Fill in enrolled courses with no assessments yet
        for (const c of courses) {
          if (!courseMap.has(c.id)) {
            courseMap.set(c.id, {
              id: c.id,
              course: c.name,
              avgScore: null,
              highScore: null,
              totalAttempts: 0,
              status: "Not Started",
            });
          }
        }

        setCourseRows(Array.from(courseMap.values()));

        // ── Build exam rows ──────────────────────────────────────────────────
        const eRows: ExamRow[] = exams.map((exam: any) => {
          const attempt = exam.myAttempt;
          return {
            id: exam.id,
            title: exam.title,
            courseName: exam.courseName ?? "—",
            score: attempt ? Math.round((attempt.score / attempt.totalMarks) * 100) : null,
            totalMarks: exam.totalMarks,
            passed: attempt ? attempt.passed : null,
            submittedAt: attempt?.submittedAt ?? null,
            status: exam.status,
          };
        });
        setExamRows(eRows);

        // ── Overall stats ────────────────────────────────────────────────────
        const allScores: number[] = [];

        for (const row of courseMap.values()) {
          if (row.avgScore !== null) allScores.push(row.avgScore);
        }
        for (const e of eRows) {
          if (e.score !== null) allScores.push(e.score);
        }

        if (allScores.length) {
          setOverallAvg(Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length));
          setHighestScore(Math.max(...allScores));
          setLowestScore(Math.min(...allScores));
        }

        // Completion rate: percentage of assessments + exams attempted
        const totalItems = assessmentGroups.reduce((s, g) => s + g.quizzes.length, 0) + exams.length;
        const attemptedItems =
          assessmentGroups.reduce(
            (s, g) =>
              s +
              g.quizzes.filter(({ content }) => {
                const attempt = userId && content.studentAttempts?.[userId];
                return !!attempt;
              }).length,
            0
          ) + eRows.filter((e) => e.score !== null).length;

        setCompletionRate(
          totalItems > 0 ? Math.round((attemptedItems / totalItems) * 100) : null
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [instituteId]);

  const stats = [
    {
      label: "Overall Avg Score",
      value: loading ? "—" : overallAvg !== null ? `${overallAvg}%` : "—",
      icon: <ArrowUpIcon className="w-4 h-4" />,
      color: "text-success-600 bg-success-50 dark:bg-success-500/15 dark:text-success-500",
    },
    {
      label: "Highest Score",
      value: loading ? "—" : highestScore !== null ? `${highestScore}%` : "—",
      icon: <ArrowUpIcon className="w-4 h-4" />,
      color: "text-success-600 bg-success-50 dark:bg-success-500/15 dark:text-success-500",
    },
    {
      label: "Lowest Score",
      value: loading ? "—" : lowestScore !== null ? `${lowestScore}%` : "—",
      icon: <ArrowDownIcon className="w-4 h-4" />,
      color: "text-error-600 bg-error-50 dark:bg-error-500/15 dark:text-error-500",
    },
    {
      label: "Completion Rate",
      value: loading ? "—" : completionRate !== null ? `${completionRate}%` : "—",
      icon: null,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-500/15 dark:text-blue-400",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Performance</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Track your grades and progress across all courses
        </p>
      </div>

      {/* Stat bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5"
          >
            <span className="text-sm text-gray-500 dark:text-gray-400">{s.label}</span>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{s.value}</p>
              {s.icon && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${s.color}`}
                >
                  {s.icon}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Course Performance Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-white">Course Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/[0.02] text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Course</th>
                <th className="px-5 py-3 text-left font-medium">Avg Score</th>
                <th className="px-5 py-3 text-left font-medium">Best Score</th>
                <th className="px-5 py-3 text-left font-medium">Attempts</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
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
              ) : courseRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-gray-400 dark:text-gray-500">
                    No enrolled courses found.
                  </td>
                </tr>
              ) : (
                courseRows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-4 text-gray-800 dark:text-gray-200 font-medium">
                      {row.course}
                    </td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                      {row.avgScore !== null ? `${row.avgScore}%` : "—"}
                    </td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                      {row.highScore !== null ? `${row.highScore}%` : "—"}
                    </td>
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                      {row.totalAttempts}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          STATUS_COLORS[row.status] ?? ""
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exams Table */}
      {(loading || examRows.length > 0) && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-white">Exam Results</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/[0.02] text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Exam</th>
                  <th className="px-5 py-3 text-left font-medium">Course</th>
                  <th className="px-5 py-3 text-left font-medium">Score</th>
                  <th className="px-5 py-3 text-left font-medium">Result</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Submitted</th>
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
                ) : (
                  examRows.map((exam) => (
                    <tr
                      key={exam.id}
                      className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-4 text-gray-800 dark:text-gray-200 font-medium">
                        {exam.title}
                      </td>
                      <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                        {exam.courseName}
                      </td>
                      <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                        {exam.score !== null ? `${exam.score}%` : "—"}
                      </td>
                      <td className="px-5 py-4">
                        {exam.passed === null ? (
                          <span className="text-gray-400 dark:text-gray-500 text-xs">Not attempted</span>
                        ) : (
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              exam.passed
                                ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                                : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                            }`}
                          >
                            {exam.passed ? "Passed" : "Failed"}
                          </span>
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
                      <td className="px-5 py-4 text-gray-500 dark:text-gray-400 text-xs">
                        {exam.submittedAt
                          ? new Date(exam.submittedAt).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state when no data at all */}
      {!loading && courseRows.length === 0 && examRows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] px-6 py-8 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <PieChartIcon className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No performance data yet. Complete some assessments or exams to see your results here.
          </p>
        </div>
      )}
    </div>
  );
}
