"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PieChartIcon } from "@/icons";
import { instituteService, Course } from "@/services/instituteService";
import { RelatedStudyMaterial } from "@/components/common/RelatedStudyMaterial";

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

type ClassWeakArea = {
  id: string;
  source: "exam" | "quiz-voice" | "quiz-mcq";
  sourceTitle: string;
  courseName: string;
  courseId: string;
  questionText: string;
  questionType: "mcq" | "short_answer" | "voice";
  failCount: number;
  totalAttempts: number;
  failRate: number; // % of students who got it wrong / scored low
  avgScore?: number; // for short_answer / voice: average AI score %
  isPendingEssay?: boolean;
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
  const [classWeakAreas, setClassWeakAreas] = useState<ClassWeakArea[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [overallAvg, setOverallAvg] = useState<number | null>(null);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [pendingEssayReviews, setPendingEssayReviews] = useState(0);

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
              const tm = (attempt as any)?.totalMarks ?? (attempt as any)?.totalScore;
              const sc = (attempt as any)?.score ?? (attempt as any)?.totalScore;
              if (sc !== undefined && tm > 0) {
                scores.push(Math.round((sc / tm) * 100));
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
            .filter((a: any) => a?.totalMarks > 0)
            .map((a: any) => Math.round((a.score / a.totalMarks) * 100));
          const passCount = attemptValues.filter((a: any) => a?.passed).length;
          const submissionCount = attemptValues.length;

          const avgScore = scores.length
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : null;
          const passRate = submissionCount > 0 ? Math.round((passCount / submissionCount) * 100) : null;

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

        const totalSubs =
          eStats.reduce((s, e) => s + e.submissionCount, 0) +
          Array.from(courseMap.values()).reduce((s, c) => s + c.submissionCount, 0);
        setTotalSubmissions(totalSubs);

        const studentIds = new Set<string>();
        for (const exam of exams as any[]) {
          for (const sid of Object.keys(exam.studentAttempts ?? {})) studentIds.add(sid);
        }
        for (const group of assessmentGroups as any[]) {
          for (const { content } of group.quizzes ?? []) {
            for (const sid of Object.keys(content.studentAttempts ?? {})) studentIds.add(sid);
          }
        }
        setTotalStudents(studentIds.size);

        // ── Class Weak Areas Analysis ────────────────────────────────────────
        const weakAreas: ClassWeakArea[] = [];

        // 1. Exam questions — MCQ (wrong OR unanswered), short_answer (low AI score or 0), essay (pending)
        for (const exam of exams as any[]) {
          const attempts: Record<string, any> = exam.studentAttempts ?? {};
          const attemptList = Object.values(attempts) as any[];
          if (attemptList.length === 0) continue;

          for (const q of exam.questions ?? []) {
            const qType: string = q.type ?? "mcq";

            if (qType === "mcq") {
              if (q.correctAnswer === undefined) continue;
              const correct = Number(q.correctAnswer);
              // Count students who answered wrong OR didn't answer at all — both are gaps
              const failed = attemptList.filter((a) => {
                const ans = a.answers?.[q.id];
                if (ans === undefined || ans === null || ans === "") return true; // unanswered
                return Number(ans) !== correct; // wrong answer
              });
              if (failed.length === 0) continue;
              const failRate = Math.round((failed.length / attemptList.length) * 100);
              if (failRate < 30) continue;
              weakAreas.push({
                id: `exam-${exam.id}-${q.id}`,
                source: "exam",
                sourceTitle: exam.title,
                courseName: exam.courseName ?? "—",
                courseId: exam.courseId ?? "",
                questionText: q.question,
                questionType: "mcq",
                failCount: failed.length,
                totalAttempts: attemptList.length,
                failRate,
              });

            } else if (qType === "short_answer") {
              // Primary: use AI grades stored in essayGrades
              const graded = attemptList.filter((a) => a.essayGrades?.[q.id] !== undefined);
              // Fallback: student answered but AI grading failed → treat score as 0
              const answeredNoGrade = attemptList.filter(
                (a) => !a.essayGrades?.[q.id] && a.answers?.[q.id] !== undefined && a.answers[q.id] !== ""
              );

              const totalRelevant = graded.length + answeredNoGrade.length;
              if (totalRelevant === 0) continue;

              const gradedAvgPct = graded.length > 0
                ? Math.round(
                    graded.reduce((sum: number, a: any) => {
                      const g = a.essayGrades[q.id];
                      return sum + Math.round((g.score / (q.marks || 1)) * 100);
                    }, 0) / graded.length
                  )
                : 0;

              // Combined avg: graded questions + zero-score ungraded ones
              const combinedAvgPct = graded.length > 0
                ? Math.round(
                    (gradedAvgPct * graded.length + 0 * answeredNoGrade.length) / totalRelevant
                  )
                : 0;

              if (graded.length > 0 && combinedAvgPct >= 60) continue;

              const failCount =
                graded.filter((a: any) =>
                  Math.round((a.essayGrades[q.id].score / (q.marks || 1)) * 100) < 60
                ).length + answeredNoGrade.length;

              const failRate = Math.round((failCount / totalRelevant) * 100);
              if (failRate < 30) continue;

              weakAreas.push({
                id: `exam-${exam.id}-${q.id}`,
                source: "exam",
                sourceTitle: exam.title,
                courseName: exam.courseName ?? "—",
                courseId: exam.courseId ?? "",
                questionText: q.question,
                questionType: "short_answer",
                failCount,
                totalAttempts: totalRelevant,
                failRate,
                avgScore: graded.length > 0 ? combinedAvgPct : undefined,
              });

            } else if (qType === "essay") {
              // Surface essays that are pending review so teacher knows to act
              const pendingCount = attemptList.filter(
                (a) => a.answers?.[q.id] !== undefined && a.answers[q.id] !== "" && !a.essayGrades?.[q.id]
              ).length;
              if (pendingCount === 0) continue;
              const failRate = Math.round((pendingCount / attemptList.length) * 100);
              weakAreas.push({
                id: `exam-${exam.id}-${q.id}`,
                source: "exam",
                sourceTitle: exam.title,
                courseName: exam.courseName ?? "—",
                courseId: exam.courseId ?? "",
                questionText: q.question,
                questionType: "short_answer", // reuse pill style
                failCount: pendingCount,
                totalAttempts: attemptList.length,
                failRate,
                isPendingEssay: true,
              });
            }
          }
        }

        // 2. Voice quiz — aggregate per-question across all students
        for (const group of assessmentGroups as any[]) {
          for (const { content } of group.quizzes ?? []) {
            const allAttempts = Object.values(content.studentAttempts ?? {}) as any[];
            const voiceAttempts = allAttempts.filter((a) => a.type === "voice" && a.questionResults);
            if (voiceAttempts.length === 0) continue;

            const qAgg: Record<string, { text: string; totalPct: number; count: number }> = {};
            for (const attempt of voiceAttempts) {
              for (const qr of attempt.questionResults as any[]) {
                if (!qAgg[qr.questionId]) {
                  qAgg[qr.questionId] = { text: qr.question, totalPct: 0, count: 0 };
                }
                qAgg[qr.questionId].totalPct += qr.percentage ?? 0;
                qAgg[qr.questionId].count += 1;
              }
            }

            for (const [qId, agg] of Object.entries(qAgg)) {
              const avgPct = Math.round(agg.totalPct / agg.count);
              if (avgPct >= 60) continue;
              weakAreas.push({
                id: `voice-${content.id}-${qId}`,
                source: "quiz-voice",
                sourceTitle: content.title,
                courseName: group.course?.name ?? "—",
                courseId: group.course?.id ?? "",
                questionText: agg.text,
                questionType: "voice",
                failCount: agg.count,
                totalAttempts: agg.count,
                failRate: 100 - avgPct,
                avgScore: avgPct,
              });
            }
          }
        }

        // 3. MCQ quiz — wrong / unanswered across students
        for (const group of assessmentGroups as any[]) {
          for (const { content } of group.quizzes ?? []) {
            const questions: any[] = content.quizData?.questions ?? [];
            if (questions.length === 0) continue;
            const allAttempts = Object.values(content.studentAttempts ?? {}) as any[];
            const mcqAttempts = allAttempts.filter((a: any) => a.answers && a.type !== "voice");
            if (mcqAttempts.length === 0) continue;

            for (const q of questions) {
              if (q.correctAnswer === undefined) continue;
              const correct = Number(q.correctAnswer);
              const failed = mcqAttempts.filter((a: any) => {
                const ans = a.answers?.[q.id];
                if (ans === undefined || ans === null || ans === "") return true;
                return Number(ans) !== correct;
              });
              if (failed.length === 0) continue;
              const failRate = Math.round((failed.length / mcqAttempts.length) * 100);
              if (failRate < 30) continue;
              weakAreas.push({
                id: `quiz-${content.id}-${q.id}`,
                source: "quiz-mcq",
                sourceTitle: content.title,
                courseName: group.course?.name ?? "—",
                courseId: group.course?.id ?? "",
                questionText: q.question,
                questionType: "mcq",
                failCount: failed.length,
                totalAttempts: mcqAttempts.length,
                failRate,
              });
            }
          }
        }

        weakAreas.sort((a, b) => b.failRate - a.failRate);
        setClassWeakAreas(weakAreas);
        setPendingEssayReviews(weakAreas.filter((a) => a.isPendingEssay).reduce((s, a) => s + a.failCount, 0));
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
    {
      label: "Pending Essay Reviews",
      value: loading ? "—" : pendingEssayReviews.toString(),
      highlight: !loading && pendingEssayReviews > 0,
    },
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {summaryStats.map((s) => (
          <div
            key={s.label}
            className={`rounded-2xl border p-5 ${
              (s as any).highlight
                ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-500/10"
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3"
            }`}
          >
            <span className={`text-sm ${(s as any).highlight ? "text-amber-700 dark:text-amber-400" : "text-gray-500 dark:text-gray-400"}`}>
              {s.label}
            </span>
            <p className={`text-2xl font-bold mt-1 ${(s as any).highlight ? "text-amber-700 dark:text-amber-300" : "text-gray-800 dark:text-white"}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Class Weak Areas — always shown once loaded */}
      <div className="rounded-2xl border border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-500/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-red-200 dark:border-red-800/50 flex items-center gap-2">
          <span className="text-lg">📉</span>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white">Class Weak Areas</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Questions where 30%+ of students struggled — sorted by highest failure rate
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-5 flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse h-16 bg-red-100 dark:bg-red-900/20 rounded-xl" />
            ))}
          </div>
        ) : classWeakAreas.length === 0 ? (
          <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
            <span className="text-2xl">✅</span>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              No class-wide weak areas detected
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Questions will appear here once 30%+ of students struggle with them.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-red-100 dark:divide-red-900/30">
            {classWeakAreas.map((area) => (
              <div key={area.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Labels row */}
                    <div className="flex items-center flex-wrap gap-2 mb-1.5">
                      <span className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/15 px-2 py-0.5 rounded-full">
                        {area.source === "exam"
                          ? "Exam"
                          : area.source === "quiz-voice"
                          ? "Voice Quiz"
                          : "Quiz"}
                      </span>
                      {area.questionType !== "mcq" && area.questionType !== "voice" && (
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/15 px-2 py-0.5 rounded-full capitalize">
                          {area.questionType.replace("_", " ")}
                        </span>
                      )}
                      {area.isPendingEssay && (
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 rounded-full">
                          ⏳ Pending your review
                        </span>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {area.sourceTitle} · {area.courseName}
                      </span>
                    </div>

                    {/* Question text */}
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {area.questionText}
                    </p>

                    {/* Avg score for short_answer / voice */}
                    {area.avgScore !== undefined && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Class avg score: <span className="font-semibold text-gray-700 dark:text-gray-300">{area.avgScore}%</span>
                      </p>
                    )}
                  </div>

                  {/* Fail rate badge */}
                  <div className="shrink-0 text-right">
                    <div
                      className={`text-lg font-bold ${
                        area.failRate >= 70
                          ? "text-red-600 dark:text-red-400"
                          : area.failRate >= 50
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {area.failRate}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {area.failCount}/{area.totalAttempts} failed
                    </div>
                  </div>
                </div>

                {/* Fail rate bar */}
                <div className="mt-2.5 h-1.5 w-full bg-red-100 dark:bg-red-900/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      area.failRate >= 70
                        ? "bg-red-500"
                        : area.failRate >= 50
                        ? "bg-orange-500"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${area.failRate}%` }}
                  />
                </div>

                {/* Related study material — lazy KB search */}
                {area.courseId && (
                  <RelatedStudyMaterial
                    instituteId={instituteId}
                    courseId={area.courseId}
                    questionText={area.questionText}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exam Performance Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 overflow-hidden">
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
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 overflow-hidden">
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
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 px-6 py-8 text-center flex flex-col items-center gap-3">
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
