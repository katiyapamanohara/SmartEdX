"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  CourseModule,
  ModuleContent,
  ContentType,
  instituteService,
  Course,
  QuizQuestion,
} from "@/services/instituteService";
import {
  FiChevronRight,
  FiChevronDown,
  FiFile,
  FiVideo,
  FiLink,
  FiFileText,
  FiHelpCircle,
  FiExternalLink,
  FiEye,
  FiX,
  FiCheckCircle,
  FiClock,
  FiAward,
} from "react-icons/fi";

// ─── Type config ─────────────────────────────────────────────────
const TYPE_CONFIG: Record<ContentType, { icon: React.ReactNode; label: string; iconBg: string; iconColor: string }> = {
  pdf: { icon: <FiFile className="w-5 h-5" />, label: "PDF", iconBg: "bg-red-100 dark:bg-red-900/30", iconColor: "text-red-600 dark:text-red-400" },
  video: { icon: <FiVideo className="w-5 h-5" />, label: "Video", iconBg: "bg-purple-100 dark:bg-purple-900/30", iconColor: "text-purple-600 dark:text-purple-400" },
  document: { icon: <FiFileText className="w-5 h-5" />, label: "Document", iconBg: "bg-blue-100 dark:bg-blue-900/30", iconColor: "text-blue-600 dark:text-blue-400" },
  quiz: { icon: <FiHelpCircle className="w-5 h-5" />, label: "Quiz", iconBg: "bg-green-100 dark:bg-green-900/30", iconColor: "text-green-600 dark:text-green-400" },
  link: { icon: <FiLink className="w-5 h-5" />, label: "Link", iconBg: "bg-amber-100 dark:bg-amber-900/30", iconColor: "text-amber-600 dark:text-amber-400" },
};

// ─── Quiz view modal ──────────────────────────────────────────────
const OPTION_LETTERS = ["A", "B", "C", "D"];

