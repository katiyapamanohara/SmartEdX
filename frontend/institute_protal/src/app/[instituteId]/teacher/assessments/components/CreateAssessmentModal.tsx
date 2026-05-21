"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Course,
  CourseModule,
  ModuleContent,
  QuizQuestion,
  instituteService,
} from "@/services/instituteService";
import { authService } from "@/services/authService";
import { useFeatures } from "@/context/InstituteFeatureContext";
import {
  FiX, FiPlus, FiTrash2, FiCheckCircle, FiZap, FiChevronDown, FiChevronUp,
  FiLayers, FiMic, FiFileText, FiUpload, FiLoader, FiAlertCircle,
  FiChevronRight, FiAward, FiBook, FiFile,
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface VoiceQuestion {
  id: string;
  question: string;
  expected_answer: string;
  marks: number;
  hints: string[];
}

type AssessmentType = "mcq" | "voice";

export interface LectureDocument {
  id: string;
  title: string;
  url: string;
  moduleTitle: string;
  type: string;
}

// ─── Helper: parse FastAPI error detail (string or pydantic array) ───────────

function parseApiError(err: Record<string, unknown>): string {
  if (!err.detail) return "Something went wrong";
  if (typeof err.detail === "string") return err.detail;
  if (Array.isArray(err.detail)) {
    // Pydantic validation errors: [{loc, msg, type}, ...]
    return (err.detail as { msg?: string; loc?: string[] }[])
      .map((e) => `${e.loc?.join(" → ") ?? "field"}: ${e.msg ?? "invalid"}`)
      .join("; ");
  }
  return String(err.detail);
}

// ─── Document source picker (shared by MCQ panel + Voice section) ─────────────

type DocSource = "upload" | "course";

function DocumentSourcePicker({
  source,
  onSourceChange,
  file,
  onFileChange,
  fileRef,
  lectureDocuments,
  selectedDocId,
  onDocSelect,
  accentClass = "purple",
}: {
  source: DocSource;
  onSourceChange: (s: DocSource) => void;
  file: File | null;
  onFileChange: (f: File | null) => void;
  fileRef: React.RefObject<HTMLInputElement>;
  lectureDocuments: LectureDocument[];
  selectedDocId: string;
  onDocSelect: (id: string) => void;
  accentClass?: string;
}) {
  const hasDocs = lectureDocuments.length > 0;
  const accent = accentClass === "blue" ? {
    tab: "bg-blue-600",
    border: "border-blue-400 dark:border-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-500",
    hover: "hover:border-blue-400 dark:hover:border-blue-500",
    hoverText: "hover:text-blue-600 dark:hover:text-blue-400",
    check: "text-blue-500",
  } : {
    tab: "bg-purple-600",
    border: "border-purple-400 dark:border-purple-500",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    text: "text-purple-700 dark:text-purple-300",
    ring: "ring-purple-500",
    hover: "hover:border-purple-400 dark:hover:border-purple-500",
    hoverText: "hover:text-purple-600 dark:hover:text-purple-400",
    check: "text-purple-500",
  };

  return (
    <div className="space-y-3">
      {/* Source toggle */}
      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs font-medium">
        <button
          type="button"
          onClick={() => onSourceChange("upload")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${
            source === "upload" ? `${accent.tab} text-white` : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          <FiUpload className="w-3.5 h-3.5" /> Upload file
        </button>
        <button
          type="button"
          onClick={() => hasDocs && onSourceChange("course")}
          title={!hasDocs ? "No documents uploaded in this course yet" : undefined}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 border-l border-gray-200 dark:border-gray-700 transition-colors ${
            !hasDocs
              ? "opacity-40 cursor-not-allowed text-gray-400 dark:text-gray-600"
              : source === "course"
              ? `${accent.tab} text-white`
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          <FiBook className="w-3.5 h-3.5" /> From course
          {hasDocs && (
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              source === "course" ? "bg-white/20 text-white" : `${accent.bg} ${accent.text}`
            }`}>
              {lectureDocuments.length}
            </span>
          )}
        </button>
      </div>

      {/* Upload area */}
      {source === "upload" && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.doc,.pptx,.ppt"
            className="hidden"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 ${accent.hover} text-sm text-gray-500 dark:text-gray-400 ${accent.hoverText} transition-colors group`}
          >
            <FiUpload className="w-4 h-4 group-hover:scale-110 transition-transform shrink-0" />
            {file ? (
              <span className={`${accent.text} font-medium truncate`}>{file.name}</span>
            ) : (
              <span>Upload PDF, DOCX, or TXT document</span>
            )}
            {file && (
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); onFileChange(null); }}
                className="ml-auto text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                <FiX className="w-3.5 h-3.5" />
              </span>
            )}
          </button>
        </>
      )}

      {/* Course document picker */}
      {source === "course" && (
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {lectureDocuments.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No PDF or document content in this course.</p>
          ) : (
            lectureDocuments.map((doc) => {
              const isSelected = selectedDocId === doc.id;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => onDocSelect(isSelected ? "" : doc.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? `${accent.border} ${accent.bg}`
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    isSelected ? `${accent.bg} ${accent.text}` : "bg-gray-100 dark:bg-gray-700 text-gray-400"
                  }`}>
                    <FiFile className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${isSelected ? accent.text : "text-gray-800 dark:text-gray-200"}`}>
                      {doc.title}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{doc.moduleTitle}</p>
                  </div>
                  {isSelected && <FiCheckCircle className={`w-4 h-4 shrink-0 ${accent.check}`} />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── MCQ AI Generate Panel ────────────────────────────────────────────────────

function AIGeneratePanel({
  onAddQuestions,
  lectureDocuments,
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

  const selectedDoc = lectureDocuments.find((d) => d.id === selectedDocId) ?? null;
  const canGenerate = docSource === "upload" ? !!file : !!selectedDocId;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true); setAiError(null); setGenerated([]);
    try {
      const form = new FormData();

      if (docSource === "course" && selectedDoc) {
        // Send URL — gateway fetches it server-side (no browser CORS)
        form.append("document_url", selectedDoc.url);
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

  // Reset generated when source / selection changes
  useEffect(() => { setGenerated([]); setSelected(new Set()); setAiError(null); }, [docSource, selectedDocId, file]);

  return (
    <div className="border border-dashed border-purple-300 dark:border-purple-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
      >
        <FiZap className="w-4 h-4" /> Generate with AI
        {open ? <FiChevronUp className="w-4 h-4 ml-auto" /> : <FiChevronDown className="w-4 h-4 ml-auto" />}
      </button>

      {open && (
        <div className="px-4 py-4 space-y-3 bg-white dark:bg-gray-800">
          {/* Document source */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Document Source</label>
            <DocumentSourcePicker
              source={docSource}
              onSourceChange={(s) => { setDocSource(s); setFile(null); setSelectedDocId(""); }}
              file={file}
              onFileChange={setFile}
              fileRef={fileRef as React.RefObject<HTMLInputElement>}
              lectureDocuments={lectureDocuments}
              selectedDocId={selectedDocId}
              onDocSelect={setSelectedDocId}
              accentClass="purple"
            />
          </div>

          {/* Config row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Questions</label>
              <input
                type="number" min={1} max={20} value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
                className={inputCls}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate || loading}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading
              ? <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Generating…</>
              : <><FiZap className="w-4 h-4" /> Generate</>
            }
          </button>

          {aiError && <p className="text-xs text-red-500">{aiError}</p>}

          {generated.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {generated.length} questions generated — select to add:
              </p>
              {generated.map((q, i) => (
                <div
                  key={q.id}
                  onClick={() => toggleSelect(q.id)}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-xs transition-colors ${
                    selected.has(q.id)
                      ? "border-purple-400 bg-purple-50 dark:bg-purple-900/20"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <FiCheckCircle className={`w-4 h-4 shrink-0 mt-0.5 ${selected.has(q.id) ? "text-purple-500" : "text-gray-300"}`} />
                    <span className="text-gray-800 dark:text-gray-200">{i + 1}. {q.question}</span>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAdd}
                disabled={selected.size === 0}
                className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
              >
                Add {selected.size} selected question{selected.size !== 1 ? "s" : ""}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MCQ Question card ────────────────────────────────────────────────────────

function QuestionCard({ q, index, onChange, onDelete }: {
  q: QuizQuestion; index: number; onChange: (patch: Partial<QuizQuestion>) => void; onDelete: () => void;
}) {
  const LETTERS = ["A", "B", "C", "D"];
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700/40">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Q{index + 1}</span>
        <input value={q.question} onChange={(e) => onChange({ question: e.target.value })} placeholder="Enter question…"
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
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
      >
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
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Hints for student</p>
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

  const { hasFeature } = useFeatures();
  const voiceEnabled = hasFeature("voice_agent");
  const faceIdEnabled = hasFeature("exam_proctoring");

  // ── Type selector ────────────────────────────────────────────────────────
  const [assessmentType, setAssessmentType] = useState<AssessmentType>("mcq");

  // ── Shared fields ────────────────────────────────────────────────────────
  const [courseId, setCourseId]               = useState("");
  const [moduleMode, setModuleMode]           = useState<"existing" | "new">("existing");
  const [moduleId, setModuleId]               = useState("");
  const [newModuleName, setNewModuleName]     = useState("");
  const [modules, setModules]                 = useState<(CourseModule & { contents: ModuleContent[] })[]>([]);
  const [modulesLoading, setModulesLoading]   = useState(false);
  const [title, setTitle]                     = useState("");
  const [description, setDescription]         = useState("");
  const [submitting, setSubmitting]           = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  // ── Shared: face ID + max attempts ──────────────────────────────────────
  const [requireFaceId, setRequireFaceId]     = useState(false);
  const [maxAttempts, setMaxAttempts]         = useState(1);

  // ── MCQ-specific ─────────────────────────────────────────────────────────
  const [passingScore, setPassingScore]       = useState(70);
  const [timeLimit, setTimeLimit]             = useState(0);
  const [questions, setQuestions]             = useState<QuizQuestion[]>([newQuestion()]);

  // ── Voice-specific ───────────────────────────────────────────────────────
  const [voiceInstructions, setVoiceInstructions]   = useState("");
  const [voiceDocSource, setVoiceDocSource]         = useState<DocSource>("upload");
  const [voiceFile, setVoiceFile]                   = useState<File | null>(null);
  const [voiceSelectedDocId, setVoiceSelectedDocId] = useState("");
  const [voiceNumQ, setVoiceNumQ]                   = useState(5);
  const [voiceMarksPerQ, setVoiceMarksPerQ]         = useState(10);
  const [voiceGenerating, setVoiceGenerating]       = useState(false);
  const [voiceGenError, setVoiceGenError]           = useState("");
  const [voiceQuestions, setVoiceQuestions]         = useState<VoiceQuestion[]>([]);
  const [voiceStep, setVoiceStep]                   = useState<"config" | "preview">("config");
  const voiceFileRef                                = useRef<HTMLInputElement>(null);

  const selectedCourse = courses.find((c) => c.id === courseId) ?? null;

  // ── Derive lecture documents from loaded modules ─────────────────────────
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

  // ── Reset on open ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setAssessmentType("mcq");
      setCourseId(""); setModuleMode("existing"); setModuleId(""); setNewModuleName(""); setModules([]);
      setTitle(""); setDescription(""); setPassingScore(70); setTimeLimit(0);
      setRequireFaceId(false); setMaxAttempts(1);
      setQuestions([newQuestion()]); setError(null);
      setVoiceInstructions(""); setVoiceDocSource("upload"); setVoiceFile(null); setVoiceSelectedDocId("");
      setVoiceNumQ(5); setVoiceMarksPerQ(10);
      setVoiceGenerating(false); setVoiceGenError(""); setVoiceQuestions([]); setVoiceStep("config");
    }
  }, [isOpen]);

  // ── Load modules when course changes ─────────────────────────────────────
  useEffect(() => {
    if (!courseId) { setModules([]); setModuleId(""); return; }
    setModulesLoading(true); setModuleId("");
    // Reset voice doc selection when course changes
    setVoiceSelectedDocId(""); setVoiceDocSource("upload");
    instituteService.getCourseForTeacher(instituteId, courseId)
      .then((data) => setModules((data?.modules ?? []) as (CourseModule & { contents: ModuleContent[] })[]))
      .finally(() => setModulesLoading(false));
  }, [courseId, instituteId]);

  // ── Generate voice questions ──────────────────────────────────────────────
  async function handleVoiceGenerate() {
    const hasDoc = voiceDocSource === "upload" ? !!voiceFile : !!voiceSelectedDocId;
    if (!voiceInstructions.trim() && !hasDoc) {
      setVoiceGenError("Add instructions or select / upload a document.");
      return;
    }
    setVoiceGenError(""); setVoiceGenerating(true);
    try {
      const token = authService.getToken();
      const form = new FormData();
      form.append("instructions", voiceInstructions);
      form.append("num_questions", String(voiceNumQ));
      form.append("marks_per_question", String(voiceMarksPerQ));

      if (voiceDocSource === "upload" && voiceFile) {
        form.append("file", voiceFile);
      } else if (voiceDocSource === "course" && voiceSelectedDocId) {
        const doc = lectureDocuments.find((d) => d.id === voiceSelectedDocId);
        if (doc) {
          // Send URL — gateway fetches it server-side (no browser CORS)
          form.append("document_url", doc.url);
        }
      }

      const res = await fetch(`${API_GATEWAY_URL}/api/ai/voice-assessment/generate`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(parseApiError(err)); }
      const data: { questions: VoiceQuestion[] } = await res.json();
      setVoiceQuestions(data.questions);
      setVoiceStep("preview");
    } catch (e: unknown) {
      setVoiceGenError(e instanceof Error ? e.message : "Generation failed");
    } finally { setVoiceGenerating(false); }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !title.trim()) { setError("Select a course and provide a title."); return; }
    if (moduleMode === "existing" && !moduleId) { setError("Select a content field or switch to create new."); return; }
    if (moduleMode === "new" && !newModuleName.trim()) { setError("Enter a content field name."); return; }

    if (assessmentType === "mcq") {
      const filled = questions.filter((q) => q.question.trim() && q.options.every((o) => o.trim()));
      if (filled.length === 0) { setError("Add at least one complete question."); return; }
      setError(null); setSubmitting(true);
      try {
        const content = await instituteService.createTeacherAssessmentSmart(instituteId, courseId, {
          ...(moduleMode === "existing" ? { moduleId } : { moduleName: newModuleName.trim() }),
          title: title.trim(),
          description: description.trim() || undefined,
          quizData: { questions: filled, passingScore, timeLimit, assessmentType: "mcq", requireFaceId, maxAttempts },
        });
        const modTitle = moduleMode === "existing"
          ? (modules.find((m) => m.id === moduleId)?.title ?? "") : newModuleName.trim();
        onCreated({ course: selectedCourse!, content, moduleTitle: modTitle });
        onClose();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to create assessment");
      } finally { setSubmitting(false); }
    } else {
      if (voiceQuestions.length === 0) { setError("Generate voice questions first."); return; }
      setError(null); setSubmitting(true);
      try {
        const content = await instituteService.createTeacherAssessmentSmart(instituteId, courseId, {
          ...(moduleMode === "existing" ? { moduleId } : { moduleName: newModuleName.trim() }),
          title: title.trim(),
          description: (voiceInstructions.trim() || description.trim()) || undefined,
          quizData: {
            assessmentType: "voice",
            voiceQuestions,
            questions: [],
            passingScore: 50,
            timeLimit: 0,
            totalMarks: voiceQuestions.reduce((s, q) => s + q.marks, 0),
            requireFaceId,
            maxAttempts,
          },
        });
        const modTitle = moduleMode === "existing"
          ? (modules.find((m) => m.id === moduleId)?.title ?? "") : newModuleName.trim();
        onCreated({ course: selectedCourse!, content, moduleTitle: modTitle });
        onClose();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to create assessment");
      } finally { setSubmitting(false); }
    }
  };

  if (!isOpen) return null;

  const updateQuestion = (id: string, patch: Partial<QuizQuestion>) =>
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const voiceCanGenerate =
    !!voiceInstructions.trim() ||
    (voiceDocSource === "upload" && !!voiceFile) ||
    (voiceDocSource === "course" && !!voiceSelectedDocId);

  const modal = (
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[94vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Assessment</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* ── Assessment type selector ── */}
        <div className="px-6 pt-5 pb-1 shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAssessmentType("mcq")}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-left ${
                assessmentType === "mcq"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${assessmentType === "mcq" ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                <FiFileText className="w-4 h-4" />
              </div>
              <div>
                <p className={`text-sm font-semibold ${assessmentType === "mcq" ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300"}`}>MCQ Quiz</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Multiple choice questions</p>
              </div>
              {assessmentType === "mcq" && <FiCheckCircle className="w-4 h-4 text-blue-500 ml-auto shrink-0" />}
            </button>

            <button
              type="button"
              disabled={!voiceEnabled}
              onClick={() => voiceEnabled && setAssessmentType("voice")}
              title={!voiceEnabled ? "Voice Agent feature is not enabled for this institute" : undefined}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-left ${
                !voiceEnabled
                  ? "border-gray-100 dark:border-gray-800 opacity-40 cursor-not-allowed"
                  : assessmentType === "voice"
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-500/10"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${assessmentType === "voice" && voiceEnabled ? "bg-linear-to-br from-purple-500 to-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                <FiMic className="w-4 h-4" />
              </div>
              <div>
                <p className={`text-sm font-semibold ${assessmentType === "voice" && voiceEnabled ? "text-purple-700 dark:text-purple-300" : "text-gray-700 dark:text-gray-300"}`}>Voice Assessment</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{voiceEnabled ? "AI interview — spoken answers" : "Not enabled for this institute"}</p>
              </div>
              {assessmentType === "voice" && voiceEnabled && <FiCheckCircle className="w-4 h-4 text-purple-500 ml-auto shrink-0" />}
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Course */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Course <span className="text-red-500">*</span>
            </label>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} required className={inputCls}>
              <option value="">Select course…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.batchNumber ? ` — Batch ${c.batchNumber}` : ""}</option>
              ))}
            </select>
            {selectedCourse?.batchNumber && (
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                  Batch {selectedCourse.batchNumber}
                </span>
                {selectedCourse.code && <span className="text-gray-400">· {selectedCourse.code}</span>}
              </p>
            )}
          </div>

          {/* Content Field */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FiLayers className="w-4 h-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Content Field <span className="text-red-500">*</span></label>
            </div>
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs font-medium">
              <button type="button" onClick={() => setModuleMode("existing")}
                className={`flex-1 py-2 transition-colors ${moduleMode === "existing" ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                Select existing
              </button>
              <button type="button" onClick={() => setModuleMode("new")}
                className={`flex-1 py-2 transition-colors border-l border-gray-200 dark:border-gray-700 ${moduleMode === "new" ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                Create new
              </button>
            </div>
            {moduleMode === "existing" ? (
              <select value={moduleId} onChange={(e) => setModuleId(e.target.value)}
                disabled={!courseId || modulesLoading} className={inputCls}>
                <option value="">{modulesLoading ? "Loading…" : !courseId ? "Select a course first" : modules.length === 0 ? "No content fields — create new" : "Select content field…"}</option>
                {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            ) : (
              <input value={newModuleName} onChange={(e) => setNewModuleName(e.target.value)}
                placeholder="Content field name, e.g. Chapter 1 Assessments" className={inputCls} />
            )}
          </div>

          {/* Assessment Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Assessment Title <span className="text-red-500">*</span>
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required
              placeholder={assessmentType === "voice" ? "e.g. Python Basics Voice Interview" : "e.g. Chapter 1 Quiz"}
              className={inputCls} />
          </div>

          {/* ═══════════════════ MCQ SECTION ═══════════════════ */}
          {assessmentType === "mcq" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instructions (optional)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                  placeholder="Any instructions for students…" className={inputCls + " resize-none"} />
              </div>
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
                  <QuestionCard key={q.id} q={q} index={i}
                    onChange={(patch) => updateQuestion(q.id, patch)}
                    onDelete={() => setQuestions((prev) => prev.filter((x) => x.id !== q.id))} />
                ))}
              </div>
            </>
          )}

          {/* ═══════════════════ VOICE SECTION ═══════════════════ */}
          {assessmentType === "voice" && (
            <div className="space-y-4">
              {voiceStep === "config" && (
                <>
                  {/* How it works banner */}
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20">
                    <FiMic className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-purple-700 dark:text-purple-300 leading-relaxed">
                      <p className="font-semibold mb-1">How Voice Assessment works</p>
                      <p>Describe the topic or select a lecture document → AI generates open-ended questions → Students answer via microphone like a real interview → AI marks each answer and records the score.</p>
                    </div>
                  </div>

                  {/* Instructions textarea */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Topic / Instructions <span className="text-gray-400 font-normal">(optional if document selected)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={voiceInstructions}
                      onChange={(e) => setVoiceInstructions(e.target.value)}
                      placeholder="Describe what to assess. E.g. 'Test students on Python functions, loops, and error handling. Intermediate difficulty.'"
                      className={inputCls + " resize-none"}
                    />
                  </div>

                  {/* Document source */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Study Material{" "}
                      <span className="text-gray-400 font-normal">(optional — helps AI generate better questions)</span>
                    </label>
                    <DocumentSourcePicker
                      source={voiceDocSource}
                      onSourceChange={(s) => { setVoiceDocSource(s); setVoiceFile(null); setVoiceSelectedDocId(""); }}
                      file={voiceFile}
                      onFileChange={setVoiceFile}
                      fileRef={voiceFileRef as React.RefObject<HTMLInputElement>}
                      lectureDocuments={lectureDocuments}
                      selectedDocId={voiceSelectedDocId}
                      onDocSelect={setVoiceSelectedDocId}
                      accentClass="purple"
                    />
                  </div>

                  {/* Config: questions + marks */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Number of Questions</label>
                      <select value={voiceNumQ} onChange={(e) => setVoiceNumQ(Number(e.target.value))} className={inputCls}>
                        {[3, 4, 5, 6, 7, 8, 10].map((n) => <option key={n} value={n}>{n} questions</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marks per Question</label>
                      <select value={voiceMarksPerQ} onChange={(e) => setVoiceMarksPerQ(Number(e.target.value))} className={inputCls}>
                        {[5, 10, 15, 20, 25].map((n) => <option key={n} value={n}>{n} marks</option>)}
                      </select>
                    </div>
                  </div>

                  {voiceGenError && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                      <FiAlertCircle className="w-4 h-4 shrink-0" /> {voiceGenError}
                    </div>
                  )}

                  {/* Generate button */}
                  <button
                    type="button"
                    onClick={handleVoiceGenerate}
                    disabled={voiceGenerating || !voiceCanGenerate}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-gray-700 dark:disabled:to-gray-700 disabled:text-gray-400 transition-all shadow-md shadow-purple-500/20 disabled:shadow-none"
                  >
                    {voiceGenerating
                      ? <><FiLoader className="w-4 h-4 animate-spin" /> Generating {voiceNumQ} questions…</>
                      : <><FiZap className="w-4 h-4" /> Generate {voiceNumQ} Voice Questions</>
                    }
                  </button>
                </>
              )}

              {voiceStep === "preview" && voiceQuestions.length > 0 && (
                <>
                  {/* Preview header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FiCheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-semibold text-gray-800 dark:text-white">
                        {voiceQuestions.length} questions · {voiceQuestions.reduce((s, q) => s + q.marks, 0)} total marks
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVoiceStep("config")}
                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium flex items-center gap-1"
                    >
                      ← Regenerate
                    </button>
                  </div>

                  <div className="space-y-2">
                    {voiceQuestions.map((q, i) => <VoiceQuestionCard key={q.id} q={q} index={i} />)}
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-xs text-green-700 dark:text-green-400">
                    <FiAward className="w-4 h-4 shrink-0" />
                    <p>Students will answer each question via microphone. AI marks each answer and records the result with per-question feedback.</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Max attempts (shared for all types) ── */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
              <FiChevronRight className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Max Attempts</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">How many times a student can attempt this assessment</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setMaxAttempts((p) => Math.max(1, p - 1))}
                className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold text-lg leading-none"
              >−</button>
              <span className="w-6 text-center text-sm font-bold text-gray-900 dark:text-white">{maxAttempts}</span>
              <button
                type="button"
                onClick={() => setMaxAttempts((p) => Math.min(10, p + 1))}
                className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold text-lg leading-none"
              >+</button>
            </div>
          </div>

          {/* ── Face ID toggle (shared for all types) ── */}
          <button
            type="button"
            disabled={!faceIdEnabled}
            onClick={() => faceIdEnabled && setRequireFaceId((p) => !p)}
            title={!faceIdEnabled ? "Exam Proctoring feature is not enabled for this institute" : undefined}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
              !faceIdEnabled
                ? "border-gray-100 dark:border-gray-800 opacity-40 cursor-not-allowed"
                : requireFaceId
                ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${requireFaceId && faceIdEnabled ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400"}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${requireFaceId && faceIdEnabled ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300"}`}>
                Require Face Identification
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {faceIdEnabled ? "Students must verify their identity before starting this assessment" : "Not enabled — enable Exam Proctoring in Features & Plan"}
              </p>
            </div>
            <div className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${requireFaceId && faceIdEnabled ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${requireFaceId && faceIdEnabled ? "translate-x-5" : "translate-x-1"}`} />
            </div>
          </button>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
              <FiAlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </form>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler<HTMLButtonElement>}
            disabled={
              submitting || !courseId || !title.trim() ||
              (assessmentType === "voice" && (voiceQuestions.length === 0 || voiceStep === "config"))
            }
            className={`px-5 py-2 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2 shadow-sm ${
              assessmentType === "voice"
                ? "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-purple-500/25"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {submitting
              ? <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Saving…</>
              : assessmentType === "voice"
                ? <><FiMic className="w-4 h-4" /> Save Voice Assessment</>
                : <><FiChevronRight className="w-4 h-4" /> Create Assessment</>
            }
          </button>
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
}
