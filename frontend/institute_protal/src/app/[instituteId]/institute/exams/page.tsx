"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { examService, Exam, ExamQuestion, CreateExamPayload, ExamStatus, QuestionType } from "@/services/examService";
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
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status]}`}>{status}</span>;
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

function QuestionBuilder({ questions, onChange }: { questions: ExamQuestion[]; onChange: (qs: ExamQuestion[]) => void }) {
  const update = (i: number, patch: Partial<ExamQuestion>) => { const n = [...questions]; n[i] = { ...n[i], ...patch }; onChange(n); };
  const updateOption = (qi: number, oi: number, val: string) => {
    const o = [...(questions[qi].options ?? ["", "", "", ""])] as [string, string, string, string];
    o[oi] = val; update(qi, { options: o });
  };
  const remove = (i: number) => onChange(questions.filter((_, idx) => idx !== i));
  const changeType = (i: number, type: QuestionType) => {
    if (type === "mcq") update(i, { type: "mcq", options: ["", "", "", ""], correctAnswer: 0, sampleAnswer: undefined });
    else update(i, { type: "essay", options: undefined, correctAnswer: undefined, sampleAnswer: "" });
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
                  <button key={t} type="button" onClick={() => changeType(qi, t)}
                    className={`px-2.5 py-0.5 text-xs font-medium transition-colors ${q.type === t ? "bg-brand-500 text-white" : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => remove(qi)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
          </div>
          <textarea value={q.question} onChange={(e) => update(qi, { question: e.target.value })} placeholder="Question text…" rows={2}
            className="w-full mb-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white placeholder-gray-400 outline-none focus:border-brand-400 resize-none" />
          {q.type === "mcq" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              {(q.options ?? ["", "", "", ""]).map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input type="radio" name={`c-${q.id}`} checked={q.correctAnswer === oi} onChange={() => update(qi, { correctAnswer: oi })} className="accent-brand-500" />
                  <input value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                    className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 outline-none focus:border-brand-400" />
                </div>
              ))}
            </div>
          )}
          {q.type === "essay" && (
            <div className="mb-3">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sample Answer (teacher only)</label>
              <textarea value={q.sampleAnswer ?? ""} onChange={(e) => update(qi, { sampleAnswer: e.target.value })} placeholder="Model answer…" rows={2}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white placeholder-gray-400 outline-none focus:border-brand-400 resize-none" />
            </div>
          )}
          <div className="flex items-center gap-4">
            <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              Marks: <input type="number" min={1} value={q.marks} onChange={(e) => update(qi, { marks: Number(e.target.value) })}
                className="w-14 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-0.5 text-sm outline-none" />
            </label>
            {q.type === "mcq" && (
              <label className="text-xs text-gray-500 dark:text-gray-400 flex-1 flex items-center gap-1.5">
                Explanation:
                <input value={q.explanation ?? ""} onChange={(e) => update(qi, { explanation: e.target.value })} placeholder="e.g. Because…"
                  className="flex-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-0.5 text-sm outline-none" />
              </label>
            )}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3 mt-1">
        <button type="button" onClick={() => onChange([...questions, blankMCQ()])} className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-600 font-medium">
          <span className="text-lg leading-none">+</span> Add MCQ
        </button>
        <button type="button" onClick={() => onChange([...questions, blankEssay()])} className="flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-600 font-medium">
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
    setError(""); setGenerated([]);
    if (inputType === "text" && text.trim().length < 20) return setError("Enter at least 20 characters.");
    if (inputType === "file" && !file) return setError("Please select a PDF or DOCX file.");
    setLoading(true);
    try {
      let qs: ExamQuestion[] | null = null;
      if (inputType === "text") {
        qs = await aiService.generateQuestionsFromText({ text, num_questions: numQuestions, difficulty, question_type: questionType });
      } else {
        qs = await aiService.generateQuestionsFromFile({ file: file!, num_questions: numQuestions, difficulty, question_type: questionType });
      }
      if (!qs || qs.length === 0) setError("AI did not return any questions. Try again.");
      else setGenerated(qs.map((q) => ({ ...q, selected: true })));
    } catch {
      setError("Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (i: number) => setGenerated((p) => p.map((q, idx) => idx === i ? { ...q, selected: !q.selected } : q));

  const importSelected = () => {
    const toImport = generated.filter((q) => q.selected).map(({ selected: _, ...q }) => q);
    if (toImport.length === 0) return;
    onImport(toImport);
    setGenerated([]); setText(""); setFile(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 w-fit">
        {(["text", "file"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setInputType(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${inputType === t ? "bg-brand-500 text-white" : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
            {t === "text" ? "Text / Description" : "Upload File (PDF/DOCX)"}
          </button>
        ))}
      </div>

      {inputType === "text" ? (
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste course content or describe what to test…" rows={5}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-800 dark:text-white placeholder-gray-400 outline-none focus:border-brand-400 resize-none" />
      ) : (
        <div>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.pptx,.ppt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 px-4 py-6 text-sm text-gray-500 dark:text-gray-400 hover:border-brand-400 hover:text-brand-500 transition-colors text-center">
            {file ? <span className="font-medium text-gray-700 dark:text-gray-300">{file.name}</span> : "Click to select PDF, DOCX, or PPTX"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Question Type</label>
          <select value={questionType} onChange={(e) => setQuestionType(e.target.value as typeof questionType)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:border-brand-400">
            <option value="mcq">MCQ Only</option>
            <option value="essay">Essay Only</option>
            <option value="both">Both (Mixed)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Difficulty</label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:border-brand-400">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">No. of Questions</label>
          <input type="number" min={1} max={20} value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:border-brand-400" />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button type="button" onClick={generate} disabled={loading}
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-60 transition-colors">
        {loading ? (
          <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>Generating…</>
        ) : (
          <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>Generate with AI</>
        )}
      </button>

      {generated.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{generated.length} questions — select to import:</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setGenerated((p) => p.map((q) => ({ ...q, selected: true })))} className="text-xs text-brand-500 hover:underline">All</button>
              <button type="button" onClick={() => setGenerated((p) => p.map((q) => ({ ...q, selected: false })))} className="text-xs text-gray-400 hover:underline">None</button>
            </div>
          </div>
          <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1">
            {generated.map((q, i) => (
              <div key={q.id} onClick={() => toggleSelect(i)}
                className={`rounded-xl border p-3 cursor-pointer transition-colors ${q.selected ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-60"}`}>
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
          <button type="button" onClick={importSelected} className="mt-3 w-full px-4 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors">
            Import {generated.filter((q) => q.selected).length} Selected Question{generated.filter((q) => q.selected).length !== 1 ? "s" : ""}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Create / Edit Modal ───────────────────────────────────────────────────────

function ExamModal({ courses, initial, onSave, onClose }: { courses: Course[]; initial?: Exam; onSave: (p: CreateExamPayload & { status?: ExamStatus }) => Promise<void>; onClose: () => void }) {
  const [tab, setTab] = useState<"details" | "ai" | "questions">("details");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [courseId, setCourseId] = useState(initial?.courseId ?? "");
  const [scheduledAt, setScheduledAt] = useState(initial?.scheduledAt ? new Date(initial.scheduledAt).toISOString().slice(0, 16) : "");
  const [durationMinutes, setDurationMinutes] = useState(initial?.durationMinutes ?? 60);
  const [passingScore, setPassingScore] = useState(initial?.passingScore ?? 50);
  const [questions, setQuestions] = useState<ExamQuestion[]>(initial?.questions ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);

  const handleImportAI = (qs: ExamQuestion[]) => { setQuestions((p) => [...p, ...qs]); setTab("questions"); };

  const handleSubmit = async (publish: boolean) => {
    if (!title.trim()) { setTab("details"); return setError("Title required"); }
    if (!courseId) { setTab("details"); return setError("Select a course"); }
    if (questions.length === 0) { setTab("questions"); return setError("Add at least one question"); }
    for (const q of questions) {
      if (!q.question.trim()) { setTab("questions"); return setError("All questions must have text"); }
      if (q.type === "mcq" && (q.options ?? []).some((o) => !o.trim())) { setTab("questions"); return setError("All MCQ options must be filled"); }
    }
    setError(""); setSaving(true);
    await onSave({ title: title.trim(), description: description.trim() || undefined, instructions: instructions.trim() || undefined, courseId,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined, durationMinutes, passingScore, questions,
      ...(publish && scheduledAt ? { status: "scheduled" as ExamStatus } : {}) });
    setSaving(false);
  };

  const tabs = [{ id: "details" as const, label: "Details" }, { id: "ai" as const, label: "AI Generate" }, { id: "questions" as const, label: `Questions (${questions.length})` }];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{initial ? "Edit Exam" : "Create Exam"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="flex border-b border-gray-100 dark:border-gray-800 px-6">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="px-6 py-5 flex flex-col gap-4 max-h-[65vh] overflow-y-auto">
          {tab === "details" && (
            <>
              <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Title *</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:border-brand-400" placeholder="Final Examination" /></div>
              <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Assign to Course *</label>
                <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:border-brand-400">
                  <option value="">Select course…</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.name}{c.batchNumber ? ` (${c.batchNumber})` : ""}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Scheduled Date & Time</label>
                  <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:border-brand-400" /></div>
                <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Duration (minutes)</label>
                  <input type="number" min={5} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:border-brand-400" /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Passing Score (%)</label>
                <input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} className="w-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:border-brand-400" /></div>
              <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:border-brand-400 resize-none" placeholder="Optional…" /></div>
              <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Student Instructions</label>
                <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:border-brand-400 resize-none" placeholder="e.g. No external resources…" /></div>
            </>
          )}
          {tab === "ai" && <AIQuestionGenerator onImport={handleImportAI} />}
          {tab === "questions" && (
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 mb-3 block">{questions.length} question{questions.length !== 1 ? "s" : ""} · Total marks: {totalMarks}</span>
              <QuestionBuilder questions={questions} onChange={setQuestions} />
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Cancel</button>
          <button onClick={() => handleSubmit(false)} disabled={saving} className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50">Save as Draft</button>
          <button onClick={() => handleSubmit(true)} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50">{saving ? "Saving…" : "Publish"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Attempts Modal ────────────────────────────────────────────────────────────

function AttemptsModal({ exam, onClose }: { exam: Exam; onClose: () => void }) {
  const attempts = Object.entries(exam.studentAttempts ?? {});
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Attempts — {exam.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          {attempts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No attempts yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-gray-500 border-b dark:border-gray-700">
                <th className="text-left py-2">Student</th><th className="text-right py-2">Score</th><th className="text-right py-2">%</th><th className="text-right py-2">Result</th>
              </tr></thead>
              <tbody>
                {attempts.map(([uid, att]) => {
                  const pct = att.totalMarks > 0 ? Math.round((att.score / att.totalMarks) * 100) : 0;
                  return (
                    <tr key={uid} className="border-b dark:border-gray-800 last:border-0">
                      <td className="py-2 font-mono text-xs text-gray-600 dark:text-gray-400">{uid.slice(0, 8)}…</td>
                      <td className="py-2 text-right">{att.score}/{att.totalMarks}</td>
                      <td className="py-2 text-right">{pct}%</td>
                      <td className="py-2 text-right">
                        {att.pendingEssayReview ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">Pending Review</span>
                        ) : (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${att.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>{att.passed ? "Passed" : "Failed"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function InstituteExamsPage() {
  const { instituteId } = useParams<{ instituteId: string }>();
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editExam, setEditExam] = useState<Exam | null>(null);
  const [attemptsExam, setAttemptsExam] = useState<Exam | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!instituteId) return;
    setLoading(true);
    const [e, allCourses] = await Promise.all([
      examService.getAllExams(instituteId),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/institutes/institutes/${instituteId}/courses`, {
        headers: { Authorization: `Bearer ${(await import("@/services/authService")).authService.getToken()}` },
      }).then((r) => r.ok ? r.json() : []).catch(() => [] as Course[]),
    ]);
    setExams(e);
    setCourses(allCourses);
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

  const total = exams.length;
  const scheduled = exams.filter((e) => e.status === "scheduled").length;
  const active = exams.filter((e) => e.status === "active").length;
  const completed = exams.filter((e) => e.status === "completed").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between py-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Exams</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage all institute exams across courses</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors">
          <span className="text-lg leading-none">+</span> Create Exam
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[{ label: "Total", value: total, color: "text-gray-800 dark:text-white" }, { label: "Scheduled", value: scheduled, color: "text-blue-600 dark:text-blue-400" }, { label: "Active", value: active, color: "text-green-600 dark:text-green-400" }, { label: "Completed", value: completed, color: "text-purple-600 dark:text-purple-400" }].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
      ) : exams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 text-center gap-3">
          <p className="font-semibold text-gray-700 dark:text-gray-300">No exams yet</p>
          <p className="text-sm text-gray-400">Create an exam and assign it to a course.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
              <th className="text-left px-5 py-3">Title</th>
              <th className="text-left px-5 py-3 hidden md:table-cell">Course</th>
              <th className="text-left px-5 py-3 hidden lg:table-cell">Scheduled</th>
              <th className="text-center px-5 py-3 hidden sm:table-cell">Duration</th>
              <th className="text-center px-5 py-3 hidden sm:table-cell">Qs</th>
              <th className="text-center px-5 py-3">Attempts</th>
              <th className="text-center px-5 py-3">Status</th>
              <th className="text-right px-5 py-3">Actions</th>
            </tr></thead>
            <tbody>
              {exams.map((exam) => {
                const attempts = Object.keys(exam.studentAttempts ?? {}).length;
                return (
                  <tr key={exam.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-white/3">
                    <td className="px-5 py-3 font-medium text-gray-900 dark:text-white max-w-40 truncate">{exam.title}</td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell max-w-[130px] truncate">{exam.courseName ?? "—"}</td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400 hidden lg:table-cell whitespace-nowrap">{fmtDate(exam.scheduledAt)}</td>
                    <td className="px-5 py-3 text-center text-gray-600 dark:text-gray-400 hidden sm:table-cell">{exam.durationMinutes}m</td>
                    <td className="px-5 py-3 text-center text-gray-600 dark:text-gray-400 hidden sm:table-cell">{exam.questionCount}</td>
                    <td className="px-5 py-3 text-center"><button onClick={() => setAttemptsExam(exam)} className="text-brand-500 hover:underline font-medium">{attempts}</button></td>
                    <td className="px-5 py-3 text-center">{statusBadge(exam.status)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditExam(exam)} className="text-xs text-gray-500 hover:text-brand-500 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">Edit</button>
                        <button onClick={() => handleDelete(exam.id)} disabled={deleting === exam.id} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded border border-red-100 dark:border-red-900/40 disabled:opacity-40">{deleting === exam.id ? "…" : "Delete"}</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <ExamModal courses={courses} onSave={handleCreate} onClose={() => setShowCreate(false)} />}
      {editExam && <ExamModal courses={courses} initial={editExam} onSave={handleUpdate} onClose={() => setEditExam(null)} />}
      {attemptsExam && <AttemptsModal exam={attemptsExam} onClose={() => setAttemptsExam(null)} />}
    </div>
  );
}
