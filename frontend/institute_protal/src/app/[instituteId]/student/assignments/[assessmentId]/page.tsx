"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  instituteService,
  ModuleContent,
  QuizQuestion,
  StudentAssessmentGroup,
} from "@/services/instituteService";
import { authService } from "@/services/authService";

type AssessmentItem = {
  id: string;
  type: "exam" | "quiz";
  courseName: string;
  moduleTitle: string;
  title: string;
  description?: string;
  questionCount: number;
  passingScore: number;
  timeLimit: number;
  createdAt?: string;
  content: ModuleContent;
};

export default function StudentAssessmentAttemptPage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;
  const assessmentId = params?.assessmentId as string;

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<StudentAssessmentGroup[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [storedAnswers, setStoredAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyAttempted, setAlreadyAttempted] = useState(false);
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!instituteId) return;
    (async () => {
      setLoading(true);
      try {
        const data = await instituteService.getMyStudentAssessments(instituteId);
        setGroups(data);

        const userId = authService.getUserId();
        if (userId) {
          for (const g of data) {
            for (const q of g.quizzes) {
              if (q.content.id === assessmentId) {
                const attempts = q.content.studentAttempts || {};
                if (attempts[userId]) {
                  setAlreadyAttempted(true);
                  setScore(attempts[userId].score || 0);
                  setStoredAnswers(attempts[userId].answers || {});
                }
                break;
              }
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [instituteId, assessmentId]);

  const item = useMemo<AssessmentItem | null>(() => {
    for (const g of groups) {
      for (const q of g.quizzes) {
        if (q.content.id !== assessmentId) continue;
        const t = `${q.content.title} ${q.module.title}`.toLowerCase();
        const type: "exam" | "quiz" = t.includes("exam") ? "exam" : "quiz";
        return {
          id: q.content.id,
          type,
          courseName: g.course.name,
          moduleTitle: q.module.title,
          title: q.content.title,
          description: q.content.description,
          questionCount: q.content.quizData?.questions?.length ?? 0,
          passingScore: q.content.quizData?.passingScore ?? 70,
          timeLimit: q.content.quizData?.timeLimit ?? 0,
          createdAt: q.content.createdAt,
          content: q.content,
        };
      }
    }
    return null;
  }, [assessmentId, groups]);

  const questions = item?.content.quizData?.questions ?? [];

  useEffect(() => {
    if (alreadyAttempted) return;
    const handleCopy = (e: ClipboardEvent) => e.preventDefault();
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleSelectStart = (e: Event) => e.preventDefault();
    const handleDragStart = (e: DragEvent) => e.preventDefault();

    document.addEventListener("copy", handleCopy);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("selectstart", handleSelectStart);
    document.addEventListener("dragstart", handleDragStart);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("dragstart", handleDragStart);
    };
  }, [alreadyAttempted]);

  const calculatedScore = useMemo(() => {
    if (!item || !submitted) return 0;
    let correct = 0;
    for (const q of questions as QuizQuestion[]) {
      if (answers[q.id] === q.correctAnswer) correct += 1;
    }
    return questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
  }, [answers, item, questions, submitted]);

  useEffect(() => {
    if (!submitted || calculatedScore === undefined || !assessmentId || !instituteId) return;

    (async () => {
      setSubmitting(true);
      setError(null);
      try {
        const token = authService.getToken();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(
          `${apiUrl}/api/institutes/institutes/${instituteId}/courses/student-assessments/${assessmentId}/submit`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ score: calculatedScore, answers }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.message || "Failed to submit quiz");
          setSubmitted(false);
          return;
        }

        setScore(calculatedScore);
        setStoredAnswers(answers);
        setAlreadyAttempted(true);
      } catch (e) {
        console.error(e);
        setError("Error submitting quiz attempt" + (e instanceof Error ? ": " + e.message : ""));
        setSubmitted(false);
      } finally {
        setSubmitting(false);
      }
    })();
  }, [submitted, calculatedScore, assessmentId, instituteId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-32 animate-pulse rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-white/3" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-white/3">
        <p className="text-base font-semibold text-gray-900 dark:text-white">Assessment not found</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          This assessment may no longer be available.
        </p>
        <Link
          href={`/${instituteId}/student/assignments`}
          className="mt-4 inline-flex rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Back to Assessments
        </Link>
      </div>
    );
  }

  // ── Review mode (already attempted) ──────────────────────────────
  if (alreadyAttempted) {
    const passed = score >= item.passingScore;
    const reviewAnswers = storedAnswers;
    const correctCount = (questions as QuizQuestion[]).filter(
      (q) => reviewAnswers[q.id] === q.correctAnswer
    ).length;

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{item.title}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {item.courseName} • {item.moduleTitle}
            </p>
          </div>
          <Link
            href={`/${instituteId}/student/assignments`}
            className="inline-flex rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Back
          </Link>
        </div>

        {/* Score banner */}
        <div
          className={`rounded-2xl border p-5 ${
            passed
              ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
              : "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p
                className={`text-lg font-bold ${
                  passed ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                }`}
              >
                {passed ? "Passed" : "Failed"} — {score}%
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {correctCount} of {questions.length} correct • Passing score: {item.passingScore}%
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                passed
                  ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                  : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
              }`}
            >
              {passed ? "✓ Passed" : "✗ Failed"}
            </span>
          </div>
        </div>

        {/* Questions review */}
        {(questions as QuizQuestion[]).length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400">
            No questions found.
          </div>
        ) : (
          <div className="space-y-4">
            {(questions as QuizQuestion[]).map((q, idx) => {
              const studentPick = reviewAnswers[q.id];
              const isCorrect = studentPick === q.correctAnswer;
              const unanswered = studentPick === undefined;

              return (
                <div
                  key={q.id}
                  className={`rounded-2xl border p-4 ${
                    unanswered
                      ? "border-gray-200 bg-white dark:border-gray-700 dark:bg-white/3"
                      : isCorrect
                      ? "border-green-300 bg-white dark:border-green-800 dark:bg-white/3"
                      : "border-red-300 bg-white dark:border-red-800 dark:bg-white/3"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {idx + 1}. {q.question}
                    </p>
                    {unanswered ? (
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                        Skipped
                      </span>
                    ) : isCorrect ? (
                      <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/20 dark:text-green-400">
                        Correct
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/20 dark:text-red-400">
                        Wrong
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const isStudentChoice = studentPick === optIdx;
                      const isCorrectAnswer = q.correctAnswer === optIdx;

                      let borderColor = "border-gray-200 dark:border-gray-700";
                      let bgColor = "";
                      let label: React.ReactNode = null;

                      if (isCorrectAnswer && isStudentChoice) {
                        borderColor = "border-green-400 dark:border-green-600";
                        bgColor = "bg-green-50 dark:bg-green-900/20";
                        label = (
                          <span className="ml-auto text-xs font-medium text-green-600 dark:text-green-400">
                            Your answer ✓
                          </span>
                        );
                      } else if (isCorrectAnswer) {
                        borderColor = "border-green-400 dark:border-green-600";
                        bgColor = "bg-green-50 dark:bg-green-900/20";
                        label = (
                          <span className="ml-auto text-xs font-medium text-green-600 dark:text-green-400">
                            Correct answer
                          </span>
                        );
                      } else if (isStudentChoice) {
                        borderColor = "border-red-400 dark:border-red-600";
                        bgColor = "bg-red-50 dark:bg-red-900/20";
                        label = (
                          <span className="ml-auto text-xs font-medium text-red-600 dark:text-red-400">
                            Your answer ✗
                          </span>
                        );
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`flex items-center gap-2 rounded-lg border p-2 ${borderColor} ${bgColor}`}
                        >
                          <input
                            type="radio"
                            readOnly
                            checked={isStudentChoice}
                            className="pointer-events-none"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{opt}</span>
                          {label}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                      {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end">
          <Link
            href={`/${instituteId}/student/assignments`}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Back to Assessments
          </Link>
        </div>
      </div>
    );
  }

  // ── Attempt mode ──────────────────────────────────────────────────
  return (
    <div className="space-y-5 select-none" style={{ WebkitUserSelect: "none", MozUserSelect: "none", userSelect: "none" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{item.title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {item.courseName} • {item.moduleTitle}
          </p>
        </div>

        <Link
          href={`/${instituteId}/student/assignments`}
          className="inline-flex rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Back
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-white/3 dark:text-gray-300">
        <p>
          {item.questionCount} question{item.questionCount !== 1 ? "s" : ""}
          {item.timeLimit > 0 ? ` • ${item.timeLimit} min` : ""}
          {` • Pass ${item.passingScore}%`}
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {(questions as QuizQuestion[]).length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400">
          No questions found for this assessment.
        </div>
      ) : (
        <div className="space-y-4">
          {(questions as QuizQuestion[]).map((q, idx) => (
            <div key={q.id} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-white/3">
              <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                {idx + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, optIdx) => {
                  const selected = answers[q.id] === optIdx;
                  const showCorrect = submitted && q.correctAnswer === optIdx;
                  const showWrong = submitted && selected && q.correctAnswer !== optIdx;

                  return (
                    <label
                      key={optIdx}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 ${
                        showCorrect
                          ? "border-green-400 bg-green-50 dark:bg-green-900/20"
                          : showWrong
                          ? "border-red-400 bg-red-50 dark:bg-red-900/20"
                          : selected
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        disabled={submitted}
                        checked={selected}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{opt}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/95">
        {submitted ? (
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Score: {calculatedScore}% {calculatedScore >= item.passingScore ? "(Passed)" : "(Failed)"}
          </p>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">Answer all questions, then submit.</p>
        )}

        {!submitted ? (
          <button
            onClick={() => setSubmitted(true)}
            disabled={(questions as QuizQuestion[]).length === 0}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            Submit Assessment
          </button>
        ) : submitting ? (
          <button disabled className="rounded-lg bg-gray-400 px-4 py-2 text-sm font-medium text-white">
            Submitting...
          </button>
        ) : (
          <button disabled className="rounded-lg bg-gray-400 px-4 py-2 text-sm font-medium text-white">
            Failed to Submit
          </button>
        )}
      </div>
    </div>
  );
}
