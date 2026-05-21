"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { examService, Exam, ExamQuestion, ExamAttempt, CreateExamPayload, ExamStatus, QuestionType } from "@/services/examService";
import { aiService } from "@/services/aiService";
import { instituteService, Course } from "@/services/instituteService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: ExamStatus) {
  const map: Record<ExamStatus, string> = {
    draft: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
    scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    active: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    completed: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status]}`}>
      {status}
    </span>
  );
}

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function blankMCQ(): ExamQuestion {
  return { id: crypto.randomUUID(), type: "mcq", question: "", options: ["", "", "", ""], correctAnswer: 0, marks: 1 };
}
function blankEssay(): ExamQuestion {
  return { id: crypto.randomUUID(), type: "essay", question: "", marks: 5 };
}

// ─── Question Builder ─────────────────────────────────────────────────────────

function QuestionBuilder({
  questions,
  onChange,
}: {
  questions: ExamQuestion[];
  onChange: (qs: ExamQuestion[]) => void;
}) {
  const update = (i: number, patch: Partial<ExamQuestion>) => {
    const next = [...questions];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const updateOption = (qi: number, oi: number, val: string) => {
    const opts = [...(questions[qi].options ?? ["", "", "", ""])] as [string, string, string, string];
    opts[oi] = val;
    update(qi, { options: opts });
  };
  const remove = (i: number) => onChange(questions.filter((_, idx) => idx !== i));
  const changeType = (i: number, type: QuestionType) => {
    if (type === "mcq") {
      update(i, { type: "mcq", options: ["", "", "", ""], correctAnswer: 0, sampleAnswer: undefined });
    } else {
      update(i, { type: "essay", options: undefined, correctAnswer: undefined, sampleAnswer: "" });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {questions.map((q, qi) => (
        <div key={q.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-white/5">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Q{qi + 1}</span>
              <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                {(["mcq", "essay"] as QuestionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => changeType(qi, t)}
                    className={`px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      q.type === t
                        ? "bg-brand-500 text-white"
                        : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => remove(qi)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
          </div>

          <textarea
            value={q.question}
            onChange={(e) => update(qi, { question: e.target.value })}
            placeholder="Question text…"
            rows={2}
            className="w-full mb-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white placeholder-gray-400 outline-none focus:border-brand-400 resize-none"
          />

          {q.type === "mcq" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              {(q.options ?? ["", "", "", ""]).map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    checked={q.correctAnswer === oi}
                    onChange={() => update(qi, { correctAnswer: oi })}
                    className="accent-brand-500"
                  />
                  <input
                    value={opt}
                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                    className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 outline-none focus:border-brand-400"
                  />
                </div>
              ))}
            </div>
          )}

          {q.type === "essay" && (
            <div className="mb-3">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sample Answer (visible to teacher only)</label>
              <textarea
                value={q.sampleAnswer ?? ""}
                onChange={(e) => update(qi, { sampleAnswer: e.target.value })}
                placeholder="Model answer for grading reference…"
                rows={2}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white placeholder-gray-400 outline-none focus:border-brand-400 resize-none"
              />
            </div>
          )}

          <div className="flex items-center gap-4">
            <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              Marks:
              <input
                type="number"
                min={1}
                value={q.marks}
                onChange={(e) => update(qi, { marks: Number(e.target.value) })}
                className="w-14 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-0.5 text-sm text-gray-800 dark:text-white outline-none"
              />
            </label>
            {q.type === "mcq" && (
              <label className="text-xs text-gray-500 dark:text-gray-400 flex-1 flex items-center gap-1.5">
                Explanation:
                <input
                  value={q.explanation ?? ""}
                  onChange={(e) => update(qi, { explanation: e.target.value })}
                  placeholder="e.g. Because…"
                  className="flex-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-0.5 text-sm text-gray-800 dark:text-white outline-none"
                />
              </label>
            )}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3 mt-1">
        <button
          type="button"
          onClick={() => onChange([...questions, blankMCQ()])}
          className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-600 font-medium"
        >
          <span className="text-lg leading-none">+</span> Add MCQ
        </button>
        <button
          type="button"
          onClick={() => onChange([...questions, blankEssay()])}
          className="flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-600 font-medium"
        >
          <span className="text-lg leading-none">+</span> Add Essay
        </button>
      </div>
    </div>
  );
}

// ─── AI Question Generator ─────────────────────────────────────────────────────

