"use client";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ModuleContent, ContentType, QuizQuestion } from "@/services/instituteService";
import AiDescriptionField from "@/components/common/AiDescriptionField";
import {
  FiX,
  FiFile,
  FiVideo,
  FiFileText,
  FiHelpCircle,
  FiLink,
  FiUpload,
  FiPlus,
  FiTrash2,
  FiCheckCircle,
  FiZap,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";

interface ContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: ModuleContent | null;
}

// ─── Per-type config ─────────────────────────────────────────────
const TYPE_META: Record<
  ContentType,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    urlLabel: string;
    urlPlaceholder: string;
    urlRequired: boolean;
    urlHint?: string;
    descPlaceholder: string;
    showUrl: boolean;
  }
> = {
  pdf: {
    label: "PDF Document",
    icon: <FiFile className="w-5 h-5" />,
    color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    urlLabel: "PDF URL",
    urlPlaceholder: "https://example.com/document.pdf",
    urlRequired: false,
    urlHint: "Direct link to a PDF file (Google Drive, Dropbox, server URL, etc.)",
    descPlaceholder: "Describe what students will find in this PDF…",
    showUrl: true,
  },
  video: {
    label: "Video",
    icon: <FiVideo className="w-5 h-5" />,
    color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    urlLabel: "Video URL",
    urlPlaceholder: "https://youtube.com/watch?v=… or https://vimeo.com/…",
    urlRequired: true,
    urlHint: "YouTube, Vimeo, or any direct video link",
    descPlaceholder: "What will students learn from this video?",
    showUrl: true,
  },
  document: {
    label: "Document",
    icon: <FiFileText className="w-5 h-5" />,
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    urlLabel: "Document URL",
    urlPlaceholder: "https://docs.google.com/… or any document link",
    urlRequired: false,
    urlHint: "Google Docs, Word Online, Notion, or any shareable doc link",
    descPlaceholder: "Describe the document content…",
    showUrl: true,
  },
  quiz: {
    label: "Quiz",
    icon: <FiHelpCircle className="w-5 h-5" />,
    color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    urlLabel: "",
    urlPlaceholder: "",
    urlRequired: false,
    descPlaceholder: "Instructions for the quiz — topics covered, time limit, number of questions…",
    showUrl: false,
  },
  link: {
    label: "External Link",
    icon: <FiLink className="w-5 h-5" />,
    color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    urlLabel: "Link URL",
    urlPlaceholder: "https://…",
    urlRequired: true,
    urlHint: "Any external web page, article, or resource",
    descPlaceholder: "Describe what students will find at this link…",
    showUrl: true,
  },
};

const CONTENT_TYPES = Object.entries(TYPE_META).map(([value, meta]) => ({
  value: value as ContentType,
  label: meta.label,
}));