function QuizViewModal({ isOpen, onClose, content }: { isOpen: boolean; onClose: () => void; content: ModuleContent | null }) {
  if (!isOpen || !content) return null;
  const quiz = content.quizData;
  const questions: QuizQuestion[] = quiz?.questions ?? [];

  const modal = (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              <FiHelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{content.title}</h2>
              {content.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{content.description}</p>}
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
          <button onClick={onClose} className="px-5 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-medium">Close</button>
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
}

// ─── Content row (read-only) ──────────────────────────────────────
function ContentRow({ content, onViewQuiz }: { content: ModuleContent; onViewQuiz: (c: ModuleContent) => void }) {
  const cfg = TYPE_CONFIG[content.type] ?? TYPE_CONFIG.document;
  return (
    <div className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700/50 last:border-0 transition-colors group">
      <div className={`mt-0.5 w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center ${cfg.iconBg} ${cfg.iconColor}`}>
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        {content.url ? (
          <a href={content.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 dark:text-blue-400 hover:underline text-sm leading-snug flex items-center gap-1.5">
            {content.title}
            <FiExternalLink className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
          </a>
        ) : (
          <p className="font-medium text-gray-800 dark:text-gray-200 text-sm leading-snug">{content.title}</p>
        )}
        {content.description && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{content.description}</p>
        )}
        <span className="mt-1 inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">{cfg.label}</span>
      </div>
      {content.type === "quiz" ? (
        <button
          onClick={() => onViewQuiz(content)}
          className="flex-shrink-0 hidden group-hover:flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors mt-0.5"
        >
          <FiEye className="w-3.5 h-3.5" /> View
        </button>
      ) : content.url ? (
        <a href={content.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 hidden group-hover:flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mt-0.5">
          Open
        </a>
      ) : null}
    </div>
  );
}

// ─── Module accordion (read-only) ────────────────────────────────
function ModuleAccordion({ module, instituteId, courseId, forceOpen, onViewQuiz }: {
  module: CourseModule;
  instituteId: string;
  courseId: string;
  forceOpen: boolean;
  onViewQuiz: (c: ModuleContent) => void;
}) {
  const [open, setOpen] = useState(forceOpen);
  const [contents, setContents] = useState<ModuleContent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (forceOpen && !loaded) {
      setLoading(true);
      instituteService.getModuleContents(instituteId, courseId, module.id)
        .then((data) => { setContents(data); setLoaded(true); })
        .finally(() => setLoading(false));
    }
    setOpen(forceOpen);
  }, [forceOpen]);

  const toggle = async () => {
    if (!loaded && !open) {
      setLoading(true);
      const data = await instituteService.getModuleContents(instituteId, courseId, module.id);
      setContents(data);
      setLoaded(true);
      setLoading(false);
    }
    setOpen((p) => !p);
  };

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${open ? "border-blue-300 dark:border-blue-700 shadow-md" : "border-gray-200 dark:border-gray-700 shadow-sm"} bg-white dark:bg-gray-800`}>
      <div className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors select-none" onClick={toggle}>
        <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${open ? "bg-blue-600 text-white" : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"}`}>
          {open ? <FiChevronDown className="w-4 h-4" /> : <FiChevronRight className="w-4 h-4" />}
        </span>
        <h2 className="flex-1 font-bold text-gray-900 dark:text-white text-base leading-snug">{module.title}</h2>
      </div>
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          {module.description && (
            <p className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400 italic border-b border-gray-100 dark:border-gray-700">{module.description}</p>
          )}
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2" />
              Loading contents…
            </div>
          ) : contents.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">No content added yet.</div>
          ) : (
            <div>{contents.map((c) => <ContentRow key={c.id} content={c} onViewQuiz={onViewQuiz} />)}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────
export default function TeacherModulesPage() {
  const params = useParams();
  const router = useRouter();
  const instituteId = params?.instituteId as string;
  const courseId = params?.courseId as string;

  const [modules, setModules] = useState<CourseModule[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allExpanded, setAllExpanded] = useState(false);
  const [viewingQuiz, setViewingQuiz] = useState<ModuleContent | null>(null);

  useEffect(() => {
    if (!instituteId || !courseId) return;
    (async () => {
      setIsLoading(true);
      try {
        const [myCourses, mods] = await Promise.all([
          instituteService.getMyTeacherCourses(instituteId),
          instituteService.getCourseModules(instituteId, courseId),
        ]);
        const matched = myCourses.find((c) => c.id === courseId);
        if (matched) setCourse(matched);
        setModules(mods);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [instituteId, courseId]);

  return (
    <div className="flex flex-col gap-0 max-w-3xl mx-auto pb-16">
      {/* Top nav */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 mb-5">
        <button className="px-1 py-3 text-sm font-semibold text-gray-900 dark:text-white border-b-2 border-blue-600 mr-6">
          Course
        </button>
        <button
          onClick={() => router.push(`/${instituteId}/teacher/courses`)}
          className="px-1 py-3 text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
        >
          ← Back to My Courses
        </button>
      </div>

      {/* Course banner */}
      {course?.coverImage ? (
        <img src={course.coverImage} alt={course.name ?? ""} className="w-full h-48 object-cover rounded-2xl shadow mb-6" />
      ) : (
        <div className="w-full h-48 rounded-2xl bg-linear-to-br from-violet-600 via-purple-400 to-blue-300 shadow mb-6" />
      )}

      {course && (
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{course.name}</h1>
          {course.code && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Code: {course.code}</p>}
          {course.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{course.description}</p>}
        </div>
      )}

      {/* Expand/Collapse toolbar */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setAllExpanded((p) => !p)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
        <span className="text-xs text-gray-400 dark:text-gray-500">{modules.length} module{modules.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Module list */}
      {isLoading ? (
        <div className="py-16 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-3 text-sm text-gray-500">Loading…</p>
        </div>
      ) : modules.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500">No modules have been added to this course yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {modules.map((mod) => (
            <ModuleAccordion
              key={mod.id}
              module={mod}
              instituteId={instituteId}
              courseId={courseId}
              forceOpen={allExpanded}
              onViewQuiz={setViewingQuiz}
            />
          ))}
        </div>
      )}

      <QuizViewModal
        isOpen={viewingQuiz !== null}
        onClose={() => setViewingQuiz(null)}
        content={viewingQuiz}
      />
    </div>
  );
}
