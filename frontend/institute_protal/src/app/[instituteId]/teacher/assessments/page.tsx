"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createPortal } from "react-dom";
import {
  CourseModule,
  ModuleContent,
  Course,
  QuizQuestion,
  instituteService,
} from "@/services/instituteService";
// CourseModule used only for Pick type — no runtime usage needed
import CreateAssessmentModal from "./components/CreateAssessmentModal";
import EditAssessmentModal, { EditEntry } from "./components/EditAssessmentModal";
import VoiceAssessmentModal from "@/components/teacher/VoiceAssessmentModal";
import {
  FiHelpCircle,
  FiClock,
  FiAward,
  FiEye,
  FiEdit2,
  FiX,
  FiCheckCircle,
  FiChevronDown,
  FiPlus,
  FiChevronRight,
  FiUsers,
  FiChevronUp,
  FiMic,
  FiShield,
  FiAlertTriangle,
} from "react-icons/fi";

// ─── Types ────────────────────────────────────────────────────────
interface QuizEntry {
  content: ModuleContent;
  module: Pick<CourseModule, 'id' | 'title' | 'order'>;
  course: Course;
}

// ─── Quiz view modal ──────────────────────────────────────────────
const OPTION_LETTERS = ["A", "B", "C", "D"];

function QuizViewModal({
  isOpen,
  onClose,
  content,
}: {
  isOpen: boolean;
  onClose: () => void;
  content: ModuleContent | null;
}) {
  if (!isOpen || !content) return null;
  const quiz = content.quizData;
  const questions: QuizQuestion[] = quiz?.questions ?? [];

  const modal = (
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              <FiHelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{content.title}</h2>
              {content.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{content.description}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        {quiz && (
          <div className="flex items-center gap-6 px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <FiHelpCircle className="w-4 h-4" />
              <span><span className="font-semibold text-gray-900 dark:text-white">{questions.length}</span> Questions</span>
            </div>
            {quiz.passingScore !== undefined && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <FiAward className="w-4 h-4" />
                <span>Pass: <span className="font-semibold text-gray-900 dark:text-white">{quiz.passingScore}%</span></span>
              </div>
            )}
            {quiz.timeLimit > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <FiClock className="w-4 h-4" />
                <span><span className="font-semibold text-gray-900 dark:text-white">{quiz.timeLimit}</span> min</span>
              </div>
            )}
          </div>
        )}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {questions.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 py-10">This quiz has no questions yet.</p>
          ) : questions.map((q, qi) => (
            <div key={q.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="flex items-start gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">{qi + 1}</span>
                <p className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed">{q.question}</p>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {q.options.map((opt, oi) => {
                  const isCorrect = oi === q.correctAnswer;
                  return (
                    <div key={oi} className={`flex items-center gap-3 px-4 py-2.5 ${isCorrect ? "bg-green-50 dark:bg-green-900/20" : "bg-white dark:bg-gray-900"}`}>
                      <span className={`shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${isCorrect ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}>{OPTION_LETTERS[oi]}</span>
                      <span className={`text-sm flex-1 ${isCorrect ? "text-green-800 dark:text-green-300 font-medium" : "text-gray-700 dark:text-gray-300"}`}>{opt}</span>
                      {isCorrect && <FiCheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
                    </div>
                  );
                })}
              </div>
              {q.explanation && (
                <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-900/10 border-t border-blue-100 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300"><span className="font-semibold">Explanation: </span>{q.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end shrink-0">
          <button onClick={onClose} className="px-5 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
}

// ─── Student attempts modal ───────────────────────────────────────
function StudentAttemptsModal({
  isOpen,
  onClose,
  content,
  instituteId,
}: {
  isOpen: boolean;
  onClose: () => void;
  content: ModuleContent | null;
  instituteId: string;
}) {
  const [students, setStudents] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    if (!isOpen || !instituteId) return;
    setLoadingStudents(true);
    instituteService.getInstituteUsers(instituteId, "student")
      .then((users) => {
        const map: Record<string, string> = {};
        for (const u of users) {
          map[u.id] = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || u.id;
        }
        setStudents(map);
      })
      .catch(console.error)
      .finally(() => setLoadingStudents(false));
  }, [isOpen, instituteId]);

  if (!isOpen || !content) return null;

  const attempts = content.studentAttempts || {};
  type ProctoringViolation = { type: string; timestamp: string; detail?: string };
  type QuizAttempt = { score: number; answers: Record<string, number>; attemptedAt: string; violations?: ProctoringViolation[]; attemptCount?: number; type?: never };
  type VoiceAttempt = {
    score: number; type: "voice"; totalScore: number; totalMarks: number; grade: string;
    passed: boolean; overallFeedback: string; attemptedAt: string;
    questionResults: Array<{ questionId: string; question: string; studentAnswer: string; expectedAnswer: string; score: number; marksAvailable: number; percentage: number; feedback: string }>;
  };
  const attemptEntries = Object.entries(attempts) as [string, QuizAttempt | VoiceAttempt][];
  const questions: QuizQuestion[] = content.quizData?.questions ?? [];
  const passingScore = content.quizData?.passingScore ?? 70;
  const isVoiceAssessment = (content.quizData as any)?.assessmentType === "voice";

  const VIOLATION_LABELS: Record<string, string> = {
    tab_switch: "Tab / Window Switch",
    tab_switch_timeout: "Left — Countdown Expired",
    tab_switch_repeated: "Repeated Tab Switch (Auto-fail)",
    screen_share_stopped: "Screen Share Stopped",
    screen_share_ended: "Screen Share Ended",
  };

  const modal = (
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <FiUsers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Student Attempts</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{content.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Summary bar */}
        <div className="flex items-center gap-6 px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 shrink-0 text-sm text-gray-600 dark:text-gray-400">
          <span><span className="font-semibold text-gray-900 dark:text-white">{attemptEntries.length}</span> attempt{attemptEntries.length !== 1 ? "s" : ""}</span>
          <span><span className="font-semibold text-gray-900 dark:text-white">{questions.length}</span> question{questions.length !== 1 ? "s" : ""}</span>
          <span>Pass: <span className="font-semibold text-gray-900 dark:text-white">{passingScore}%</span></span>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-3">
          {loadingStudents && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Loading student names…</p>
          )}
          {attemptEntries.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              <FiUsers className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No students have attempted this quiz yet.</p>
            </div>
          ) : (
            attemptEntries.map(([userId, attempt]) => {
              const name = students[userId] || userId;
              const passed = attempt.score >= passingScore;
              const isOpen = expanded === userId;
              const isVoiceAttempt = isVoiceAssessment || attempt.type === "voice";
              const flagged = !isVoiceAttempt && !!((attempt as QuizAttempt).violations?.length);
              const correctCount = isVoiceAttempt
                ? null
                : questions.filter((q) => (attempt as QuizAttempt).answers?.[q.id] === q.correctAnswer).length;

              return (
                <div key={userId} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Student row */}
                  <button
                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                    onClick={() => setExpanded(isOpen ? null : userId)}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
                      {name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {isVoiceAttempt
                          ? `${(attempt as VoiceAttempt).totalScore}/${(attempt as VoiceAttempt).totalMarks} marks · Grade: ${(attempt as VoiceAttempt).grade}`
                          : `${correctCount}/${questions.length} correct`}
                        {attempt.attemptedAt ? ` · ${new Date(attempt.attemptedAt).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    {flagged && (
                      <span className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
                        <FiAlertTriangle className="w-3 h-3" /> Flagged
                      </span>
                    )}
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      passed
                        ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                    }`}>
                      {passed ? "Passed" : "Failed"} · {attempt.score}%
                    </span>
                    {isOpen ? <FiChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <FiChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                  </button>

                  {/* Per-question breakdown */}
                  {isOpen && (
                    <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-4 py-4 space-y-3">

                      {/* ── Proctoring violations ── */}
                      {flagged && (
                        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/40 border-b border-red-200 dark:border-red-800">
                            <FiShield className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                            <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wide">
                              Proctoring Violations ({(attempt as QuizAttempt).violations!.length})
                            </p>
                          </div>
                          <div className="divide-y divide-red-100 dark:divide-red-900/40">
                            {(attempt as QuizAttempt).violations!.map((v, vi) => (
                              <div key={vi} className="flex items-start gap-3 px-3 py-2">
                                <span className="shrink-0 w-4 h-4 rounded-full bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300 text-[10px] font-bold flex items-center justify-center mt-0.5">
                                  {vi + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                                    {VIOLATION_LABELS[v.type] ?? v.type.replace(/_/g, " ")}
                                  </p>
                                  <p className="text-[10px] text-red-500 dark:text-red-400">
                                    {new Date(v.timestamp).toLocaleString()}
                                    {v.detail ? ` · ${v.detail}` : ""}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {isVoiceAttempt ? (
                        // ── Voice assessment breakdown ──
                        <>
                          {(attempt as VoiceAttempt).overallFeedback && (
                            <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 px-3 py-2 text-xs text-purple-800 dark:text-purple-300">
                              <span className="font-semibold">Overall Feedback: </span>
                              {(attempt as VoiceAttempt).overallFeedback}
                            </div>
                          )}
                          {((attempt as VoiceAttempt).questionResults ?? []).map((qr, qi) => (
                            <div key={qr.questionId} className={`rounded-lg border overflow-hidden ${
                              qr.percentage >= 50 ? "border-green-300 dark:border-green-700" : "border-red-300 dark:border-red-700"
                            }`}>
                              <div className="flex items-start gap-2 px-3 py-2 bg-white dark:bg-gray-900">
                                <span className="shrink-0 w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-center mt-0.5">
                                  {qi + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-900 dark:text-white leading-snug">{qr.question}</p>
                                </div>
                                <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${
                                  qr.percentage >= 50
                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                    : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                }`}>
                                  {qr.score}/{qr.marksAvailable} marks
                                </span>
                              </div>
                              <div className="px-3 py-2 space-y-1.5 bg-gray-50 dark:bg-gray-800/60">
                                <div className="text-xs">
                                  <span className="text-gray-500 dark:text-gray-400">Student said: </span>
                                  <span className="text-gray-800 dark:text-gray-200 italic">&ldquo;{qr.studentAnswer || "—"}&rdquo;</span>
                                </div>
                                <div className="text-xs">
                                  <span className="text-gray-500 dark:text-gray-400">Expected: </span>
                                  <span className="text-gray-700 dark:text-gray-300">{qr.expectedAnswer}</span>
                                </div>
                                {qr.feedback && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 italic">{qr.feedback}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      ) : questions.length === 0 ? (
                        <p className="text-xs text-gray-400">No questions.</p>
                      ) : questions.map((q, qi) => {
                        const studentPick = (attempt as QuizAttempt).answers?.[q.id];
                        const isCorrect = studentPick === q.correctAnswer;
                        const unanswered = studentPick === undefined;

                        return (
                          <div key={q.id} className={`rounded-lg border overflow-hidden ${
                            unanswered ? "border-gray-200 dark:border-gray-700"
                            : isCorrect ? "border-green-300 dark:border-green-700"
                            : "border-red-300 dark:border-red-700"
                          }`}>
                            {/* Question header */}
                            <div className="flex items-start gap-2 px-3 py-2 bg-white dark:bg-gray-900">
                              <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center mt-0.5">
                                {qi + 1}
                              </span>
                              <p className="text-xs font-medium text-gray-900 dark:text-white flex-1 leading-snug">{q.question}</p>
                              {unanswered ? (
                                <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">Skipped</span>
                              ) : isCorrect ? (
                                <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">Correct</span>
                              ) : (
                                <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium">Wrong</span>
                              )}
                            </div>

                            {/* Options */}
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                              {q.options.map((opt, oi) => {
                                const isStudentChoice = studentPick === oi;
                                const isCorrectAnswer = q.correctAnswer === oi;
                                let bg = "bg-white dark:bg-gray-900";
                                let letter = "bg-gray-100 dark:bg-gray-700 text-gray-500";
                                let label: string | null = null;

                                if (isCorrectAnswer && isStudentChoice) {
                                  bg = "bg-green-50 dark:bg-green-900/20";
                                  letter = "bg-green-500 text-white";
                                  label = "✓ Correct";
                                } else if (isCorrectAnswer) {
                                  bg = "bg-green-50 dark:bg-green-900/20";
                                  letter = "bg-green-500 text-white";
                                  label = "Correct answer";
                                } else if (isStudentChoice) {
                                  bg = "bg-red-50 dark:bg-red-900/20";
                                  letter = "bg-red-400 text-white";
                                  label = "Student picked ✗";
                                }

                                return (
                                  <div key={oi} className={`flex items-center gap-2 px-3 py-2 ${bg}`}>
                                    <span className={`shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${letter}`}>
                                      {OPTION_LETTERS[oi]}
                                    </span>
                                    <span className={`text-xs flex-1 ${isCorrectAnswer ? "text-green-800 dark:text-green-300 font-medium" : isStudentChoice ? "text-red-700 dark:text-red-300" : "text-gray-700 dark:text-gray-300"}`}>
                                      {opt}
                                    </span>
                                    {label && (
                                      <span className={`text-xs font-medium shrink-0 ${isCorrectAnswer ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                                        {label}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end shrink-0">
          <button onClick={onClose} className="px-5 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
}

const OPTION_LETTERS_ROW = ["A", "B", "C", "D"];

// ─── Quiz row ─────────────────────────────────────────────────────
function QuizRow({ entry, onView, onViewAttempts, onEdit, onDelete }: { entry: QuizEntry; onView: () => void; onViewAttempts: () => void; onEdit: () => void; onDelete: () => void; instituteId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${entry.content.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    Promise.resolve(onDelete()).finally(() => setDeleting(false));
  };
  const quiz = entry.content.quizData;
  const questions: QuizQuestion[] = quiz?.questions ?? [];
  const qCount = questions.length;

  return (
    <div className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      {/* Row header — click to expand */}
      <div
        className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer group"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center transition-colors ${expanded ? "bg-green-500 text-white" : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"}`}>
          <FiHelpCircle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800 dark:text-white text-sm leading-snug">{entry.content.title}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-500 dark:text-gray-400">{entry.course.name}</span>
            {entry.course.batchNumber && (
              <>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  Batch {entry.course.batchNumber}
                </span>
              </>
            )}
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{entry.module.title}</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <FiHelpCircle className="w-3 h-3" /> {qCount} question{qCount !== 1 ? "s" : ""}
            </span>
            {quiz?.timeLimit && quiz.timeLimit > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <FiClock className="w-3 h-3" /> {quiz.timeLimit} min
              </span>
            )}
            {quiz?.passingScore !== undefined && (
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <FiAward className="w-3 h-3" /> Pass: {quiz.passingScore}%
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {Object.keys(entry.content.studentAttempts || {}).length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewAttempts(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <FiUsers className="w-3.5 h-3.5" />
              {Object.keys(entry.content.studentAttempts || {}).length} student{Object.keys(entry.content.studentAttempts || {}).length !== 1 ? "s" : ""}
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors opacity-0 group-hover:opacity-100"
          >
            <FiEdit2 className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors opacity-0 group-hover:opacity-100"
          >
            <FiEye className="w-3.5 h-3.5" /> View
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-40"
          >
            <FiX className="w-3.5 h-3.5" /> {deleting ? "Deleting…" : "Delete"}
          </button>
          <span className={`transition-transform duration-200 text-gray-400 ${expanded ? "rotate-180" : ""}`}>
            <FiChevronDown className="w-4 h-4" />
          </span>
        </div>
      </div>

      {/* Expanded quiz details */}
      {expanded && (
        <div className="px-5 pb-5 space-y-3 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-700">
          {/* Stats bar */}
          {quiz && (
            <div className="flex items-center gap-5 pt-3 pb-1 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                <FiHelpCircle className="w-3.5 h-3.5 text-green-500" />
                <span className="text-gray-900 dark:text-white font-bold">{qCount}</span> question{qCount !== 1 ? "s" : ""}
              </span>
              {quiz.passingScore !== undefined && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <FiAward className="w-3.5 h-3.5 text-amber-500" />
                  Pass: <span className="text-gray-900 dark:text-white font-bold">{quiz.passingScore}%</span>
                </span>
              )}
              {quiz.timeLimit > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <FiClock className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-gray-900 dark:text-white font-bold">{quiz.timeLimit}</span> min
                </span>
              )}
              {entry.content.description && (
                <p className="w-full text-xs text-gray-500 dark:text-gray-400 italic">{entry.content.description}</p>
              )}
            </div>
          )}

          {/* Questions */}
          {questions.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 py-2">No questions added yet.</p>
          ) : (
            <div className="space-y-2">
              {questions.map((q, qi) => (
                <div key={q.id} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
                  <div className="flex items-start gap-2.5 px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
                      {qi + 1}
                    </span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{q.question}</p>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {q.options.map((opt, oi) => {
                      const correct = oi === q.correctAnswer;
                      return (
                        <div key={oi} className={`flex items-center gap-3 px-4 py-2 ${correct ? "bg-green-50 dark:bg-green-900/20" : "bg-white dark:bg-gray-900"}`}>
                          <span className={`shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${correct ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500"}`}>
                            {OPTION_LETTERS_ROW[oi]}
                          </span>
                          <span className={`text-xs flex-1 ${correct ? "text-green-800 dark:text-green-300 font-medium" : "text-gray-700 dark:text-gray-300"}`}>{opt}</span>
                          {correct && <FiCheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && (
                    <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/10 border-t border-blue-100 dark:border-blue-800">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        <span className="font-semibold">Explanation: </span>{q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Course group accordion ───────────────────────────────────────
function CourseGroup({ course, quizzes, onViewQuiz, onViewAttempts, onEditQuiz, onDeleteQuiz, instituteId }: { course: Course; quizzes: QuizEntry[]; onViewQuiz: (e: QuizEntry) => void; onViewAttempts: (e: QuizEntry) => void; onEditQuiz: (e: QuizEntry) => void; onDeleteQuiz: (e: QuizEntry) => void; instituteId: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors select-none"
        onClick={() => setOpen((p) => !p)}
      >
        <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${open ? "bg-blue-600 text-white" : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"}`}>
          {open ? <FiChevronDown className="w-4 h-4" /> : <FiChevronRight className="w-4 h-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug">{course.name}</h3>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {course.code && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{course.code}</span>
            )}
            {course.batchNumber && (
              <>
                {course.code && <span className="text-gray-300 dark:text-gray-600">·</span>}
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  Batch {course.batchNumber}
                </span>
              </>
            )}
          </div>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 shrink-0">
          {quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""}
        </span>
      </div>
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          {quizzes.map((entry) => (
            <QuizRow
              key={entry.content.id}
              entry={entry}
              instituteId={instituteId}
              onView={() => onViewQuiz(entry)}
              onViewAttempts={() => onViewAttempts(entry)}
              onEdit={() => onEditQuiz(entry)}
              onDelete={() => onDeleteQuiz(entry)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Integrity Monitor ────────────────────────────────────────────
interface FlaggedRecord {
  studentId: string;
  studentName: string;
  assessmentTitle: string;
  courseName: string;
  score: number;
  violations: { type: string; timestamp: string; detail?: string }[];
  attemptedAt: string;
}

const VIOLATION_LABELS_MAP: Record<string, string> = {
  tab_switch: "Tab Switch",
  tab_switch_timeout: "Left (Timeout)",
  tab_switch_repeated: "Repeated Tab Switch",
  screen_share_stopped: "Screen Share Stopped",
  screen_share_ended: "Screen Share Ended",
};

function IntegrityMonitorPanel({
  quizzesByCourse,
  instituteId,
}: {
  quizzesByCourse: { course: Course; quizzes: QuizEntry[] }[];
  instituteId: string;
}) {
  const [students, setStudents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!instituteId) return;
    setLoading(true);
    instituteService.getInstituteUsers(instituteId, "student")
      .then((users) => {
        const map: Record<string, string> = {};
        for (const u of users) map[u.id] = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || u.id;
        setStudents(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [instituteId]);

  // Build list of all flagged attempts across all quizzes
  const flagged: FlaggedRecord[] = [];
  for (const { course, quizzes } of quizzesByCourse) {
    for (const entry of quizzes) {
      const attempts = entry.content.studentAttempts || {};
      for (const [userId, att] of Object.entries(attempts)) {
        const a = att as any;
        if (!a.violations?.length) continue;
        flagged.push({
          studentId: userId,
          studentName: students[userId] || userId,
          assessmentTitle: entry.content.title,
          courseName: course.name,
          score: a.score ?? 0,
          violations: a.violations,
          attemptedAt: a.attemptedAt ?? "",
        });
      }
    }
  }
  // Newest first
  flagged.sort((a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime());

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-5">
          <span className="text-sm text-red-600 dark:text-red-400">Flagged Students</span>
          <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">{loading ? "—" : flagged.length}</p>
        </div>
        <div className="rounded-2xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 p-5">
          <span className="text-sm text-orange-600 dark:text-orange-400">Total Violations</span>
          <p className="mt-1 text-2xl font-bold text-orange-700 dark:text-orange-300">
            {loading ? "—" : flagged.reduce((s, r) => s + r.violations.length, 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">Auto-failed (0%)</span>
          <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">
            {loading ? "—" : flagged.filter((r) => r.score === 0).length}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 h-16" />
          ))}
        </div>
      ) : flagged.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <FiShield className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">No violations detected</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">All proctored assessments are clean.</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-4 px-5 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            <span>Student</span>
            <span>Assessment</span>
            <span>Course</span>
            <span>Violations</span>
            <span>Score</span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {flagged.map((rec, ri) => (
              <details key={ri} className="group">
                <summary className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-4 items-center px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors list-none">
                  {/* Student */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-xs font-bold text-red-700 dark:text-red-300 shrink-0 uppercase">
                      {rec.studentName.charAt(0)}
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{rec.studentName}</p>
                  </div>
                  {/* Assessment */}
                  <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{rec.assessmentTitle}</p>
                  {/* Course */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{rec.courseName}</p>
                  {/* Violations count */}
                  <div className="flex items-center gap-1.5">
                    {[...new Set(rec.violations.map((v) => v.type))].map((type) => (
                      <span key={type} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 whitespace-nowrap">
                        {VIOLATION_LABELS_MAP[type] ?? type.replace(/_/g, " ")}
                      </span>
                    ))}
                    <span className="text-xs text-gray-400">×{rec.violations.length}</span>
                  </div>
                  {/* Score */}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    rec.score === 0
                      ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                  }`}>
                    {rec.score}%
                  </span>
                </summary>

                {/* Violation timeline (expanded) */}
                <div className="px-5 pb-4 pt-1 space-y-2 bg-red-50/60 dark:bg-red-900/10 border-t border-red-100 dark:border-red-900/40">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-red-500 dark:text-red-400 mb-2">
                    Violation Timeline
                  </p>
                  {rec.violations.map((v, vi) => (
                    <div key={vi} className="flex items-start gap-3">
                      <div className="shrink-0 w-5 h-5 rounded-full bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300 text-[10px] font-bold flex items-center justify-center mt-0.5">
                        {vi + 1}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                          {VIOLATION_LABELS_MAP[v.type] ?? v.type.replace(/_/g, " ")}
                        </p>
                        <p className="text-[10px] text-red-400 dark:text-red-500">
                          {new Date(v.timestamp).toLocaleString()}
                          {v.detail ? ` · ${v.detail}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                  {rec.attemptedAt && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 pt-1">
                      Submitted {new Date(rec.attemptedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────
export default function TeacherAssessmentsPage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const [quizzesByCourse, setQuizzesByCourse] = useState<{ course: Course; quizzes: QuizEntry[] }[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"assessments" | "integrity">("assessments");
  const [viewingQuiz, setViewingQuiz] = useState<QuizEntry | null>(null);
  const [viewingAttempts, setViewingAttempts] = useState<QuizEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<EditEntry | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [voiceOpen, setVoiceOpen]   = useState(false);

  useEffect(() => {
    if (!instituteId) return;
    (async () => {
      setLoading(true);
      try {
        const [grouped, courses] = await Promise.all([
          instituteService.getMyTeacherAssessments(instituteId),
          instituteService.getMyTeacherCourses(instituteId),
        ]);
        setQuizzesByCourse(
          grouped.map(({ course, quizzes }) => ({
            course,
            quizzes: quizzes.map((q) => ({ ...q, course })),
          }))
        );
        setAllCourses(courses);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [instituteId]);

  const handleCreated = ({ course, content, moduleTitle }: { course: Course; content: ModuleContent; moduleTitle: string }) => {
    const newEntry: QuizEntry = { content, module: { id: content.moduleId, title: moduleTitle, order: 0 }, course };
    setQuizzesByCourse((prev) => {
      const existing = prev.find((g) => g.course.id === course.id);
      if (existing) {
        return prev.map((g) =>
          g.course.id === course.id ? { ...g, quizzes: [...g.quizzes, newEntry] } : g
        );
      }
      return [...prev, { course, quizzes: [newEntry] }];
    });
  };

  const handleUpdated = (updated: ModuleContent) => {
    setQuizzesByCourse((prev) =>
      prev.map((g) => ({
        ...g,
        quizzes: g.quizzes.map((e) =>
          e.content.id === updated.id ? { ...e, content: updated } : e
        ),
      }))
    );
    // Refresh edit modal entry if it's still open
    setEditingEntry((prev) =>
      prev && prev.content.id === updated.id ? { ...prev, content: updated } : prev
    );
  };

  const handleDelete = async (entry: QuizEntry) => {
    await instituteService.deleteTeacherContent(
      instituteId,
      entry.course.id,
      entry.module.id,
      entry.content.id
    );
    // Remove from local state — integrity monitor data derives from this, so it updates automatically
    setQuizzesByCourse((prev) =>
      prev
        .map((g) => ({ ...g, quizzes: g.quizzes.filter((e) => e.content.id !== entry.content.id) }))
        .filter((g) => g.quizzes.length > 0)
    );
  };

  const totalQuizzes = quizzesByCourse.reduce((s, g) => s + g.quizzes.length, 0);
  const totalQuestions = quizzesByCourse.reduce(
    (s, g) => s + g.quizzes.reduce((qs, e) => qs + (e.content.quizData?.questions?.length ?? 0), 0),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Page header + tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assessments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Quizzes across your assigned courses</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <FiPlus className="w-4 h-4" /> Create Assessment
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden w-fit text-sm font-medium">
        <button
          onClick={() => setActiveTab("assessments")}
          className={`flex items-center gap-2 px-5 py-2.5 transition-colors ${
            activeTab === "assessments"
              ? "bg-blue-600 text-white"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          <FiHelpCircle className="w-4 h-4" /> Assessments
        </button>
        <button
          onClick={() => setActiveTab("integrity")}
          className={`flex items-center gap-2 px-5 py-2.5 border-l border-gray-200 dark:border-gray-700 transition-colors ${
            activeTab === "integrity"
              ? "bg-red-600 text-white"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          <FiShield className="w-4 h-4" />
          Integrity Monitor
          {/* Red dot if any violations exist */}
          {quizzesByCourse.some(({ quizzes }) =>
            quizzes.some((e) =>
              Object.values(e.content.studentAttempts || {}).some((a) => (a as any).violations?.length)
            )
          ) && (
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          )}
        </button>
      </div>

      {activeTab === "assessments" ? (
        <>
          {/* Stat bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-5">
              <span className="text-sm text-gray-500 dark:text-gray-400">Total Quizzes</span>
              <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">{loading ? "—" : totalQuizzes}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-5">
              <span className="text-sm text-gray-500 dark:text-gray-400">Total Questions</span>
              <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">{loading ? "—" : totalQuestions}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-5">
              <span className="text-sm text-gray-500 dark:text-gray-400">Courses with Quizzes</span>
              <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">{loading ? "—" : quizzesByCourse.length}</p>
            </div>
          </div>

          {/* Assessment list */}
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-3">
                  <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-800 rounded" />
                </div>
              ))}
            </div>
          ) : quizzesByCourse.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <FiHelpCircle className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-700 dark:text-gray-300">No quizzes yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">No quiz content has been added to your courses.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {quizzesByCourse.map(({ course, quizzes }) => (
                <CourseGroup
                  key={course.id}
                  course={course}
                  quizzes={quizzes}
                  instituteId={instituteId}
                  onViewQuiz={setViewingQuiz}
                  onViewAttempts={setViewingAttempts}
                  onEditQuiz={(entry) => setEditingEntry(entry as EditEntry)}
                  onDeleteQuiz={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <IntegrityMonitorPanel quizzesByCourse={quizzesByCourse} instituteId={instituteId} />
      )}

      <QuizViewModal
        isOpen={viewingQuiz !== null}
        onClose={() => setViewingQuiz(null)}
        content={viewingQuiz?.content ?? null}
      />

      <StudentAttemptsModal
        isOpen={viewingAttempts !== null}
        onClose={() => setViewingAttempts(null)}
        content={viewingAttempts?.content ?? null}
        instituteId={instituteId}
      />

      <CreateAssessmentModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        instituteId={instituteId}
        courses={allCourses}
      />

      <EditAssessmentModal
        isOpen={editingEntry !== null}
        onClose={() => setEditingEntry(null)}
        onUpdated={handleUpdated}
        entry={editingEntry}
        instituteId={instituteId}
      />

      <VoiceAssessmentModal
        isOpen={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        instituteId={instituteId}
      />
    </div>
  );
}