// ─── Input / label helpers ───────────────────────────────────────
const inputCls =
  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const Label = ({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) => (
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
    {children}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const Hint = ({ text }: { text: string }) => (
  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{text}</p>
);

// AI requests go through the API gateway at /api/ai/*
const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";

// ─── Empty quiz question factory ─────────────────────────────────
const newQuestion = (): QuizQuestion => ({
  id: crypto.randomUUID(),
  question: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  explanation: "",
});

// ─── AI Generate Panel ────────────────────────────────────────────
const AIGeneratePanel = ({
  onAddQuestions,
}: {
  onAddQuestions: (qs: QuizQuestion[]) => void;
}) => {
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
      const res = await fetch(`${API_GATEWAY_URL}/api/ai/quiz/generate`, {
        method: "POST",
        body: form,
      });
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
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const updateGenerated = (id: string, patch: Partial<QuizQuestion>) =>
    setGenerated((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const updateOption = (id: string, idx: number, value: string) => {
    const q = generated.find((q) => q.id === id)!;
    const options = [...q.options] as [string, string, string, string];
    options[idx] = value;
    updateGenerated(id, { options });
  };

  const handleAdd = () => {
    onAddQuestions(generated.filter((q) => selected.has(q.id)));
    setGenerated([]);
    setSelected(new Set());
    setFile(null);
    setOpen(false);
  };

  return (
    <div className="border border-blue-200 dark:border-blue-800 rounded-xl overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <FiZap className="w-4 h-4" />
          AI Generate from Document
        </span>
        {open ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-white dark:bg-gray-900">
          {/* File pick */}
          <div>
            <Label>Upload Document</Label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.doc,.pptx,.ppt"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex items-center gap-3 p-3 border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <FiFile className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                <span className="text-sm text-green-800 dark:text-green-300 flex-1 truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors text-sm text-gray-500 dark:text-gray-400"
              >
                <FiUpload className="w-4 h-4" />
                Select PDF, Word, or PowerPoint file
              </button>
            )}
            <Hint text="PDF, .docx, .doc, .pptx, .ppt supported" />
          </div>

          {/* Options row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Number of Questions</Label>
              <input
                type="number"
                min={1}
                max={20}
                value={numQuestions}
                onChange={(e) => setNumQuestions(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                className={inputCls}
              />
            </div>
            <div>
              <Label>Difficulty</Label>
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

          {/* Generate button */}
          <button
            type="button"
            disabled={!file || loading}
            onClick={handleGenerate}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <FiZap className="w-4 h-4" />
                Generate Quiz
              </>
            )}
          </button>

          {/* Error */}
          {aiError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {aiError}
            </div>
          )}

          {/* Generated questions list */}
          {generated.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Generated Questions ({generated.length})
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setSelected(
                      selected.size === generated.length
                        ? new Set()
                        : new Set(generated.map((q) => q.id))
                    )
                  }
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {selected.size === generated.length ? "Deselect all" : "Select all"}
                </button>
              </div>

              {generated.map((q, qi) => (
                <div
                  key={q.id}
                  className={`border rounded-xl p-3 space-y-2 transition-colors ${
                    selected.has(q.id)
                      ? "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10"
                      : "border-gray-200 dark:border-gray-700 opacity-60"
                  }`}
                >
                  {/* Select toggle */}
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSelect(q.id)}
                      className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selected.has(q.id)
                          ? "border-blue-500 bg-blue-500 text-white"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {selected.has(q.id) && <FiCheckCircle className="w-3 h-3" />}
                    </button>
                    <span className="text-xs font-semibold text-gray-400 shrink-0 mt-0.5">Q{qi + 1}</span>
                    <textarea
                      rows={2}
                      value={q.question}
                      onChange={(e) => updateGenerated(q.id, { question: e.target.value })}
                      className={`${inputCls} resize-none flex-1`}
                    />
                  </div>

                  {/* Options */}
                  <div className="space-y-1.5 pl-7">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateGenerated(q.id, { correctAnswer: oi })}
                          className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            q.correctAnswer === oi
                              ? "border-green-500 bg-green-500 text-white"
                              : "border-gray-300 dark:border-gray-600 text-transparent hover:border-green-400"
                          }`}
                          title="Mark correct"
                        >
                          <FiCheckCircle className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-gray-400 w-3">{String.fromCharCode(65 + oi)}</span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(q.id, oi, e.target.value)}
                          className={`${inputCls} text-xs py-1`}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Explanation */}
                  {q.explanation !== undefined && (
                    <div className="pl-7">
                      <input
                        type="text"
                        value={q.explanation}
                        onChange={(e) => updateGenerated(q.id, { explanation: e.target.value })}
                        placeholder="Explanation (optional)…"
                        className={`${inputCls} text-xs py-1`}
                      />
                    </div>
                  )}
                </div>
              ))}

              {/* Add to quiz */}
              <button
                type="button"
                disabled={selected.size === 0}
                onClick={handleAdd}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <FiPlus className="w-4 h-4" />
                Add {selected.size} Selected Question{selected.size !== 1 ? "s" : ""} to Quiz
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Quiz Builder ─────────────────────────────────────────────────
const QuizBuilder = ({
  questions,
  passingScore,
  timeLimit,
  onChange,
}: {
  questions: QuizQuestion[];
  passingScore: number;
  timeLimit: number;
  onChange: (data: { questions: QuizQuestion[]; passingScore: number; timeLimit: number }) => void;
}) => {
  const setQuestions = (qs: QuizQuestion[]) =>
    onChange({ questions: qs, passingScore, timeLimit });
  const setPassingScore = (v: number) =>
    onChange({ questions, passingScore: v, timeLimit });
  const setTimeLimit = (v: number) =>
    onChange({ questions, passingScore, timeLimit: v });

  const addQuestion = () => setQuestions([...questions, newQuestion()]);
  const handleAiAdd = (qs: QuizQuestion[]) =>
    setQuestions([...questions, ...qs]);

  const removeQuestion = (id: string) =>
    setQuestions(questions.filter((q) => q.id !== id));

  const updateQuestion = (id: string, patch: Partial<QuizQuestion>) =>
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const updateOption = (qId: string, idx: number, value: string) => {
    const q = questions.find((q) => q.id === qId)!;
    const options = [...q.options] as [string, string, string, string];
    options[idx] = value;
    updateQuestion(qId, { options });
  };

  return (
    <div className="space-y-4">
      {/* AI Generate Panel */}
      <AIGeneratePanel onAddQuestions={handleAiAdd} />

      {/* Quiz settings */}
      <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div>
          <Label>Passing Score (%)</Label>
          <input
            type="number"
            min={0}
            max={100}
            value={passingScore}
            onChange={(e) => setPassingScore(parseInt(e.target.value) || 0)}
            className={inputCls}
          />
        </div>
        <div>
          <Label>Time Limit (min)</Label>
          <input
            type="number"
            min={0}
            value={timeLimit}
            onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
            placeholder="0 = no limit"
            className={inputCls}
          />
        </div>
      </div>

      {/* Questions */}
      {questions.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
          No questions yet. Click "Add Question" to start building your quiz.
        </p>
      )}

      {questions.map((q, qi) => (
        <div
          key={q.id}
          className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 bg-white dark:bg-gray-900"
        >
          {/* Question header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Question {qi + 1}
            </span>
            <button
              type="button"
              onClick={() => removeQuestion(q.id)}
              className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Question text */}
          <textarea
            rows={2}
            value={q.question}
            onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
            placeholder="Enter your question…"
            className={`${inputCls} resize-none`}
          />

          {/* Options */}
          <div className="space-y-2">
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateQuestion(q.id, { correctAnswer: oi })}
                  className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    q.correctAnswer === oi
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-gray-300 dark:border-gray-600 text-transparent hover:border-green-400"
                  }`}
                  title="Mark as correct answer"
                >
                  <FiCheckCircle className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 w-4">
                  {String.fromCharCode(65 + oi)}
                </span>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(q.id, oi, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                  className={inputCls}
                />
              </div>
            ))}
          </div>
          <Hint text="Click the circle next to an option to mark it as the correct answer." />

          {/* Explanation */}
          <div>
            <Label>Explanation (optional)</Label>
            <input
              type="text"
              value={q.explanation || ""}
              onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
              placeholder="Explain why this answer is correct…"
              className={inputCls}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addQuestion}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors text-sm font-medium"
      >
        <FiPlus className="w-4 h-4" />
        Add Question
      </button>
    </div>
  );
};

