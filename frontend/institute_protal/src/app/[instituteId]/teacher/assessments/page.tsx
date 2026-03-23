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
import {
  FiHelpCircle,
  FiClock,
  FiAward,
  FiEye,
  FiX,
  FiCheckCircle,
  FiChevronDown,
  FiPlus,
  FiChevronRight,
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

// ─── Quiz row ─────────────────────────────────────────────────────
function QuizRow({ entry, onView }: { entry: QuizEntry; onView: () => void }) {
  const quiz = entry.content.quizData;
  const qCount = quiz?.questions?.length ?? 0;
  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700/50 last:border-0 transition-colors group">
      <div className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
        <FiHelpCircle className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 dark:text-white text-sm leading-snug">{entry.content.title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {entry.module.title}
        </p>
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
      <button
        onClick={onView}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors opacity-0 group-hover:opacity-100"
      >
        <FiEye className="w-3.5 h-3.5" /> View
      </button>
    </div>
  );
}

// ─── Course group accordion ───────────────────────────────────────
function CourseGroup({ course, quizzes, onViewQuiz }: { course: Course; quizzes: QuizEntry[]; onViewQuiz: (e: QuizEntry) => void }) {
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
          <p className="text-xs text-gray-500 dark:text-gray-400">{course.code}</p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
          {quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""}
        </span>
      </div>
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          {quizzes.map((entry) => (
            <QuizRow key={entry.content.id} entry={entry} onView={() => onViewQuiz(entry)} />
          ))}
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
  const [viewingQuiz, setViewingQuiz] = useState<QuizEntry | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

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

  const totalQuizzes = quizzesByCourse.reduce((s, g) => s + g.quizzes.length, 0);
  const totalQuestions = quizzesByCourse.reduce(
    (s, g) => s + g.quizzes.reduce((qs, e) => qs + (e.content.quizData?.questions?.length ?? 0), 0),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assessments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Quizzes across your assigned courses</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <FiPlus className="w-4 h-4" /> Create Assessment
        </button>
      </div>

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

      {/* Content */}
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
              onViewQuiz={setViewingQuiz}
            />
          ))}
        </div>
      )}

      <QuizViewModal
        isOpen={viewingQuiz !== null}
        onClose={() => setViewingQuiz(null)}
        content={viewingQuiz?.content ?? null}
      />

      <CreateAssessmentModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        instituteId={instituteId}
        courses={allCourses}
      />
    </div>
  );
}
