"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { instituteService, ModuleContent, QuizQuestion, Course, CourseModule } from "@/services/instituteService";
import {
  FiX, FiPlus, FiTrash2, FiCheckCircle, FiChevronDown, FiChevronUp,
  FiAlertCircle, FiMic, FiLoader, FiZap, FiUpload, FiBook, FiFile,
} from "react-icons/fi";
import { authService } from "@/services/authService";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VoiceQuestion {
  id: string;
  question: string;
  expected_answer: string;
  marks: number;
  hints: string[];
}

type DocSource = "upload" | "course";

interface LectureDocument {
  id: string;
  title: string;
  url: string;
  moduleTitle: string;
  type: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function parseApiError(err: Record<string, unknown>): string {
  if (!err.detail) return "Something went wrong";
  if (typeof err.detail === "string") return err.detail;
  if (Array.isArray(err.detail))
    return (err.detail as { msg?: string; loc?: string[] }[])
      .map((e) => `${e.loc?.join(" → ") ?? "field"}: ${e.msg ?? "invalid"}`)
      .join("; ");
  return String(err.detail);
}

// ─── Document source picker ───────────────────────────────────────────────────

function DocumentSourcePicker({
  source, onSourceChange, file, onFileChange, fileRef,
  lectureDocuments, selectedDocId, onDocSelect,
}: {
  source: DocSource;
  onSourceChange: (s: DocSource) => void;
  file: File | null;
  onFileChange: (f: File | null) => void;
  fileRef: React.RefObject<HTMLInputElement>;
  lectureDocuments: LectureDocument[];
  selectedDocId: string;
  onDocSelect: (id: string) => void;
}) {
  const hasDocs = lectureDocuments.length > 0;
  return (
    <div className="space-y-3">
      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs font-medium">
        <button type="button" onClick={() => onSourceChange("upload")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${
            source === "upload" ? "bg-purple-600 text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}>
          <FiUpload className="w-3.5 h-3.5" /> Upload file
        </button>
        <button type="button"
          onClick={() => hasDocs && onSourceChange("course")}
          title={!hasDocs ? "No documents uploaded in this course yet" : undefined}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 border-l border-gray-200 dark:border-gray-700 transition-colors ${
            !hasDocs ? "opacity-40 cursor-not-allowed text-gray-400 dark:text-gray-600"
            : source === "course" ? "bg-purple-600 text-white"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}>
          <FiBook className="w-3.5 h-3.5" /> From course
          {hasDocs && (
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              source === "course" ? "bg-white/20 text-white" : "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
            }`}>{lectureDocuments.length}</span>
          )}
        </button>
      </div>

      {source === "upload" && (
        <>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.pptx,.ppt" className="hidden"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors group">
            <FiUpload className="w-4 h-4 group-hover:scale-110 transition-transform shrink-0" />
            {file ? (
              <span className="text-purple-700 dark:text-purple-300 font-medium truncate">{file.name}</span>
            ) : (
              <span>Upload PDF, DOCX, or PPTX document</span>
            )}
            {file && (
              <span role="button" onClick={(e) => { e.stopPropagation(); onFileChange(null); }}
                className="ml-auto text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
                <FiX className="w-3.5 h-3.5" />
              </span>
            )}
          </button>
        </>
      )}

      {source === "course" && (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {lectureDocuments.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No PDF or document content in this course.</p>
          ) : (
            lectureDocuments.map((doc) => {
              const isSel = selectedDocId === doc.id;
              return (
                <button key={doc.id} type="button"
                  onClick={() => onDocSelect(isSel ? "" : doc.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-left transition-all ${
                    isSel ? "border-purple-400 dark:border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}>
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    isSel ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300" : "bg-gray-100 dark:bg-gray-700 text-gray-400"
                  }`}>
                    <FiFile className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${isSel ? "text-purple-700 dark:text-purple-300" : "text-gray-800 dark:text-gray-200"}`}>{doc.title}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{doc.moduleTitle}</p>
                  </div>
                  {isSel && <FiCheckCircle className="w-4 h-4 shrink-0 text-purple-500" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── AI Generate Panel (MCQ) ──────────────────────────────────────────────────

function AIGeneratePanel({
  onAddQuestions, lectureDocuments,
}: {
  onAddQuestions: (qs: QuizQuestion[]) => void;
  lectureDocuments: LectureDocument[];
}) {
  const [open, setOpen] = useState(false);
  const [docSource, setDocSource] = useState<DocSource>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<QuizQuestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [aiError, setAiError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canGenerate = docSource === "upload" ? !!file : !!selectedDocId;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true); setAiError(null); setGenerated([]);
    try {
      const form = new FormData();
      if (docSource === "course") {
        const doc = lectureDocuments.find((d) => d.id === selectedDocId);
        if (doc) form.append("document_url", doc.url);
        else throw new Error("No document selected.");
      } else if (file) {
        form.append("file", file);
      } else {
        throw new Error("No document selected.");
      }
      form.append("num_questions", String(numQuestions));
      form.append("difficulty", difficulty);
      const res = await fetch(`${API_GATEWAY_URL}/api/ai/quiz/generate`, { method: "POST", body: form });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(parseApiError(err)); }
      const data = await res.json();
      const qs: QuizQuestion[] = (data.questions as Record<string, unknown>[]).map((q) => ({
        id: (q.id as string) ?? crypto.randomUUID(),
        question: q.question as string,
        options: q.options as [string, string, string, string],
        correctAnswer: q.correctAnswer as number,
        explanation: (q.explanation as string) ?? "",
      }));
      setGenerated(qs);
      setSelected(new Set(qs.map((q) => q.id)));
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleAdd = () => {
    onAddQuestions(generated.filter((q) => selected.has(q.id)));
    setGenerated([]); setSelected(new Set()); setFile(null); setSelectedDocId(""); setOpen(false);
  };

  useEffect(() => { setGenerated([]); setSelected(new Set()); setAiError(null); }, [docSource, selectedDocId, file]);

  return (
    <div className="border border-dashed border-purple-300 dark:border-purple-700 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
        <FiZap className="w-4 h-4" /> Generate with AI
        {open ? <FiChevronUp className="w-4 h-4 ml-auto" /> : <FiChevronDown className="w-4 h-4 ml-auto" />}
      </button>

      {open && (
        <div className="px-4 py-4 space-y-3 bg-white dark:bg-gray-800">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Document Source</label>
            <DocumentSourcePicker
              source={docSource}
              onSourceChange={(s) => { setDocSource(s); setFile(null); setSelectedDocId(""); }}
              file={file} onFileChange={setFile}
              fileRef={fileRef as React.RefObject<HTMLInputElement>}
              lectureDocuments={lectureDocuments}
              selectedDocId={selectedDocId} onDocSelect={setSelectedDocId}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Questions</label>
              <input type="number" min={1} max={20} value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")} className={inputCls}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <button type="button" onClick={handleGenerate} disabled={!canGenerate || loading}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2">
            {loading
              ? <><FiLoader className="w-4 h-4 animate-spin" /> Generating…</>
              : <><FiZap className="w-4 h-4" /> Generate</>}
          </button>

          {aiError && <p className="text-xs text-red-500">{aiError}</p>}

          {generated.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {generated.length} questions generated — select to add:
              </p>
              {generated.map((q, i) => (
                <div key={q.id} onClick={() => toggleSelect(q.id)}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-xs transition-colors ${
                    selected.has(q.id) ? "border-purple-400 bg-purple-50 dark:bg-purple-900/20" : "border-gray-200 dark:border-gray-700"
                  }`}>
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

export interface EditEntry {
  content: ModuleContent;
  module: Pick<CourseModule, "id" | "title" | "order">;
  course: Course;
}

interface EditAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updated: ModuleContent) => void;
  entry: EditEntry | null;
  instituteId: string;
}

const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";

// ─── Inline MCQ question card ─────────────────────────────────────────────────

function EditQuestionCard({ q, index, onChange, onDelete }: {
  q: QuizQuestion; index: number;
  onChange: (patch: Partial<QuizQuestion>) => void;
  onDelete: () => void;
}) {
  const LETTERS = ["A", "B", "C", "D"];
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700/40">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Q{index + 1}</span>
        <input value={q.question} onChange={(e) => onChange({ question: e.target.value })}
          placeholder="Enter question…"
          className="flex-1 bg-transparent text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 outline-none" />
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
              <input value={opt} onChange={(e) => {
                const opts = [...q.options] as [string, string, string, string];
                opts[oi] = e.target.value;
                onChange({ options: opts });
              }} placeholder={`Option ${LETTERS[oi]}`}
                className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none" />
              {isCorrect && <FiCheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
            </div>
          );
        })}
      </div>
      <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700">
        <input value={q.explanation ?? ""} onChange={(e) => onChange({ explanation: e.target.value })}
          placeholder="Explanation (optional)…"
          className="w-full bg-transparent text-xs text-gray-500 dark:text-gray-400 placeholder-gray-400 outline-none" />
      </div>
    </div>
  );
}