// ─── File upload configs per uploadable type ─────────────────────
const FILE_UPLOAD_CONFIG = {
  pdf: {
    accept: ".pdf,application/pdf",
    label: "PDF file",
    hint: "PDF files only",
    urlLabel: "PDF URL",
    urlPlaceholder: "https://example.com/document.pdf",
    urlHint: "Direct link to a PDF file (Google Drive, Dropbox, server URL, etc.)",
  },
  document: {
    accept:
      ".doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.odp,.ods," +
      "application/msword," +
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
      "application/vnd.ms-powerpoint," +
      "application/vnd.openxmlformats-officedocument.presentationml.presentation," +
      "application/vnd.ms-excel," +
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    label: "Word, PowerPoint, or Excel file",
    hint: ".docx  .pptx  .xlsx  .doc  .ppt  .xls  .odt  .odp  .ods",
    urlLabel: "Document URL",
    urlPlaceholder: "https://docs.google.com/… or any document link",
    urlHint: "Google Docs, Word Online, Notion, or any shareable doc link",
  },
  video: {
    accept: ".mp4,.webm,.mov,.avi,.mkv,video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska",
    label: "video file",
    hint: ".mp4  .webm  .mov  .avi  .mkv",
    urlLabel: "Video URL",
    urlPlaceholder: "https://youtube.com/watch?v=… or https://vimeo.com/…",
    urlHint: "YouTube, Vimeo, or any direct video link",
  },
} as const;

