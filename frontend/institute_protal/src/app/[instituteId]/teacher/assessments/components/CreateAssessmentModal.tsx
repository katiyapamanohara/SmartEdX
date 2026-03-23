"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Course,
  CourseModule,
  ModuleContent,
  QuizQuestion,
  instituteService,
} from "@/services/instituteService";
import {
  FiX, FiPlus, FiTrash2, FiCheckCircle, FiZap, FiChevronDown, FiChevronUp,
} from "react-icons/fi";

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const newQuestion = (): QuizQuestion => ({
  id: crypto.randomUUID(),
  question: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  explanation: "",
});

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";

// ─── AI Generate Panel ────────────────────────────────────────────
function AIGeneratePanel({ onAddQuestions }: { onAddQuestions: (qs: QuizQuestion[]) => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<QuizQuestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [aiError, setAiError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!file) return;
    setLoading(true);
    setAiError(null);
    setGenerated([]);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("num_questions", String(numQuestions));
      form.append("difficulty", difficulty);
      const res = await fetch(`${API_GATEWAY_URL}/api/ai/quiz/generate`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Generation failed");
      }
      const data = await res.json();
      const qs: QuizQuestion[] = (data.questions as any[]).map((q) => ({
        id: q.id ?? crypto.randomUUID(),
        question: q.question,
        options: q.options as [string, string, string, string],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation ?? "",
      }));
      setGenerated(qs);
      setSelected(new Set(qs.map((q) => q.id)));
    } catch (e: any) {
      setAiError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleAdd = () => {
    onAddQuestions(generated.filter((q) => selected.has(q.id)));
    setGenerated([]);
    setSelected(new Set());
    setFile(null);
    setOpen(false);
  };

  return (
    <div className="border border-dashed border-purple-300 dark:border-purple-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
      >
        <FiZap className="w-4 h-4" />
        Generate with AI
        {open ? <FiChevronUp className="w-4 h-4 ml-auto" /> : <FiChevronDown className="w-4 h-4 ml-auto" />}
      </button>

      {open && (
        <div className="px-4 py-4 space-y-3 bg-white dark:bg-gray-800">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Upload PDF / Document</label>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900/30 dark:file:text-purple-300" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Questions</label>
              <input type="number" min={1} max={20} value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))}
                className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)} className={inputCls}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          <button type="button" onClick={handleGenerate} disabled={!file || loading}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2">
            {loading ? <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Generating…</> : <><FiZap className="w-4 h-4" /> Generate</>}
          </button>
          {aiError && <p className="text-xs text-red-500">{aiError}</p>}
          {generated.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{generated.length} questions generated — select to add:</p>
              {generated.map((q, i) => (
                <div key={q.id} onClick={() => toggleSelect(q.id)}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-xs transition-colors ${selected.has(q.id) ? "border-purple-400 bg-purple-50 dark:bg-purple-900/20" : "border-gray-200 dark:border-gray-700"}`}>
                  <div className="flex items-start gap-2">
                    <FiCheckCircle className={`w-4 h-4 shrink-0 mt-0.5 ${selected.has(q.id) ? "text-purple-500" : "text-gray-300"}`} />
                    <span className="text-gray-800 dark:text-gray-200">{i + 1}. {q.question}</span>
                  </div>
                </div>
              ))}
              <button type="button" onClick={handleAdd} disabled={selected.size === 0}
                className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs rounded-lg transition-colors">
                Add {selected.size} selected question{selected.size !== 1 ? "s" : ""}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Question card ────────────────────────────────────────────────
function QuestionCard({ q, index, onChange, onDelete }: {
  q: QuizQuestion;
  index: number;
  onChange: (patch: Partial<QuizQuestion>) => void;
  onDelete: () => void;
}) {
  const LETTERS = ["A", "B", "C", "D"];
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700/40">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Q{index + 1}</span>
        <input
          value={q.question}
          onChange={(e) => onChange({ question: e.target.value })}
          placeholder="Enter question…"
          className="flex-1 bg-transparent text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 outline-none"
        />
        <button type="button" onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
          <FiTrash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {q.options.map((opt, oi) => {
          const isCorrect = oi === q.correctAnswer;
          return (
            <div key={oi} className={`flex items-center gap-3 px-4 py-2.5 ${isCorrect ? "bg-green-50 dark:bg-green-900/10" : ""}`}>
              <button type="button" onClick={() => onChange({ correctAnswer: oi })}
                className={`shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${isCorrect ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-green-100"}`}>
                {LETTERS[oi]}
              </button>
              <input
                value={opt}
                onChange={(e) => {
                  const opts = [...q.options] as [string, string, string, string];
                  opts[oi] = e.target.value;
                  onChange({ options: opts });
                }}
                placeholder={`Option ${LETTERS[oi]}`}
                className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none"
              />
              {isCorrect && <FiCheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
            </div>
          );
        })}
      </div>
      <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700">
        <input
          value={q.explanation ?? ""}
          onChange={(e) => onChange({ explanation: e.target.value })}
          placeholder="Explanation (optional)…"
          className="w-full bg-transparent text-xs text-gray-500 dark:text-gray-400 placeholder-gray-400 outline-none"
        />
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────
interface CreateAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (entry: { course: Course; content: ModuleContent; moduleTitle: string }) => void;
  instituteId: string;
  courses: Course[];
}

export default function CreateAssessmentModal({
  isOpen, onClose, onCreated, instituteId, courses,
}: CreateAssessmentModalProps) {
  const [courseId, setCourseId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [modules, setModules] = useState<(CourseModule & { contents: any[] })[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [passingScore, setPassingScore] = useState(70);
  const [timeLimit, setTimeLimit] = useState(0);
  const [questions, setQuestions] = useState<QuizQuestion[]>([newQuestion()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCourseId(""); setModuleId(""); setModules([]); setTitle("");
      setDescription(""); setPassingScore(70); setTimeLimit(0);
      setQuestions([newQuestion()]); setError(null);
    }
  }, [isOpen]);

  // Fetch modules when course changes
  useEffect(() => {
    if (!courseId) { setModules([]); setModuleId(""); return; }
    setModulesLoading(true);
    setModuleId("");
    instituteService.getCourseForTeacher(instituteId, courseId)
      .then((data) => setModules((data?.modules ?? []) as any))
      .finally(() => setModulesLoading(false));
  }, [courseId, instituteId]);

  const updateQuestion = (id: string, patch: Partial<QuizQuestion>) =>
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !moduleId || !title.trim()) return;
    const filled = questions.filter((q) => q.question.trim() && q.options.every((o) => o.trim()));
    if (filled.length === 0) { setError("Add at least one complete question."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const content = await instituteService.createTeacherAssessment(instituteId, courseId, moduleId, {
        title: title.trim(),
        description: description.trim() || undefined,
        quizData: { questions: filled, passingScore, timeLimit },
      });
      const course = courses.find((c) => c.id === courseId)!;
      const mod = modules.find((m) => m.id === moduleId);
      onCreated({ course, content, moduleTitle: mod?.title ?? "" });
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Failed to create assessment");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Assessment</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Course + Module */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course <span className="text-red-500">*</span></label>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)} required className={inputCls}>
                <option value="">Select course…</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Module <span className="text-red-500">*</span></label>
              <select value={moduleId} onChange={(e) => setModuleId(e.target.value)} required disabled={!courseId || modulesLoading} className={inputCls}>
                <option value="">{modulesLoading ? "Loading…" : "Select module…"}</option>
                {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
          </div>

          {/* Title + Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quiz Title <span className="text-red-500">*</span></label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Chapter 1 Quiz" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instructions (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              placeholder="Any instructions for students…" className={inputCls + " resize-none"} />
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Passing Score (%)</label>
              <input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time Limit (min, 0 = none)</label>
              <input type="number" min={0} value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} className={inputCls} />
            </div>
          </div>

          {/* AI Generate */}
          <AIGeneratePanel onAddQuestions={(qs) => setQuestions((prev) => [...prev, ...qs])} />

          {/* Questions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Questions ({questions.length})</h3>
              <button type="button" onClick={() => setQuestions((p) => [...p, newQuestion()])}
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                <FiPlus className="w-3.5 h-3.5" /> Add question
              </button>
            </div>
            {questions.map((q, i) => (
              <QuestionCard
                key={q.id}
                q={q}
                index={i}
                onChange={(patch) => updateQuestion(q.id, patch)}
                onDelete={() => setQuestions((prev) => prev.filter((x) => x.id !== q.id))}
              />
            ))}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            form=""
            onClick={handleSubmit as any}
            disabled={submitting || !courseId || !moduleId || !title.trim()}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {submitting ? <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Saving…</> : "Create Assessment"}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
}