// ─── Voice question preview card ──────────────────────────────────────────────

function VoiceQuestionCard({ q, index }: { q: VoiceQuestion; index: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
        <span className="shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-center">{index + 1}</span>
        <p className="flex-1 text-sm font-medium text-gray-800 dark:text-white leading-snug">{q.question}</p>
        <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">{q.marks}m</span>
        {expanded ? <FiChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <FiChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/30">
          <div>
            <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wide mb-1">Expected Answer</p>
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{q.expected_answer}</p>
          </div>
          {q.hints?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Hints</p>
              <div className="flex gap-2 flex-wrap">
                {q.hints.map((h, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{h}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function EditAssessmentModal({
  isOpen, onClose, onUpdated, entry, instituteId,
}: EditAssessmentModalProps) {
  const isVoice = (entry?.content.quizData as any)?.assessmentType === "voice";

  // ── Shared fields ──────────────────────────────────────────────────────────
  const [title, setTitle]                       = useState("");
  const [description, setDescription]           = useState("");
  const [passingScore, setPassingScore]         = useState(70);
  const [timeLimit, setTimeLimit]               = useState(0);
  const [maxAttempts, setMaxAttempts]           = useState(1);
  const [requireFaceId, setRequireFaceId]       = useState(false);
  const [requireScreenShare, setRequireScreenShare] = useState(false);
  const [submitting, setSubmitting]             = useState(false);
  const [error, setError]                       = useState<string | null>(null);

  // ── MCQ fields ─────────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  // ── Voice regenerate fields ───────────────────────────────────────────────
  const [voiceQuestions, setVoiceQuestions]           = useState<VoiceQuestion[]>([]);
  const [showRegenerate, setShowRegenerate]           = useState(false);
  const [voiceInstructions, setVoiceInstructions]     = useState("");
  const [voiceNumQ, setVoiceNumQ]                     = useState(5);
  const [voiceMarksPerQ, setVoiceMarksPerQ]           = useState(10);
  const [voiceGenerating, setVoiceGenerating]         = useState(false);
  const [voiceGenError, setVoiceGenError]             = useState("");
  const voiceFileRef = useRef<HTMLInputElement>(null);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);

  // ── Course modules (for AI document picker) ───────────────────────────────
  const [modules, setModules] = useState<(CourseModule & { contents: ModuleContent[] })[]>([]);

  useEffect(() => {
    if (!isOpen || !entry) { setModules([]); return; }
    instituteService.getCourseForTeacher(instituteId, entry.course.id)
      .then((data) => setModules((data?.modules ?? []) as (CourseModule & { contents: ModuleContent[] })[]))
      .catch(() => setModules([]));
  }, [isOpen, entry, instituteId]);

  const lectureDocuments = useMemo<LectureDocument[]>(() => {
    const docs: LectureDocument[] = [];
    for (const mod of modules) {
      for (const c of mod.contents) {
        if ((c.type === "pdf" || c.type === "document") && c.url) {
          docs.push({ id: c.id, title: c.title, url: c.url, moduleTitle: mod.title, type: c.type });
        }
      }
    }
    return docs;
  }, [modules]);

  // ── Populate from entry when it changes ───────────────────────────────────
  useEffect(() => {
    if (!isOpen || !entry) return;
    const qd = entry.content.quizData as any;
    setTitle(entry.content.title ?? "");
    setDescription(entry.content.description ?? "");
    setPassingScore(qd?.passingScore ?? 70);
    setTimeLimit(qd?.timeLimit ?? 0);
    setMaxAttempts(qd?.maxAttempts ?? 1);
    setRequireFaceId(!!(qd?.requireFaceId));
    setRequireScreenShare(!!(qd?.requireScreenShare));
    setError(null);
    if ((qd?.assessmentType ?? "mcq") === "voice") {
      setVoiceQuestions(qd?.voiceQuestions ?? []);
      setVoiceInstructions(entry.content.description ?? "");
      setVoiceNumQ(qd?.voiceQuestions?.length ?? 5);
      setVoiceMarksPerQ(qd?.voiceQuestions?.[0]?.marks ?? 10);
      setShowRegenerate(false);
      setVoiceFile(null);
      setVoiceGenError("");
    } else {
      setQuestions((qd?.questions ?? []).map((q: any) => ({
        id: q.id ?? crypto.randomUUID(),
        question: q.question ?? "",
        options: q.options ?? ["", "", "", ""],
        correctAnswer: q.correctAnswer ?? 0,
        explanation: q.explanation ?? "",
      })));
    }
  }, [isOpen, entry]);

  const newQuestion = (): QuizQuestion => ({
    id: crypto.randomUUID(),
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    explanation: "",
  });

  const updateQuestion = (id: string, patch: Partial<QuizQuestion>) =>
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  // ── Voice regenerate ──────────────────────────────────────────────────────
  const handleVoiceRegenerate = async () => {
    if (!voiceInstructions.trim() && !voiceFile) { setVoiceGenError("Add instructions or upload a document."); return; }
    setVoiceGenError(""); setVoiceGenerating(true);
    try {
      const token = authService.getToken();
      const form = new FormData();
      form.append("instructions", voiceInstructions);
      form.append("num_questions", String(voiceNumQ));
      form.append("marks_per_question", String(voiceMarksPerQ));
      if (voiceFile) form.append("file", voiceFile);
      const res = await fetch(`${API_GATEWAY_URL}/api/ai/voice-assessment/generate`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) throw new Error("Generation failed");
      const data: { questions: VoiceQuestion[] } = await res.json();
      setVoiceQuestions(data.questions);
      setShowRegenerate(false);
    } catch (e) {
      setVoiceGenError(e instanceof Error ? e.message : "Generation failed");
    } finally { setVoiceGenerating(false); }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!entry) return;
    if (!title.trim()) { setError("Title is required."); return; }
    if (!isVoice) {
      const filled = questions.filter((q) => q.question.trim() && q.options.every((o) => o.trim()));
      if (filled.length === 0) { setError("Add at least one complete question."); return; }
    }
    setError(null); setSubmitting(true);
    try {
      const qd = entry.content.quizData as any;
      const updatedQuizData = isVoice
        ? {
            ...qd,
            assessmentType: "voice",
            voiceQuestions,
            totalMarks: voiceQuestions.reduce((s: number, q: VoiceQuestion) => s + q.marks, 0),
            maxAttempts,
            requireFaceId,
            requireScreenShare,
          }
        : {
            ...qd,
            questions: questions.filter((q) => q.question.trim() && q.options.every((o) => o.trim())),
            passingScore,
            timeLimit,
            assessmentType: "mcq",
            maxAttempts,
            requireFaceId,
            requireScreenShare,
          };

      const updated = await instituteService.updateTeacherContent(
        instituteId,
        entry.course.id,
        entry.module.id,
        entry.content.id,
        { title: title.trim(), description: description.trim() || undefined, quizData: updatedQuizData }
      );
      onUpdated(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save changes");
    } finally { setSubmitting(false); }
  };

  if (!isOpen || !entry) return null;

  const modal = (
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[94vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Assessment</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {isVoice ? "Voice Assessment" : "MCQ Quiz"} · {entry.course.name} · {entry.module.title}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Assessment Title <span className="text-red-500">*</span>
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </div>

          {/* Description / Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isVoice ? "Instructions" : "Description"}{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className={inputCls + " resize-none"} />
          </div>

          {/* ══ MCQ — questions ══ */}
          {!isVoice && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Passing Score (%)</label>
                  <input type="number" min={0} max={100} value={passingScore}
                    onChange={(e) => setPassingScore(Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time Limit (min, 0 = none)</label>
                  <input type="number" min={0} value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))} className={inputCls} />
                </div>
              </div>

              <AIGeneratePanel
                onAddQuestions={(qs) => setQuestions((prev) => [...prev, ...qs])}
                lectureDocuments={lectureDocuments}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Questions ({questions.length})</h3>
                  <button type="button" onClick={() => setQuestions((p) => [...p, newQuestion()])}
                    className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                    <FiPlus className="w-3.5 h-3.5" /> Add question
                  </button>
                </div>
                {questions.map((q, i) => (
                  <EditQuestionCard key={q.id} q={q} index={i}
                    onChange={(patch) => updateQuestion(q.id, patch)}
                    onDelete={() => setQuestions((prev) => prev.filter((x) => x.id !== q.id))} />
                ))}
              </div>
            </>
          )}

          {/* ══ VOICE — question list + optional regenerate ══ */}
          {isVoice && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-white">
                    {voiceQuestions.length} questions · {voiceQuestions.reduce((s, q) => s + q.marks, 0)} total marks
                  </span>
                </div>
                <button type="button" onClick={() => setShowRegenerate((p) => !p)}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium flex items-center gap-1">
                  <FiZap className="w-3 h-3" /> {showRegenerate ? "Cancel" : "Regenerate questions"}
                </button>
              </div>

              {/* Regenerate panel */}
              {showRegenerate && (
                <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10 p-4 space-y-3">
                  <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">Regenerate Questions</p>
                  <textarea rows={2} value={voiceInstructions} onChange={(e) => setVoiceInstructions(e.target.value)}
                    placeholder="Topic / instructions…" className={inputCls + " resize-none"} />
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Upload document (optional)</label>
                    <input ref={voiceFileRef} type="file" accept=".pdf,.docx,.doc" className="hidden"
                      onChange={(e) => setVoiceFile(e.target.files?.[0] ?? null)} />
                    <button type="button" onClick={() => voiceFileRef.current?.click()}
                      className="text-xs text-purple-600 dark:text-purple-400 underline">
                      {voiceFile ? voiceFile.name : "Choose file…"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Questions</label>
                      <select value={voiceNumQ} onChange={(e) => setVoiceNumQ(Number(e.target.value))} className={inputCls}>
                        {[3, 4, 5, 6, 7, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Marks per question</label>
                      <select value={voiceMarksPerQ} onChange={(e) => setVoiceMarksPerQ(Number(e.target.value))} className={inputCls}>
                        {[5, 10, 15, 20, 25].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                  {voiceGenError && <p className="text-xs text-red-500">{voiceGenError}</p>}
                  <button type="button" onClick={handleVoiceRegenerate} disabled={voiceGenerating}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold text-white bg-linear-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50">
                    {voiceGenerating
                      ? <><FiLoader className="w-4 h-4 animate-spin" /> Generating…</>
                      : <><FiZap className="w-4 h-4" /> Generate {voiceNumQ} Questions</>}
                  </button>
                </div>
              )}

              {/* Current questions */}
              {!showRegenerate && (
                <div className="space-y-2">
                  {voiceQuestions.map((q, i) => <VoiceQuestionCard key={q.id} q={q} index={i} />)}
                </div>
              )}
            </div>
          )}

          {/* ── Max Attempts ── */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Max Attempts</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">How many times a student can attempt this assessment</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={() => setMaxAttempts((p) => Math.max(1, p - 1))}
                className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold text-lg leading-none">−</button>
              <span className="w-6 text-center text-sm font-bold text-gray-900 dark:text-white">{maxAttempts}</span>
              <button type="button" onClick={() => setMaxAttempts((p) => Math.min(10, p + 1))}
                className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold text-lg leading-none">+</button>
            </div>
          </div>

          {/* ── Face ID toggle ── */}
          <button type="button" onClick={() => setRequireFaceId((p) => !p)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
              requireFaceId ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${requireFaceId ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400"}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${requireFaceId ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300"}`}>
                Require Face Identification
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Students must verify identity before starting</p>
            </div>
            <div className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${requireFaceId ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${requireFaceId ? "translate-x-5" : "translate-x-1"}`} />
            </div>
          </button>

          {/* ── Screen Share Proctoring toggle ── */}
          <button type="button" onClick={() => setRequireScreenShare((p) => !p)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
              requireScreenShare ? "border-purple-500 bg-purple-50 dark:bg-purple-500/10" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${requireScreenShare ? "bg-purple-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400"}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" />
              </svg>
            </div>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${requireScreenShare ? "text-purple-700 dark:text-purple-300" : "text-gray-700 dark:text-gray-300"}`}>
                Require Screen Share Proctoring
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {requireScreenShare
                  ? "Students must share their entire screen — stopping it or switching windows scores 0"
                  : "No screen sharing required — students start the assessment directly"}
              </p>
            </div>
            <div className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${requireScreenShare ? "bg-purple-500" : "bg-gray-200 dark:bg-gray-700"}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${requireScreenShare ? "translate-x-5" : "translate-x-1"}`} />
            </div>
          </button>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
              <FiAlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={submitting || !title.trim()}
            className={`px-5 py-2 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2 shadow-sm ${
              isVoice
                ? "bg-linear-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}>
            {submitting
              ? <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Saving…</>
              : isVoice
                ? <><FiMic className="w-4 h-4" /> Save Changes</>
                : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
}