// ─── Shared file upload section ───────────────────────────────────
const FileUploadSection = ({
  contentType,
  mode,
  onModeChange,
  url,
  onUrlChange,
  file,
  onFileChange,
}: {
  contentType: "pdf" | "document" | "video";
  mode: "file" | "url";
  onModeChange: (m: "file" | "url") => void;
  url: string;
  onUrlChange: (v: string) => void;
  file: File | null;
  onFileChange: (f: File | null) => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cfg = FILE_UPLOAD_CONFIG[contentType];

  return (
    <div>
      {/* Toggle */}
      <div className="flex gap-1 mb-3 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        {(["file", "url"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              mode === m
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {m === "file" ? "Upload File" : "Enter URL"}
          </button>
        ))}
      </div>

      {mode === "file" ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={cfg.accept}
            className="hidden"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex items-center gap-3 p-3 border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <FiFile className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800 dark:text-green-300 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-green-600 dark:text-green-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onFileChange(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center gap-2 p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
            >
              <FiUpload className="w-6 h-6 text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Click to select a {cfg.label}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{cfg.hint}</span>
            </button>
          )}
        </div>
      ) : (
        <div>
          <Label>{cfg.urlLabel}</Label>
          <input
            type="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder={cfg.urlPlaceholder}
            className={inputCls}
          />
          <Hint text={cfg.urlHint} />
        </div>
      )}
    </div>
  );
};