function AIQuestionGenerator({ onImport }: { onImport: (qs: ExamQuestion[]) => void }) {
  const [inputType, setInputType] = useState<"text" | "file">("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [questionType, setQuestionType] = useState<"mcq" | "essay" | "both">("mcq");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState<(ExamQuestion & { selected: boolean })[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const generate = async () => {
    setError("");
    setGenerated([]);
    if (inputType === "text" && text.trim().length < 20) {
      return setError("Please enter at least 20 characters of content.");
    }
    if (inputType === "file" && !file) {
      return setError("Please select a PDF or DOCX file.");
    }
    setLoading(true);
    try {
      let qs: ExamQuestion[] | null = null;
      if (inputType === "text") {
        qs = await aiService.generateQuestionsFromText({ text, num_questions: numQuestions, difficulty, question_type: questionType });
      } else {
        qs = await aiService.generateQuestionsFromFile({ file: file!, num_questions: numQuestions, difficulty, question_type: questionType });
      }
      if (!qs || qs.length === 0) {
        setError("AI did not return any questions. Try again.");
      } else {
        setGenerated(qs.map((q) => ({ ...q, selected: true })));
      }
    } catch {
      setError("Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (i: number) => {
    setGenerated((prev) => prev.map((q, idx) => idx === i ? { ...q, selected: !q.selected } : q));
  };

  const importSelected = () => {
    const toImport = generated.filter((q) => q.selected).map(({ selected: _, ...q }) => q);
    if (toImport.length === 0) return;
    onImport(toImport);
    setGenerated([]);
    setText("");
    setFile(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Input type selector */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 w-fit">
        {(["text", "file"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setInputType(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              inputType === t
                ? "bg-brand-500 text-white"
                : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {t === "text" ? "Text / Description" : "Upload File (PDF/DOCX)"}
          </button>
        ))}
      </div>

      {/* Input */}
      {inputType === "text" ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste course content, chapter text, or describe what you want to test…"
          rows={5}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-800 dark:text-white placeholder-gray-400 outline-none focus:border-brand-400 resize-none"
        />
      ) : (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.doc,.pptx,.ppt"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 px-4 py-6 text-sm text-gray-500 dark:text-gray-400 hover:border-brand-400 hover:text-brand-500 transition-colors text-center"
          >
            {file ? (
              <span className="font-medium text-gray-700 dark:text-gray-300">{file.name}</span>
            ) : (
              "Click to select PDF, DOCX, or PPTX"
            )}
          </button>
        </div>
      )}

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Question Type</label>
          <select
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value as typeof questionType)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:border-brand-400"
          >
            <option value="mcq">MCQ Only</option>
            <option value="essay">Essay Only</option>
            <option value="both">Both (Mixed)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:border-brand-400"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">No. of Questions</label>
          <input
            type="number"
            min={1}
            max={20}
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:border-brand-400"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-60 transition-colors"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Generating…
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Generate with AI
          </>
        )}
      </button>

      {/* Generated preview */}
      {generated.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {generated.length} questions generated — select which to import:
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setGenerated((p) => p.map((q) => ({ ...q, selected: true })))} className="text-xs text-brand-500 hover:underline">All</button>
              <button type="button" onClick={() => setGenerated((p) => p.map((q) => ({ ...q, selected: false })))} className="text-xs text-gray-400 hover:underline">None</button>
            </div>
          </div>
          <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1">
            {generated.map((q, i) => (
              <div
                key={q.id}
                onClick={() => toggleSelect(i)}
                className={`rounded-xl border p-3 cursor-pointer transition-colors ${
                  q.selected
                    ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-60"
                }`}
              >
                <div className="flex items-start gap-2">
                  <input type="checkbox" checked={q.selected} onChange={() => toggleSelect(i)} onClick={(e) => e.stopPropagation()} className="mt-0.5 accent-brand-500" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${q.type === "essay" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"}`}>
                        {q.type.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-white">{q.question}</p>
                    {q.type === "mcq" && q.options && (
                      <ul className="mt-1.5 space-y-0.5">
                        {q.options.map((o, oi) => (
                          <li key={oi} className={`text-xs ${oi === q.correctAnswer ? "text-green-600 dark:text-green-400 font-semibold" : "text-gray-500 dark:text-gray-400"}`}>
                            {String.fromCharCode(65 + oi)}. {o} {oi === q.correctAnswer ? "✓" : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                    {q.type === "essay" && q.sampleAnswer && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">Sample: {q.sampleAnswer}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={importSelected}
            className="mt-3 w-full px-4 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors"
          >
            Import {generated.filter((q) => q.selected).length} Selected Question{generated.filter((q) => q.selected).length !== 1 ? "s" : ""}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Create / Edit Modal ───────────────────────────────────────────────────────

interface ExamModalProps {
  courses: Course[];
  initial?: Exam;
  onSave: (payload: CreateExamPayload & { status?: ExamStatus }) => Promise<void>;
  onClose: () => void;
}

function ExamModal({ courses, initial, onSave, onClose }: ExamModalProps) {
  const [tab, setTab] = useState<"details" | "ai" | "questions">("details");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [courseId, setCourseId] = useState(initial?.courseId ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    initial?.scheduledAt ? new Date(initial.scheduledAt).toISOString().slice(0, 16) : ""
  );
  const [durationMinutes, setDurationMinutes] = useState(initial?.durationMinutes ?? 60);
  const [passingScore, setPassingScore] = useState(initial?.passingScore ?? 50);
  const [questions, setQuestions] = useState<ExamQuestion[]>(initial?.questions ?? []);
  const [requireScreenShare, setRequireScreenShare] = useState(initial?.requireScreenShare ?? false);
  const [autoFailOnCheat, setAutoFailOnCheat] = useState(initial?.autoFailOnCheat ?? false);
  const [maxAttempts, setMaxAttempts] = useState(initial?.maxAttempts ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);

  const handleImportAI = (qs: ExamQuestion[]) => {
    setQuestions((prev) => [...prev, ...qs]);
    setTab("questions");
  };

  const handleSubmit = async (publish: boolean) => {
    // Validate details
    if (!title.trim()) {
      setTab("details");
      setError("Title is required");
      return;
    }
    if (!courseId) {
      setTab("details");
      setError("Select a course");
      return;
    }
    // Validate questions
    if (questions.length === 0) {
      setTab("questions");
      setError(publish ? "Add at least one question before publishing" : "Add at least one question");
      return;
    }
    for (const q of questions) {
      if (!q.question.trim()) {
        setTab("questions");
        setError("All questions must have text");
        return;
      }
      if (q.type === "mcq" && (q.options ?? []).some((o) => !o.trim())) {
        setTab("questions");
        setError("All MCQ options must be filled");
        return;
      }
    }
    setError("");
    setSaving(true);

    // Determine status:
    // - Publish + scheduledAt  → "scheduled"
    // - Publish + no date      → "active" (publish immediately)
    // - Save as Draft          → no status override (keeps current or default "draft")
    const statusOverride: { status?: ExamStatus } = publish
      ? { status: scheduledAt ? "scheduled" : "active" }
      : {};

    await onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      instructions: instructions.trim() || undefined,
      courseId,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      durationMinutes,
      passingScore,
      requireScreenShare,
      autoFailOnCheat,
      maxAttempts,
      questions,
      ...statusOverride,
    });
    setSaving(false);
  };

  const tabs = [
    { id: "details" as const, label: "Details" },
    { id: "ai" as const, label: "AI Generate" },
    { id: "questions" as const, label: `Questions (${questions.length})` },
  ];

  return (
    <div className="fixed inset-0 z-999999 flex flex-col justify-end sm:justify-center sm:items-center bg-black/50 backdrop-blur-sm sm:p-4">
      <div className="w-full sm:max-w-2xl bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {initial ? "Edit Exam" : "Create Exam"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 px-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Validation error — always visible regardless of active tab */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-red-500 shrink-0">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
          </div>
        )}

        <div className="px-4 sm:px-6 py-5 flex-1 overflow-y-auto">

          {/* ── Details Tab ──────────────────────────────────────────────── */}
          <div className={`flex flex-col gap-4 ${tab !== "details" ? "hidden" : ""}`}>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:border-brand-400"
                placeholder="Midterm Examination" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Assign to Course *</label>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:border-brand-400">
                <option value="">Select course…</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name} {c.batchNumber ? `(${c.batchNumber})` : ""}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Scheduled Date & Time</label>
                <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:border-brand-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Duration (minutes)</label>
                <input type="number" min={5} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:border-brand-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Passing Score (%)</label>
              <input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))}
                className="w-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:border-brand-400 resize-none"
                placeholder="Optional description…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Student Instructions</label>
              <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:border-brand-400 resize-none"
                placeholder="e.g. Read each question carefully before answering." />
            </div>

            {/* Max Attempts */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 text-gray-500 dark:text-gray-400 font-bold text-sm">#</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Max Attempts</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">How many times a student can attempt this exam</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => setMaxAttempts((p) => Math.max(1, p - 1))}
                  className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold text-lg leading-none">−</button>
                <span className="w-6 text-center text-sm font-bold text-gray-900 dark:text-white">{maxAttempts}</span>
                <button type="button" onClick={() => setMaxAttempts((p) => Math.min(10, p + 1))}
                  className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold text-lg leading-none">+</button>
              </div>
            </div>

            {/* Proctoring toggles */}
            {(
              [
                {
                  value: requireScreenShare, set: setRequireScreenShare,
                  label: "Require Screen Share",
                  desc: "Students must share their screen during the entire exam — exits are flagged",
                  icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 15V5.25A2.25 2.25 0 0 1 3.75 3h16.5A2.25 2.25 0 0 1 21 5.25Z" />,
                },
                {
                  value: autoFailOnCheat, set: setAutoFailOnCheat,
                  label: "Auto-Fail on Cheating",
                  desc: "Automatically fail and expel a student after 3 high-severity violations",
                  icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />,
                },
              ] as const
            ).map(({ value, set, label, desc, icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => (set as React.Dispatch<React.SetStateAction<boolean>>)((p) => !p)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                  value
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${value ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400"}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>{icon}</svg>
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${value ? "text-brand-700 dark:text-brand-300" : "text-gray-700 dark:text-gray-300"}`}>{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                </div>
                <div className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${value ? "bg-brand-500" : "bg-gray-200 dark:bg-gray-700"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-1"}`} />
                </div>
              </button>
            ))}
          </div>

          {/* ── AI Generate Tab — always mounted so generated results survive tab switches ── */}
          <div className={tab !== "ai" ? "hidden" : ""}>
            <AIQuestionGenerator onImport={handleImportAI} />
          </div>

          {/* ── Questions Tab ─────────────────────────────────────────────── */}
          <div className={tab !== "questions" ? "hidden" : ""}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {questions.length} question{questions.length !== 1 ? "s" : ""} · Total marks: {totalMarks}
              </span>
            </div>
            <QuestionBuilder questions={questions} onChange={setQuestions} />
          </div>

        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button onClick={onClose} className="px-4 py-2.5 sm:py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
          <button onClick={() => handleSubmit(false)} disabled={saving}
            className="px-4 py-2.5 sm:py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50">
            Save as Draft
          </button>
          <button onClick={() => handleSubmit(true)} disabled={saving}
            className="px-4 py-2.5 sm:py-2 text-sm rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 font-semibold">
            {saving ? "Saving…" : scheduledAt ? "Publish & Schedule" : "Publish Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Integrity Monitor Modal ──────────────────────────────────────────────────

type FlagRow = {
  flagId: string;
  examId: string;
  examTitle: string;
  userId: string;
  studentName: string;
  type: string;
  severity: string;
  timestamp: string;
  reviewed: boolean;
  detail?: string;
};

const VIOLATION_LABELS: Record<string, string> = {
  tab_switch: "Tab / Window Switch",
  face_absent: "Face Not Visible",
  multiple_faces: "Multiple Faces Detected",
  face_verify_failed: "Face Verification Failed",
  live_face_mismatch: "Face Mismatch (Live)",
  camera_disabled: "Camera Disabled",
  fullscreen_exit: "Exited Fullscreen",
  screen_share_disabled: "Screen Share Stopped",
  suspicious_screen: "Suspicious Screen Content",
  copy_attempt: "Copy / Paste Attempt",
};

const SEVERITY_CFG: Record<string, { label: string; cls: string; dot: string; ring: string }> = {
  high: {
    label: "High",
    cls: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
    dot: "bg-red-500",
    ring: "ring-red-200 dark:ring-red-800",
  },
  medium: {
    label: "Medium",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    dot: "bg-amber-500",
    ring: "ring-amber-200 dark:ring-amber-800",
  },
  low: {
    label: "Low",
    cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
    dot: "bg-blue-500",
    ring: "ring-blue-200 dark:ring-blue-800",
  },
};

function vlabel(type: string) {
  return VIOLATION_LABELS[type] ?? type.replace(/_/g, " ");
}

function fmtTs(ts: string) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return ts; }
}

interface IntegrityMonitorModalProps {
  exam: Exam;
  flags: FlagRow[];
  instituteId: string;
  onClose: () => void;
  onFlagReviewed: (flagId: string) => void;
}

function IntegrityMonitorModal({ exam, flags, instituteId, onClose, onFlagReviewed }: IntegrityMonitorModalProps) {
  const [tab, setTab] = useState<"students" | "violations">("students");
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [localFlags, setLocalFlags] = useState<FlagRow[]>(flags);

  // Keep in sync if parent re-passes flags (e.g. after refresh)
  useEffect(() => { setLocalFlags(flags); }, [flags]);

  // Group flags per student
  type StudentRow = {
    userId: string;
    name: string;
    flags: FlagRow[];
    highCount: number;
    mediumCount: number;
    lowCount: number;
    autoFailed: boolean;
    attempt?: { score: number; totalMarks: number; passed: boolean; pendingEssayReview?: boolean };
  };

  type AttemptEntry = ExamAttempt & { attemptCount?: number; autoFailed?: boolean };
  const attemptsMap = (exam.studentAttempts ?? {}) as Record<string, AttemptEntry>;

  const studentMap = localFlags.reduce<Record<string, StudentRow>>((acc, f) => {
    if (!acc[f.userId]) {
      const att: AttemptEntry | undefined = attemptsMap[f.userId];
      acc[f.userId] = {
        userId: f.userId,
        name: f.studentName,
        flags: [],
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        autoFailed: att?.autoFailed ?? false,
        attempt: att ? { score: att.score, totalMarks: att.totalMarks, passed: att.passed, pendingEssayReview: att.pendingEssayReview } : undefined,
      };
    }
    acc[f.userId].flags.push(f);
    if (f.severity === "high") acc[f.userId].highCount++;
    else if (f.severity === "medium") acc[f.userId].mediumCount++;
    else acc[f.userId].lowCount++;
    return acc;
  }, {});

  const students = Object.values(studentMap).sort((a, b) => b.highCount - a.highCount);

  // Summary stats
  const totalFlags = localFlags.length;
  const uniqueStudents = students.length;
  const highFlags = localFlags.filter((f) => f.severity === "high").length;
  const autoFailedCount = students.filter((s) => s.autoFailed).length;
  const pendingReview = localFlags.filter((f) => !f.reviewed).length;

  const handleReview = async (flag: FlagRow) => {
    if (flag.reviewed || reviewingId) return;
    setReviewingId(flag.flagId);
    const ok = await examService.markFlagReviewed(instituteId, flag.examId, flag.flagId, flag.userId);
    if (ok) {
      setLocalFlags((prev) => prev.map((f) => f.flagId === flag.flagId ? { ...f, reviewed: true } : f));
      onFlagReviewed(flag.flagId);
    }
    setReviewingId(null);
  };

  const markAllReviewed = async () => {
    const unreviewed = localFlags.filter((f) => !f.reviewed);
    for (const f of unreviewed) {
      await examService.markFlagReviewed(instituteId, f.examId, f.flagId, f.userId);
    }
    setLocalFlags((prev) => prev.map((f) => ({ ...f, reviewed: true })));
    unreviewed.forEach((f) => onFlagReviewed(f.flagId));
  };

  return (
    <div className="fixed inset-0 z-99999 flex flex-col justify-end sm:justify-center sm:items-center bg-black/60 backdrop-blur-sm sm:p-4">
      <div className="w-full sm:max-w-3xl bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden">

        {/* ── Drag handle (mobile only) ── */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-red-600 dark:text-red-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Integrity Monitor</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[220px] sm:max-w-xs">{exam.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none shrink-0 mt-0.5 p-1">&times;</button>
        </div>

        {/* ── Summary stats ── */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          {[
            { label: "Total Flags", value: totalFlags, color: "text-gray-800 dark:text-white" },
            { label: "Flagged Students", value: uniqueStudents, color: "text-amber-600 dark:text-amber-400" },
            { label: "High Severity", value: highFlags, color: "text-red-600 dark:text-red-400" },
            { label: "Auto-Failed", value: autoFailedCount, color: "text-red-700 dark:text-red-300 font-bold" },
            { label: "Pending Review", value: pendingReview, color: "text-brand-600 dark:text-brand-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-gray-50 dark:bg-white/5 p-2 sm:p-3 text-center">
              <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide leading-tight">{s.label}</p>
              <p className={`text-xl sm:text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-3 sm:pt-4 pb-0 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex gap-0.5 sm:gap-1 overflow-x-auto">
            {(["students", "violations"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  tab === t
                    ? "border-red-500 text-red-600 dark:text-red-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {t === "students" ? `Students (${uniqueStudents})` : `Violations (${totalFlags})`}
              </button>
            ))}
          </div>
          {pendingReview > 0 && (
            <button
              onClick={markAllReviewed}
              className="text-xs text-brand-500 hover:text-brand-600 font-medium mb-1 ml-2 shrink-0"
            >
              Mark all
            </button>
          )}
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5 flex-1 overflow-y-auto">

          {/* ── Students Tab ── */}
          {tab === "students" && (
            <div className="flex flex-col gap-3">
              {students.length === 0 && (
                <div className="py-16 text-center text-sm text-gray-400">
                  <svg className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                  No integrity violations recorded for this exam.
                </div>
              )}
              {students.map((s) => {
                const isOpen = expandedStudent === s.userId;
                const pct = s.attempt && s.attempt.totalMarks > 0
                  ? Math.round((s.attempt.score / s.attempt.totalMarks) * 100)
                  : null;
                const riskLevel = s.highCount >= 3 ? "high" : s.highCount >= 1 ? "medium" : "low";
                const riskCfg = SEVERITY_CFG[riskLevel];

                return (
                  <div
                    key={s.userId}
                    className={`rounded-xl border ring-1 overflow-hidden transition-all ${
                      s.autoFailed
                        ? "border-red-200 dark:border-red-800 ring-red-100 dark:ring-red-900/30 bg-red-50/50 dark:bg-red-900/10"
                        : `border-gray-200 dark:border-gray-700 ${riskCfg.ring} bg-white dark:bg-white/3`
                    }`}
                  >
                    {/* Student header row */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                        s.autoFailed ? "bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      }`}>
                        {s.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-gray-900 dark:text-white">{s.name}</span>
                          {s.autoFailed && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-600 text-white shrink-0">AUTO-FAILED</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-400 font-mono">{s.userId.slice(0, 10)}…</span>
                          {/* Severity counts */}
                          <div className="flex items-center gap-1.5">
                            {s.highCount > 0 && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400">
                                {s.highCount} high
                              </span>
                            )}
                            {s.mediumCount > 0 && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                                {s.mediumCount} med
                              </span>
                            )}
                            {s.lowCount > 0 && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                                {s.lowCount} low
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Score + attempt result */}
                      {s.attempt && (
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-gray-800 dark:text-white">
                            {s.attempt.score}/{s.attempt.totalMarks}
                            {pct !== null && <span className="text-xs font-normal text-gray-500 ml-1">({pct}%)</span>}
                          </p>
                          {s.autoFailed ? (
                            <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold">Cheating</span>
                          ) : s.attempt.pendingEssayReview ? (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400">Pending review</span>
                          ) : (
                            <span className={`text-[10px] font-semibold ${s.attempt.passed ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                              {s.attempt.passed ? "Passed" : "Failed"}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Expand toggle */}
                      <button
                        onClick={() => setExpandedStudent(isOpen ? null : s.userId)}
                        className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0 transition-transform"
                      >
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                    </div>

                    {/* Expanded violation list */}
                    {isOpen && (
                      <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 bg-gray-50/70 dark:bg-white/2">
                        <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 mb-2">
                          Violation Log — {s.flags.length} event{s.flags.length !== 1 ? "s" : ""}
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {s.flags
                            .slice()
                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                            .map((f) => {
                              const sev = SEVERITY_CFG[f.severity] ?? SEVERITY_CFG.medium;
                              return (
                                <div key={f.flagId} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${f.reviewed ? "opacity-50" : "bg-white dark:bg-white/5"} border border-gray-100 dark:border-gray-700`}>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${sev.cls}`}>
                                    {sev.label.toUpperCase()}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{vlabel(f.type)}</p>
                                    {f.detail && (
                                      <p className="text-[10px] text-gray-400 truncate" title={f.detail}>{f.detail}</p>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">{fmtTs(f.timestamp)}</span>
                                  {f.reviewed ? (
                                    <span className="text-[10px] text-green-500 font-semibold shrink-0">✓</span>
                                  ) : (
                                    <button
                                      onClick={() => handleReview(f)}
                                      disabled={reviewingId === f.flagId}
                                      className="text-[10px] text-brand-500 hover:text-brand-600 font-semibold shrink-0 disabled:opacity-40"
                                    >
                                      {reviewingId === f.flagId ? "…" : "Review"}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── All Violations Tab ── */}
          {tab === "violations" && (
            <div>
              {localFlags.length === 0 ? (
                <p className="py-16 text-center text-sm text-gray-400">No violation records.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-100 dark:border-gray-700">
                      <tr className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        <th className="text-left py-2 pr-3">Student</th>
                        <th className="text-left py-2 pr-3">Violation</th>
                        <th className="text-left py-2 pr-3 hidden sm:table-cell">Detail</th>
                        <th className="text-left py-2 pr-3">Severity</th>
                        <th className="text-left py-2 pr-3">Time</th>
                        <th className="text-right py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {localFlags
                        .slice()
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .map((f) => {
                          const sev = SEVERITY_CFG[f.severity] ?? SEVERITY_CFG.medium;
                          return (
                            <tr key={f.flagId} className={`hover:bg-gray-50 dark:hover:bg-white/2 transition-colors ${f.reviewed ? "opacity-50" : ""}`}>
                              <td className="py-2 pr-3">
                                <p className="font-medium text-gray-800 dark:text-white text-xs">{f.studentName}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{f.userId.slice(0, 8)}…</p>
                              </td>
                              <td className="py-2 pr-3 text-gray-700 dark:text-gray-300 text-xs font-medium">{vlabel(f.type)}</td>
                              <td className="py-2 pr-3 text-[10px] text-gray-500 max-w-[120px] truncate hidden sm:table-cell">
                                {f.detail || <span className="text-gray-300 dark:text-gray-600">—</span>}
                              </td>
                              <td className="py-2 pr-3">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${sev.cls}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sev.dot}`} />
                                  {sev.label}
                                </span>
                              </td>
                              <td className="py-2 pr-3 text-[10px] text-gray-400 whitespace-nowrap">{fmtTs(f.timestamp)}</td>
                              <td className="py-2 text-right">
                                {f.reviewed ? (
                                  <span className="text-[10px] text-green-500 font-semibold">Reviewed</span>
                                ) : (
                                  <button
                                    onClick={() => handleReview(f)}
                                    disabled={reviewingId === f.flagId}
                                    className="text-[10px] font-semibold text-brand-500 hover:underline disabled:opacity-40"
                                  >
                                    {reviewingId === f.flagId ? "…" : "Mark Reviewed"}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
          <p className="text-xs text-gray-400">{pendingReview} unreviewed flag{pendingReview !== 1 ? "s" : ""}</p>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors active:bg-gray-100">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Attempts Modal ────────────────────────────────────────────────────────────

function AttemptsModal({ exam, onClose }: { exam: Exam; onClose: () => void }) {
  type AttemptEntry = ExamAttempt & { attemptCount?: number; autoFailed?: boolean };
  const attempts = Object.entries(exam.studentAttempts ?? {}) as [string, AttemptEntry][];
  return (
    <div className="fixed inset-0 z-9999 flex flex-col justify-end sm:justify-center sm:items-center bg-black/50 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="min-w-0 pr-3">
            <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Student Attempts</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{exam.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl shrink-0 p-1">&times;</button>
        </div>
        <div className="px-4 sm:px-6 py-4 flex-1 overflow-y-auto">
          {attempts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No attempts yet.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                  <th className="text-left py-2">Student ID</th>
                  <th className="text-right py-2">Score</th>
                  <th className="text-right py-2">%</th>
                  <th className="text-right py-2">Result</th>
                  <th className="text-right py-2">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map(([uid, att]) => {
                  const pct = att.totalMarks > 0 ? Math.round((att.score / att.totalMarks) * 100) : 0;
                  return (
                    <tr key={uid} className="border-b dark:border-gray-800 last:border-0">
                      <td className="py-2 text-gray-700 dark:text-gray-300 font-mono text-xs">{uid.slice(0, 8)}…</td>
                      <td className="py-2 text-right text-gray-800 dark:text-white">{att.score}/{att.totalMarks}</td>
                      <td className="py-2 text-right text-gray-800 dark:text-white">{pct}%</td>
                      <td className="py-2 text-right">
                        {att.autoFailed ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                            Cheating Detected
                          </span>
                        ) : att.pendingEssayReview ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                            Pending Review
                          </span>
                        ) : (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${att.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                            {att.passed ? "Passed" : "Failed"}
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right text-xs text-gray-400">{new Date(att.submittedAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
        <div className="px-4 sm:px-6 py-3 border-t border-gray-100 dark:border-gray-800 flex justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors active:bg-gray-100">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Exams Integrity Inline Panel ─────────────────────────────────────────────

function ExamsIntegrityPanel({
  allFlags,
  exams,
  instituteId,
  onFlagReviewed,
  onViewExam,
}: {
  allFlags: FlagRow[];
  exams: Exam[];
  instituteId: string;
  onFlagReviewed: (flagId: string) => void;
  onViewExam: (exam: Exam) => void;
}) {
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed">("all");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [localFlags, setLocalFlags] = useState<FlagRow[]>(allFlags);
  const [expandedExam, setExpandedExam] = useState<string | null>(null);

  useEffect(() => { setLocalFlags(allFlags); }, [allFlags]);

  const handleReview = async (flag: FlagRow) => {
    if (flag.reviewed || reviewingId) return;
    setReviewingId(flag.flagId);
    const ok = await examService.markFlagReviewed(instituteId, flag.examId, flag.flagId, flag.userId);
    if (ok) {
      setLocalFlags((prev) => prev.map((f) => f.flagId === flag.flagId ? { ...f, reviewed: true } : f));
      onFlagReviewed(flag.flagId);
    }
    setReviewingId(null);
  };

  // Derived stats
  const totalFlags = localFlags.length;
  const highFlags = localFlags.filter((f) => f.severity === "high").length;
  const uniqueStudents = new Set(localFlags.map((f) => f.userId)).size;
  const pendingCount = localFlags.filter((f) => !f.reviewed).length;
  const autoFailedCount = exams.reduce((acc, e) => {
    return acc + Object.values(e.studentAttempts ?? {}).filter((a) => (a as { autoFailed?: boolean }).autoFailed).length;
  }, 0);

  // Flags filtered by tab
  const visible = localFlags.filter((f) => {
    if (filter === "pending") return !f.reviewed;
    if (filter === "reviewed") return f.reviewed;
    return true;
  });

  // Group by exam for the grouped view
  const byExam = visible.reduce<Record<string, FlagRow[]>>((acc, f) => {
    (acc[f.examId] = acc[f.examId] ?? []).push(f);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Flags", value: totalFlags, color: "text-gray-800 dark:text-white" },
          { label: "Flagged Students", value: uniqueStudents, color: "text-amber-600 dark:text-amber-400" },
          { label: "High Severity", value: highFlags, color: "text-red-600 dark:text-red-400" },
          { label: "Auto-Failed", value: autoFailedCount, color: "text-red-700 dark:text-red-300" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-4 sm:p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "pending", "reviewed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? "bg-brand-500 text-white"
                : "bg-gray-100 dark:bg-white/6 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {totalFlags === 0 && (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">No integrity violations</p>
            <p className="text-sm text-gray-400 mt-1">All exams are clean.</p>
          </div>
        </div>
      )}

      {/* Grouped by exam */}
      {Object.keys(byExam).length > 0 && (
        <div className="flex flex-col gap-3">
          {Object.entries(byExam).map(([examId, examFlags]) => {
            const exam = exams.find((e) => e.id === examId);
            const examTitle = examFlags[0]?.examTitle ?? examId;
            const examHighCount = examFlags.filter((f) => f.severity === "high").length;
            const examUniqueStudents = new Set(examFlags.map((f) => f.userId)).size;
            const isOpen = expandedExam === examId;

            return (
              <div key={examId} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
                {/* Exam header */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  onClick={() => setExpandedExam(isOpen ? null : examId)}
                >
                  <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-red-600 dark:text-red-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{examTitle}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{examUniqueStudents} student{examUniqueStudents !== 1 ? "s" : ""} flagged</span>
                      {examHighCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400">
                          {examHighCount} high severity
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                      {examFlags.length} flag{examFlags.length !== 1 ? "s" : ""}
                    </span>
                    {exam && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onViewExam(exam); }}
                        className="text-[10px] font-medium text-brand-500 hover:text-brand-600 px-2 py-1 rounded border border-brand-200 dark:border-brand-800 hover:border-brand-400 transition-colors"
                      >
                        View Detail
                      </button>
                    )}
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                      className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>

                {/* Expanded: per-flag violation rows */}
                {isOpen && (
                  <div className="border-t border-gray-100 dark:border-gray-700">
                    {/* Mobile: stacked cards */}
                    <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-700">
                      {examFlags
                        .slice()
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .map((f) => {
                          const sev = SEVERITY_CFG[f.severity] ?? SEVERITY_CFG.medium;
                          return (
                            <div key={f.flagId} className={`px-4 py-3 flex items-start gap-2.5 ${f.reviewed ? "opacity-50" : ""}`}>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5 ${sev.cls}`}>{sev.label}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-800 dark:text-white">{f.studentName}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-300">{vlabel(f.type)}</p>
                                <p className="text-[10px] text-gray-400">{fmtTs(f.timestamp)}</p>
                              </div>
                              {f.reviewed ? (
                                <span className="text-[10px] text-green-500 font-semibold shrink-0 mt-0.5">✓</span>
                              ) : (
                                <button
                                  onClick={() => handleReview(f)}
                                  disabled={reviewingId === f.flagId}
                                  className="text-[10px] font-semibold text-brand-500 shrink-0 disabled:opacity-40 mt-0.5"
                                >
                                  {reviewingId === f.flagId ? "…" : "Review"}
                                </button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                    {/* Desktop: table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/80">
                          <tr className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                            <th className="text-left px-5 py-2.5">Student</th>
                            <th className="text-left px-5 py-2.5">Violation</th>
                            <th className="text-left px-5 py-2.5 hidden lg:table-cell">Detail</th>
                            <th className="text-left px-5 py-2.5">Severity</th>
                            <th className="text-left px-5 py-2.5">Time</th>
                            <th className="text-right px-5 py-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {examFlags
                            .slice()
                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                            .map((f) => {
                              const sev = SEVERITY_CFG[f.severity] ?? SEVERITY_CFG.medium;
                              return (
                                <tr key={f.flagId} className={`hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors ${f.reviewed ? "opacity-50" : ""}`}>
                                  <td className="px-5 py-3">
                                    <p className="font-medium text-gray-800 dark:text-white text-xs">{f.studentName}</p>
                                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{f.userId.slice(0, 8)}…</p>
                                  </td>
                                  <td className="px-5 py-3 text-xs font-medium text-gray-700 dark:text-gray-300">{vlabel(f.type)}</td>
                                  <td className="px-5 py-3 text-[10px] text-gray-500 max-w-[140px] truncate hidden lg:table-cell">
                                    {f.detail || <span className="text-gray-300 dark:text-gray-600">—</span>}
                                  </td>
                                  <td className="px-5 py-3">
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${sev.cls}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sev.dot}`} />
                                      {sev.label}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3 text-[10px] text-gray-400 whitespace-nowrap">{fmtTs(f.timestamp)}</td>
                                  <td className="px-5 py-3 text-right">
                                    {f.reviewed ? (
                                      <span className="text-[10px] text-green-500 font-semibold">Reviewed</span>
                                    ) : (
                                      <button
                                        onClick={() => handleReview(f)}
                                        disabled={reviewingId === f.flagId}
                                        className="text-[10px] font-semibold text-brand-500 hover:underline disabled:opacity-40"
                                      >
                                        {reviewingId === f.flagId ? "…" : "Mark Reviewed"}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TeacherExamsPage() {
  const { instituteId } = useParams<{ instituteId: string }>();
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allFlags, setAllFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"exams" | "integrity">("exams");
  const [showCreate, setShowCreate] = useState(false);
  const [editExam, setEditExam] = useState<Exam | null>(null);
  const [attemptsExam, setAttemptsExam] = useState<Exam | null>(null);
  const [monitorExam, setMonitorExam] = useState<Exam | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!instituteId) return;
    setLoading(true);
    const [e, c, f] = await Promise.all([
      examService.getMyExams(instituteId),
      instituteService.getMyTeacherCourses(instituteId),
      examService.getIntegrityFlags(instituteId),
    ]);
    setExams(e);
    setCourses(c);
    setAllFlags(f);
    setLoading(false);
  }, [instituteId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (payload: CreateExamPayload & { status?: ExamStatus }) => {
    const result = await examService.createExam(instituteId, payload);
    if (result) { setExams((prev) => [result, ...prev]); setShowCreate(false); }
  };

  const handleUpdate = async (payload: CreateExamPayload & { status?: ExamStatus }) => {
    if (!editExam) return;
    const result = await examService.updateExam(instituteId, editExam.id, payload);
    if (result) { setExams((prev) => prev.map((e) => (e.id === result.id ? result : e))); setEditExam(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this exam?")) return;
    setDeleting(id);
    const ok = await examService.deleteExam(instituteId, id);
    if (ok) setExams((prev) => prev.filter((e) => e.id !== id));
    setDeleting(null);
  };

  // Mark a flag as reviewed in the local allFlags state (called by the modal)
  const handleFlagReviewed = (flagId: string) =>
    setAllFlags((prev) => prev.map((f) => f.flagId === flagId ? { ...f, reviewed: true } : f));

  const total = exams.length;
  const scheduled = exams.filter((e) => e.status === "scheduled").length;
  const active = exams.filter((e) => e.status === "active").length;
  const completed = exams.filter((e) => e.status === "completed").length;
  const flaggedExams = new Set(allFlags.map((f) => f.examId)).size;

  const hasAnyFlags = allFlags.length > 0;

  return (
    <div className="flex flex-col gap-6 min-w-0 w-full overflow-x-hidden">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Exams</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create, schedule and manage exams for your courses</p>
        </div>
        {activeTab === "exams" && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors shrink-0"
          >
            <span className="text-lg leading-none">+</span> Create Exam
          </button>
        )}
      </div>

      {/* ── Tab switcher — exact same style as Assessments page ── */}
      <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden w-full sm:w-fit text-sm font-medium">
        <button
          onClick={() => setActiveTab("exams")}
          className={`flex items-center gap-2 px-5 py-2.5 transition-colors ${
            activeTab === "exams"
              ? "bg-blue-600 text-white"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          {/* Document icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          Exams
        </button>
        <button
          onClick={() => setActiveTab("integrity")}
          className={`flex items-center gap-2 px-5 py-2.5 border-l border-gray-200 dark:border-gray-700 transition-colors ${
            activeTab === "integrity"
              ? "bg-red-600 text-white"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          {/* Shield icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
          </svg>
          Integrity Monitor
          {/* Red dot when there are any flags — same as assessments page */}
          {hasAnyFlags && (
            <span className={`w-2 h-2 rounded-full ${activeTab === "integrity" ? "bg-red-200" : "bg-red-500"} animate-pulse shrink-0`} />
          )}
        </button>
      </div>

      {/* ── Exams tab content ── */}
      {activeTab === "exams" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
            {[
              { label: "Total", value: total, color: "text-gray-800 dark:text-white" },
              { label: "Scheduled", value: scheduled, color: "text-blue-600 dark:text-blue-400" },
              { label: "Active", value: active, color: "text-green-600 dark:text-green-400" },
              { label: "Completed", value: completed, color: "text-purple-600 dark:text-purple-400" },
              { label: "Flagged", value: flaggedExams, color: flaggedExams > 0 ? "text-red-600 dark:text-red-400" : "text-gray-800 dark:text-white" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-4 sm:p-5">
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          ) : exams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" className="text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-700 dark:text-gray-300">No exams yet</p>
              <p className="text-sm text-gray-400">Click &quot;Create Exam&quot; to get started.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 overflow-hidden min-w-0 w-full">

              {/* ── Mobile card list (xs only) ── */}
              <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-800">
                {exams.map((exam) => {
                  const attempts = Object.keys(exam.studentAttempts ?? {}).length;
                  const examFlags = allFlags.filter((f) => f.examId === exam.id);
                  const flagCount = examFlags.length;
                  const highFlagCount = examFlags.filter((f) => f.severity === "high").length;
                  const hasAutoFailed = Object.values(exam.studentAttempts ?? {}).some(
                    (a) => (a as { autoFailed?: boolean }).autoFailed
                  );
                  return (
                    <div key={exam.id} className="px-4 py-4 flex items-start gap-3">
                      {/* Left: info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white leading-snug">{exam.title}</p>
                          {statusBadge(exam.status)}
                        </div>
                        {(exam.courseName || exam.courseId) && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">
                            {exam.courseName ?? exam.courseId.slice(0, 8)}
                          </p>
                        )}
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs text-gray-400">{exam.durationMinutes}m</span>
                          <span className="text-xs text-gray-400">{exam.questionCount} Qs</span>
                          <button
                            onClick={() => setAttemptsExam(exam)}
                            className="text-xs text-brand-500 font-semibold"
                          >
                            {attempts} attempt{attempts !== 1 ? "s" : ""}
                          </button>
                          {flagCount > 0 && (
                            <button
                              onClick={() => setMonitorExam(exam)}
                              className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                            >
                              {hasAutoFailed && <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />}
                              {flagCount} flag{flagCount !== 1 ? "s" : ""}
                              {highFlagCount > 0 && <span className="opacity-70">({highFlagCount}⚠)</span>}
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Right: actions */}
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={() => setMonitorExam(exam)}
                          className="text-xs text-orange-500 px-2.5 py-1.5 rounded-lg border border-orange-200 dark:border-orange-900/40 flex items-center gap-1 active:bg-orange-50 dark:active:bg-orange-900/20"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                          </svg>
                          Integrity
                        </button>
                        <button
                          onClick={() => setEditExam(exam)}
                          className="text-xs text-gray-500 dark:text-gray-400 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 active:bg-gray-50 dark:active:bg-white/5"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(exam.id)}
                          disabled={deleting === exam.id}
                          className="text-xs text-red-500 px-2.5 py-1.5 rounded-lg border border-red-100 dark:border-red-900/40 disabled:opacity-40 active:bg-red-50 dark:active:bg-red-900/20"
                        >
                          {deleting === exam.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Desktop table (sm+) ── */}
              <div className="hidden sm:block w-full overflow-y-auto max-h-[60vh]">
                <table className="w-full text-sm table-auto">
                  <thead className="sticky top-0 z-10 bg-white dark:bg-gray-900">
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
                      <th className="text-left px-4 sm:px-5 py-3">Title</th>
                      <th className="text-left px-5 py-3 hidden md:table-cell">Course</th>
                      <th className="text-left px-5 py-3 hidden lg:table-cell">Scheduled</th>
                      <th className="text-center px-5 py-3 hidden md:table-cell">Duration</th>
                      <th className="text-center px-5 py-3 hidden md:table-cell">Questions</th>
                      <th className="text-center px-3 sm:px-5 py-3">Attempts</th>
                      <th className="text-center px-3 sm:px-5 py-3">Flags</th>
                      <th className="text-center px-3 sm:px-5 py-3">Status</th>
                      <th className="text-right px-4 sm:px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((exam) => {
                      const attempts = Object.keys(exam.studentAttempts ?? {}).length;
                      const examFlags = allFlags.filter((f) => f.examId === exam.id);
                      const flagCount = examFlags.length;
                      const highFlagCount = examFlags.filter((f) => f.severity === "high").length;
                      const hasAutoFailed = Object.values(exam.studentAttempts ?? {}).some(
                        (a) => (a as { autoFailed?: boolean }).autoFailed
                      );
                      return (
                        <tr key={exam.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-white/3">
                          <td className="px-4 sm:px-5 py-3 font-medium text-gray-900 dark:text-white w-full truncate">{exam.title}</td>
                          <td className="px-5 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell max-w-[140px] truncate">{exam.courseName ?? exam.courseId.slice(0, 8)}</td>
                          <td className="px-5 py-3 text-gray-500 dark:text-gray-400 hidden lg:table-cell whitespace-nowrap">{fmtDate(exam.scheduledAt)}</td>
                          <td className="px-5 py-3 text-center text-gray-600 dark:text-gray-400 hidden md:table-cell">{exam.durationMinutes}m</td>
                          <td className="px-5 py-3 text-center text-gray-600 dark:text-gray-400 hidden md:table-cell">{exam.questionCount}</td>
                          <td className="px-3 sm:px-5 py-3 text-center">
                            <button onClick={() => setAttemptsExam(exam)} className="text-brand-500 hover:underline font-medium">{attempts}</button>
                          </td>
                          <td className="px-3 sm:px-5 py-3 text-center">
                            {flagCount > 0 ? (
                              <button
                                onClick={() => setMonitorExam(exam)}
                                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/25 transition-colors"
                              >
                                {hasAutoFailed && <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />}
                                {flagCount}
                                {highFlagCount > 0 && <span className="text-[10px] opacity-70">({highFlagCount}⚠)</span>}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                            )}
                          </td>
                          <td className="px-3 sm:px-5 py-3 text-center">{statusBadge(exam.status)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setMonitorExam(exam)}
                                title="Integrity Monitor"
                                className="text-xs text-orange-500 hover:text-orange-600 px-2 py-1 rounded border border-orange-100 dark:border-orange-900/40 hover:border-orange-300 flex items-center gap-1"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                </svg>
                                <span className="hidden md:inline">Integrity</span>
                              </button>
                              <button onClick={() => setEditExam(exam)} className="text-xs text-gray-500 hover:text-brand-500 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:border-brand-300">Edit</button>
                              <button
                                onClick={() => handleDelete(exam.id)}
                                disabled={deleting === exam.id}
                                className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded border border-red-100 dark:border-red-900/40 hover:border-red-300 disabled:opacity-40"
                              >
                                {deleting === exam.id ? "…" : "Del"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Integrity Monitor tab content ── */}
      {activeTab === "integrity" && (
        <ExamsIntegrityPanel
          allFlags={allFlags}
          exams={exams}
          instituteId={instituteId}
          onFlagReviewed={handleFlagReviewed}
          onViewExam={(exam) => setMonitorExam(exam)}
        />
      )}

      {/* ── Modals ── */}
      {showCreate && (
        <ExamModal courses={courses} onSave={handleCreate} onClose={() => setShowCreate(false)} />
      )}
      {editExam && (
        <ExamModal courses={courses} initial={editExam} onSave={handleUpdate} onClose={() => setEditExam(null)} />
      )}
      {attemptsExam && (
        <AttemptsModal exam={attemptsExam} onClose={() => setAttemptsExam(null)} />
      )}
      {monitorExam && (
        <IntegrityMonitorModal
          exam={monitorExam}
          flags={allFlags.filter((f) => f.examId === monitorExam.id)}
          instituteId={instituteId}
          onClose={() => setMonitorExam(null)}
          onFlagReviewed={handleFlagReviewed}
        />
      )}
    </div>
  );
}
