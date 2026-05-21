"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PieChartIcon, ArrowUpIcon, ArrowDownIcon } from "@/icons";
import { instituteService, Course, StudentAssessmentGroup } from "@/services/instituteService";
import { authService } from "@/services/authService";
import { RelatedStudyMaterial } from "@/components/common/RelatedStudyMaterial";

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

type WeakArea = {
  id: string;
  source: "exam" | "quiz-voice" | "quiz-mcq";
  sourceTitle: string;
  courseName: string;
  courseId: string;
  questionText: string;
  scorePercent: number;
  myAnswer?: string;
  correctAnswer?: string;
  feedback?: string;
  // For unanswered / short-answer questions
  questionType?: "mcq" | "short_answer" | "essay";
  pendingReview?: boolean;
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StudentPerformancePage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const [loading, setLoading] = useState(true);
  const [courseRows, setCourseRows] = useState<CourseRow[]>([]);
  const [examRows, setExamRows] = useState<ExamRow[]>([]);
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
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
        console.log("[Performance] userId:", userId);

        const [assessmentGroups, exams, courses]: [StudentAssessmentGroup[], any[], Course[]] =
          await Promise.all([
            instituteService.getMyStudentAssessments(instituteId),
            instituteService.getStudentExams(instituteId),
            instituteService.getMyEnrolledCourses(instituteId),
          ]);

        console.log("[Performance] assessmentGroups:", assessmentGroups);
        console.log("[Performance] exams:", exams);
        console.log("[Performance] courses:", courses);

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

        // ── Weak Areas Analysis ──────────────────────────────────────────────
        const areas: WeakArea[] = [];

        // 1. Exam questions (MCQ wrong/unanswered, short_answer low score, essay pending)
        for (const exam of exams) {
          const attempt = exam.myAttempt;
          const questions: any[] = exam.questions ?? [];
          console.log(`[Performance] exam "${exam.title}" status=${exam.status} hasAttempt=${!!attempt} answersKeys=${attempt?.answers ? Object.keys(attempt.answers).length : 0} questionsCount=${questions.length} types=${[...new Set(questions.map((q:any)=>q.type))].join(",")} firstQHasCorrect=${questions[0]?.correctAnswer !== undefined}`);
          if (!attempt) continue; // no submission yet

          const answers: Record<string, any> = attempt.answers ?? {};
          const essayGrades: Record<string, any> = (attempt as any).essayGrades ?? {};

          for (const q of questions) {
            const qType: string = q.type ?? "mcq";

            if (qType === "mcq") {
              // Wrong answer OR no answer at all (both indicate a gap)
              if (q.correctAnswer === undefined) continue;
              const myAnswerRaw = answers[q.id];
              const myAnswerIdx = myAnswerRaw !== undefined ? Number(myAnswerRaw) : null;
              const isCorrect = myAnswerIdx !== null && myAnswerIdx === Number(q.correctAnswer);
              if (isCorrect) continue;
              areas.push({
                id: `exam-${exam.id}-${q.id}`,
                source: "exam",
                sourceTitle: exam.title,
                courseName: exam.courseName ?? "—",
                courseId: exam.courseId ?? "",
                questionText: q.question,
                questionType: "mcq",
                scorePercent: 0,
                myAnswer: myAnswerIdx !== null
                  ? (q.options?.[myAnswerIdx] ?? `Option ${myAnswerIdx + 1}`)
                  : "Not answered",
                correctAnswer: q.options?.[Number(q.correctAnswer)] ?? `Option ${Number(q.correctAnswer) + 1}`,
              });

            } else if (qType === "short_answer") {
              // AI-graded: surface if score < 60% of available marks
              const grade = essayGrades[q.id];
              const pct = grade ? Math.round((grade.score / (q.marks || 1)) * 100) : 0;
              if (pct >= 60) continue;
              areas.push({
                id: `exam-${exam.id}-${q.id}`,
                source: "exam",
                sourceTitle: exam.title,
                courseName: exam.courseName ?? "—",
                courseId: exam.courseId ?? "",
                questionText: q.question,
                questionType: "short_answer",
                scorePercent: pct,
                myAnswer: answers[q.id] ? String(answers[q.id]) : "Not answered",
                feedback: grade?.feedback ?? undefined,
              });

            } else if (qType === "essay") {
              // Pending teacher review — always surface so student knows it needs attention
              const grade = essayGrades[q.id];
              if (grade && Math.round((grade.score / (q.marks || 1)) * 100) >= 60) continue;
              areas.push({
                id: `exam-${exam.id}-${q.id}`,
                source: "exam",
                sourceTitle: exam.title,
                courseName: exam.courseName ?? "—",
                courseId: exam.courseId ?? "",
                questionText: q.question,
                questionType: "essay",
                scorePercent: grade ? Math.round((grade.score / (q.marks || 1)) * 100) : 0,
                myAnswer: answers[q.id] ? String(answers[q.id]) : "Not answered",
                feedback: grade?.feedback,
                pendingReview: !grade,
              });
            }
          }
        }

        // 2. Voice quiz — questions < 60%
        for (const group of assessmentGroups) {
          for (const { content } of group.quizzes) {
            const attempt = userId && content.studentAttempts?.[userId];
            if (!attempt?.questionResults) continue;
            for (const qr of attempt.questionResults as any[]) {
              if ((qr.percentage ?? 100) >= 60) continue;
              areas.push({
                id: `voice-${content.id}-${qr.questionId}`,
                source: "quiz-voice",
                sourceTitle: content.title,
                courseName: group.course.name,
                courseId: group.course.id,
                questionText: qr.question,
                scorePercent: qr.percentage ?? 0,
                feedback: qr.feedback,
              });
            }
          }
        }

        // 3. MCQ quiz — wrong / unanswered answers
        for (const group of assessmentGroups) {
          for (const { content } of group.quizzes) {
            const attempt = userId && content.studentAttempts?.[userId];
            if (!attempt?.answers || attempt?.questionResults) continue;
            const questions: any[] = content.quizData?.questions ?? [];
            for (const q of questions) {
              if (q.correctAnswer === undefined) continue;
              const myAnswerRaw = attempt.answers[q.id];
              if (myAnswerRaw === undefined) continue;
              const myAnswerIdx = Number(myAnswerRaw);
              if (myAnswerIdx === Number(q.correctAnswer)) continue;
              areas.push({
                id: `quiz-${content.id}-${q.id}`,
                source: "quiz-mcq",
                sourceTitle: content.title,
                courseName: group.course.name,
                courseId: group.course.id,
                questionText: q.question,
                questionType: "mcq",
                scorePercent: 0,
                myAnswer: q.options?.[myAnswerIdx] ?? `Option ${myAnswerIdx + 1}`,
                correctAnswer: q.options?.[Number(q.correctAnswer)] ?? `Option ${Number(q.correctAnswer) + 1}`,
              });
            }
          }
        }

        console.log("[Performance] weak areas found:", areas.length, areas);
        areas.sort((a, b) => a.scorePercent - b.scorePercent);
        setWeakAreas(areas);
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-5"
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

      {/* Weak Areas — always shown once data has loaded (or while loading) */}
      <div className="rounded-2xl border border-orange-200 dark:border-orange-800/50 bg-orange-50/50 dark:bg-orange-500/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-orange-200 dark:border-orange-800/50 flex items-center gap-2">
          <span className="text-lg">⚠️</span>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white">Areas to Improve</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Questions you got wrong — expand each to see related study material from your course
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-5 flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse h-24 bg-orange-100 dark:bg-orange-900/20 rounded-xl" />
            ))}
          </div>
        ) : weakAreas.length === 0 ? (
          <div className="px-5 py-10 flex flex-col items-center gap-2 text-center">
            <span className="text-3xl">🎉</span>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No weak areas found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Complete MCQ exams or quizzes and any wrong answers will appear here with study tips.
            </p>
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-3">
            {weakAreas.map((area, idx) => {
              // Card accent colour by type
              const borderColor =
                area.pendingReview
                  ? "border-l-amber-400 dark:border-l-amber-500"
                  : area.source === "quiz-voice" || area.questionType === "short_answer"
                  ? "border-l-orange-400 dark:border-l-orange-500"
                  : "border-l-red-400 dark:border-l-red-500";

              const isMcq =
                area.questionType === "mcq" ||
                (!area.questionType && area.source !== "quiz-voice");

              return (
                <div
                  key={area.id}
                  className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 border-l-4 ${borderColor} overflow-hidden`}
                >
                  {/* ── Card header ── */}
                  <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
                    {/* Left: index + pills */}
                    <div className="flex items-center flex-wrap gap-2 min-w-0">
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/15 px-2 py-0.5 rounded-full shrink-0">
                        {area.source === "exam" ? "Exam" : area.source === "quiz-voice" ? "Voice Quiz" : "Quiz"}
                      </span>
                      {area.questionType && area.questionType !== "mcq" && (
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/15 px-2 py-0.5 rounded-full shrink-0 capitalize">
                          {area.questionType.replace("_", " ")}
                        </span>
                      )}
                      {area.pendingReview && (
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 rounded-full shrink-0">
                          ⏳ Pending review
                        </span>
                      )}
                      <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        {area.sourceTitle} · {area.courseName}
                      </span>
                    </div>
                    {/* Right: score % for voice/short_answer */}
                    {(area.source === "quiz-voice" || area.questionType === "short_answer") && (
                      <span className="shrink-0 text-sm font-bold text-red-600 dark:text-red-400">
                        {area.scorePercent}%
                      </span>
                    )}
                  </div>

                  {/* ── Question text ── */}
                  <div className="px-4 pb-3">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug">
                      {area.questionText}
                    </p>
                  </div>

                  {/* ── Answer comparison (MCQ) ── */}
                  {isMcq && area.correctAnswer && (
                    <div className="mx-4 mb-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col gap-1 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2">
                        <span className="font-semibold text-red-500 dark:text-red-400 uppercase tracking-wide text-[10px]">
                          Your answer
                        </span>
                        <span className="text-red-700 dark:text-red-300 font-medium">
                          {area.myAnswer ?? "Not answered"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 px-3 py-2">
                        <span className="font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide text-[10px]">
                          Correct answer
                        </span>
                        <span className="text-green-700 dark:text-green-300 font-medium">
                          {area.correctAnswer}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ── Short answer: student response ── */}
                  {area.questionType === "short_answer" && area.myAnswer && area.myAnswer !== "Not answered" && (
                    <div className="mx-4 mb-3 rounded-lg bg-gray-50 dark:bg-white/4 border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs">
                      <p className="font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-[10px] mb-1">Your answer</p>
                      <p className="text-gray-700 dark:text-gray-300">{area.myAnswer}</p>
                    </div>
                  )}

                  {/* ── AI / teacher feedback ── */}
                  {area.feedback && (
                    <div className="mx-4 mb-3 flex gap-2 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 px-3 py-2">
                      <span className="text-orange-400 shrink-0 mt-0.5">💬</span>
                      <p className="text-xs text-gray-600 dark:text-gray-300 italic leading-relaxed">{area.feedback}</p>
                    </div>
                  )}

                  {/* ── Essay pending ── */}
                  {area.questionType === "essay" && area.pendingReview && (
                    <div className="mx-4 mb-3 flex gap-2 items-center rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3 py-2">
                      <span className="text-amber-500 shrink-0">⏳</span>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Awaiting teacher grading — study the related material below to prepare.
                      </p>
                    </div>
                  )}

                  {/* ── Study material expander ── */}
                  {area.courseId && (
                    <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3">
                      <RelatedStudyMaterial
                        instituteId={instituteId}
                        courseId={area.courseId}
                        questionText={area.questionText}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Course Performance Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 overflow-hidden">
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
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 overflow-hidden">
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

      {/* Empty state */}
      {!loading && courseRows.length === 0 && examRows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 px-6 py-8 text-center flex flex-col items-center gap-3">
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