// ─── Modal ────────────────────────────────────────────────────────
const ContentModal: React.FC<ContentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "document" as ContentType,
    url: "",
    order: 0,
  });
  const [pdfMode, setPdfMode] = useState<"file" | "url">("file");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [quizData, setQuizData] = useState({
    questions: [] as QuizQuestion[],
    passingScore: 70,
    timeLimit: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = TYPE_META[formData.type];

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        description: initialData.description || "",
        type: initialData.type,
        url: initialData.url || "",
        order: initialData.order,
      });
      if (initialData.quizData) {
        setQuizData(initialData.quizData);
      } else {
        setQuizData({ questions: [], passingScore: 70, timeLimit: 0 });
      }
    } else {
      setFormData({ title: "", description: "", type: "document", url: "", order: 0 });
      setQuizData({ questions: [], passingScore: 70, timeLimit: 0 });
    }
    setPdfFile(null);
    setPdfMode("file");
    setError(null);
  }, [initialData, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "type") {
      setFormData((prev) => ({ ...prev, type: value as ContentType, url: "" }));
      setPdfFile(null);
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === "order" ? parseInt(value) || 0 : value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate quiz
    if (formData.type === "quiz") {
      if (quizData.questions.length === 0) {
        setError("Please add at least one question to the quiz.");
        return;
      }
      for (const q of quizData.questions) {
        if (!q.question.trim()) {
          setError("All questions must have question text.");
          return;
        }
        if (q.options.some((o) => !o.trim())) {
          setError("All answer options must be filled in for each question.");
          return;
        }
      }
    }

    // Validate file upload types
    const isFileUploadType = formData.type === "pdf" || formData.type === "document" || formData.type === "video";
    if (isFileUploadType && pdfMode === "file" && !pdfFile && !formData.url) {
      setError(`Please upload a file or enter a URL.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const submitData: any = { ...formData };
      if (formData.type === "quiz") {
        submitData.quizData = quizData;
      }
      const isFileUploadType = formData.type === "pdf" || formData.type === "document" || formData.type === "video";
      if (isFileUploadType && pdfMode === "file" && pdfFile) {
        submitData.pdfFile = pdfFile;
        submitData.url = "";
      }
      await onSubmit(submitData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {initialData ? "Edit Content" : "Add Content"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* ── Content Type selector ─────────────────────────────── */}
          <div>
            <Label>Content Type</Label>
            <div className="grid grid-cols-5 gap-2">
              {CONTENT_TYPES.map((t) => {
                const m = TYPE_META[t.value];
                const active = formData.type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() =>
                      handleChange({
                        target: { name: "type", value: t.value },
                      } as any)
                    }
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                      active
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <span className={`p-1.5 rounded-lg ${active ? m.color : "bg-gray-100 dark:bg-gray-700 text-gray-500"}`}>
                      {m.icon}
                    </span>
                    <span className={`text-xs font-medium leading-tight ${active ? "text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400"}`}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Title ─────────────────────────────────────────────── */}
          <div>
            <Label required>Title</Label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder={`Name for this ${meta.label.toLowerCase()}`}
              className={inputCls}
            />
          </div>

          {/* ── PDF / Document / Video: file upload or URL ───────────────────── */}
          {(formData.type === "pdf" || formData.type === "document" || formData.type === "video") && (
            <FileUploadSection
              contentType={formData.type}
              mode={pdfMode}
              onModeChange={setPdfMode}
              url={formData.url}
              onUrlChange={(v: string) => setFormData((p) => ({ ...p, url: v }))}
              file={pdfFile}
              onFileChange={setPdfFile}
            />
          )}

          {/* ── URL field for link type ───────────── */}
          {formData.type === "link" && meta.showUrl && (
            <div>
              <Label required={meta.urlRequired}>{meta.urlLabel}</Label>
              <input
                type="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                required={meta.urlRequired}
                placeholder={meta.urlPlaceholder}
                className={inputCls}
              />
              {meta.urlHint && <Hint text={meta.urlHint} />}
            </div>
          )}

          {/* ── Quiz Builder ───────────────────────────────────────── */}
          {formData.type === "quiz" && (
            <div>
              <Label required>Quiz Questions</Label>
              <QuizBuilder
                questions={quizData.questions}
                passingScore={quizData.passingScore}
                timeLimit={quizData.timeLimit}
                onChange={setQuizData}
              />
            </div>
          )}

          {/* ── Description ───────────────────────────────────────── */}
          <AiDescriptionField
            label="Description"
            value={formData.description}
            onChange={(val) => setFormData((prev) => ({ ...prev, description: val }))}
            placeholder={meta.descPlaceholder}
            rows={3}
            context={formData.title ? `Content: ${formData.title}` : undefined}
            textareaClassName={`${inputCls} resize-none`}
          />

          {/* ── Order ─────────────────────────────────────────────── */}
          <div>
            <Label>Display Order</Label>
            <input
              type="number"
              name="order"
              value={formData.order}
              onChange={handleChange}
              min={0}
              className={inputCls}
            />
            <Hint text="Lower numbers appear first. Items with the same order number are sorted by creation date." />
          </div>

          {/* ── Actions ───────────────────────────────────────────── */}
          <div className="pt-2 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              {submitting ? "Saving…" : initialData ? "Update Content" : "Add Content"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
};

export default ContentModal;
