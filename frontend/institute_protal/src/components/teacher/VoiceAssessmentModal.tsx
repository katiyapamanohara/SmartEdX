"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { authService } from "@/services/authService";
import {
  FiMic, FiX, FiUpload, FiLoader, FiCheck, FiCopy,
  FiChevronDown, FiChevronUp, FiAlertCircle, FiZap,
} from "react-icons/fi";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VoiceQuestion {
  id: string;
  question: string;
  expected_answer: string;
  marks: number;
  hints: string[];
}

interface VoiceAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  instituteId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VoiceAssessmentModal({
  isOpen,
  onClose,
  instituteId,
}: VoiceAssessmentModalProps) {
  const [step, setStep]                     = useState<"create" | "preview">("create");
  const [title, setTitle]                   = useState("");
  const [instructions, setInstructions]     = useState("");
  const [numQuestions, setNumQuestions]     = useState(5);
  const [marksPerQ, setMarksPerQ]           = useState(10);
  const [pendingFile, setPendingFile]       = useState<File | null>(null);
  const [generating, setGenerating]         = useState(false);
  const [error, setError]                   = useState("");
  const [questions, setQuestions]           = useState<VoiceQuestion[]>([]);
  const [expandedQ, setExpandedQ]           = useState<string | null>(null);
  const [copied, setCopied]                 = useState(false);
  const fileRef                             = useRef<HTMLInputElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!isOpen) return null;

  // ── Generate questions ────────────────────────────────────────────────────
  async function handleGenerate() {
    if (!instructions.trim() && !pendingFile) {
      setError("Add instructions or upload a document first.");
      return;
    }
    setError("");
    setGenerating(true);
    try {
      const token = authService.getToken();
      const form = new FormData();
      form.append("instructions", instructions);
      form.append("num_questions", String(numQuestions));
      form.append("marks_per_question", String(marksPerQ));
      if (pendingFile) form.append("file", pendingFile);

      const res = await fetch(`${apiUrl}/api/ai/voice-assessment/generate`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? res.statusText);
      }
      const data: { questions: VoiceQuestion[] } = await res.json();
      setQuestions(data.questions);
      setStep("preview");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate questions.");
    } finally {
      setGenerating(false);
    }
  }

  // ── Save assessment to localStorage ───────────────────────────────────────
  function handleSave() {
    const id = `va_${Date.now()}`;
    const assessment = {
      id,
      title: title || "Voice Assessment",
      instructions,
      questions,
      createdAt: new Date().toISOString(),
      instituteId,
    };
    const existing: unknown[] = JSON.parse(localStorage.getItem("voiceAssessments") || "[]");
    localStorage.setItem("voiceAssessments", JSON.stringify([...existing, assessment]));

    // copy code
    navigator.clipboard.writeText(id).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  function handleReset() {
    setStep("create");
    setQuestions([]);
    setExpandedQ(null);
  }

  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);

  const modal = (
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-500/30">
            <FiMic className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Voice Assessment Creator</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {step === "create" ? "Add instructions → AI generates open-ended questions" : `${questions.length} questions · ${totalMarks} total marks`}
            </p>
          </div>
          {step === "preview" && (
            <button
              onClick={handleReset}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              ← Edit
            </button>
          )}
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ─ Create step ─ */}
          {step === "create" && (
            <div className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Assessment Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Python Basics Voice Quiz"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 transition"
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Instructions / Topic <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={5}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Describe what the assessment should cover. E.g. 'Generate questions about Python functions, loops, and error handling for intermediate students.'"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 transition"
                />
              </div>

              {/* File upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Upload Document <span className="text-gray-400">(optional — PDF, DOCX, TXT)</span>
                </label>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)} className="hidden" />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors group"
                >
                  <FiUpload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  {pendingFile ? (
                    <span className="text-purple-700 dark:text-purple-400 font-medium truncate">{pendingFile.name}</span>
                  ) : (
                    "Click to upload a study document or lecture notes"
                  )}
                  {pendingFile && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPendingFile(null); }}
                      className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </button>
              </div>

              {/* Config row */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Number of Questions
                  </label>
                  <select
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition"
                  >
                    {[3, 4, 5, 6, 7, 8, 10].map((n) => (
                      <option key={n} value={n}>{n} questions</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Marks per Question
                  </label>
                  <select
                    value={marksPerQ}
                    onChange={(e) => setMarksPerQ(Number(e.target.value))}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition"
                  >
                    {[5, 10, 15, 20, 25].map((n) => (
                      <option key={n} value={n}>{n} marks</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                  <FiAlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ─ Preview step ─ */}
          {step === "preview" && (
            <div className="p-6 space-y-4">
              {/* Summary banner */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">
                    {title || "Voice Assessment"} — Ready!
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                    {questions.length} questions · {totalMarks} total marks · Passing: {Math.round(totalMarks * 0.5)} marks (50%)
                  </p>
                </div>
                <FiCheck className="w-5 h-5 text-purple-500 shrink-0" />
              </div>

              {/* Questions list */}
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div key={q.id} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}
                    >
                      <span className="shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <p className="flex-1 text-sm font-medium text-gray-800 dark:text-white leading-snug text-left">{q.question}</p>
                      <span className="shrink-0 text-xs font-semibold px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        {q.marks}m
                      </span>
                      {expandedQ === q.id
                        ? <FiChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                        : <FiChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                      }
                    </button>
                    {expandedQ === q.id && (
                      <div className="px-4 pb-4 pt-1 space-y-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40">
                        <div>
                          <p className="text-[11px] font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-1">Expected Answer</p>
                          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{q.expected_answer}</p>
                        </div>
                        {q.hints?.length > 0 && (
                          <div>
                            <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Student Hints</p>
                            <div className="flex gap-2 flex-wrap">
                              {q.hints.map((h, hi) => (
                                <span key={hi} className="px-2 py-0.5 rounded-full text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{h}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0 bg-gray-50/60 dark:bg-gray-800/30">
          {step === "create" ? (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || (!instructions.trim() && !pendingFile)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-gray-700 dark:disabled:to-gray-700 disabled:text-gray-400 transition-all shadow-md shadow-purple-500/20 disabled:shadow-none"
              >
                {generating ? (
                  <>
                    <FiLoader className="w-4 h-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <FiZap className="w-4 h-4" />
                    Generate {numQuestions} Questions
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Save to get a code — share with students to take the voice assessment
              </p>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 transition-all shadow-md shadow-purple-500/20"
              >
                {copied ? <><FiCheck className="w-4 h-4" /> Code Copied!</> : <><FiCopy className="w-4 h-4" /> Save &amp; Copy Code</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
}
