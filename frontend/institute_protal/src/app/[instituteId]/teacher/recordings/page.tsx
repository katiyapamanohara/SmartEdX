"use client";
import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { VideoIcon, PlusIcon, TrashBinIcon, EyeIcon } from "@/icons";
import { authService } from "@/services/authService";
import { instituteService, Course } from "@/services/instituteService";
import { aiService } from "@/services/aiService";

// ── Video Quiz Types ──────────────────────────────────────────────────────────

interface VideoQuestion {
  id: string;
  atSeconds: number;
  question: string;
  options: [string, string, string, string];
  correctAnswer: number;
  marks: number;
}

interface StudentAttemptStat {
  userId: string;
  studentName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  completedAt: string;
  questionResults: {
    questionId: string;
    question: string;
    atSeconds: number;
    correct: boolean;
    chosen: number | null;
    correctAnswer: number;
    marks: number;
  }[];
}

interface QuestionStat {
  questionId: string;
  question: string;
  atSeconds: number;
  total: number;
  correct: number;
  accuracy: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function parseTimeInput(v: string): number {
  const parts = v.split(":").map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

function recordingApiBase(instituteId: string) {
  return `${API_BASE_URL}/api/institutes/institutes/${instituteId}/recordings`;
}

function recAuthHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${authService.getToken()}`,
    "Content-Type": "application/json",
  };
}

// ── VideoQuestionsModal ───────────────────────────────────────────────────────

interface VideoQuestionsModalProps {
  instituteId: string;
  recording: { id: string; title: string };
  onClose: () => void;
}

function VideoQuestionsModal({ instituteId, recording, onClose }: VideoQuestionsModalProps) {
  const [tab, setTab] = useState<"questions" | "stats">("questions");

  // Questions state
  const [questions, setQuestions] = useState<VideoQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add/edit form
  const [editingQ, setEditingQ] = useState<VideoQuestion | null>(null);
  const [formTimeStr, setFormTimeStr] = useState("0:00");
  const [formQuestion, setFormQuestion] = useState("");
  const [formOptions, setFormOptions] = useState<[string, string, string, string]>(["", "", "", ""]);
  const [formCorrect, setFormCorrect] = useState(0);
  const [formMarks, setFormMarks] = useState(1);
  const [showForm, setShowForm] = useState(false);

  // AI generation
  const [generating, setGenerating] = useState(false);
  const [genCount, setGenCount] = useState(5);
  const [genDifficulty, setGenDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  // Stats
  const [stats, setStats] = useState<{ studentAttempts: StudentAttemptStat[]; questionStats: QuestionStat[] } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Load questions on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${recordingApiBase(instituteId)}/${recording.id}/video-questions?teacher=true`,
          { headers: recAuthHeaders() }
        );
        if (res.ok) {
          const data = await res.json();
          setQuestions(data.questions ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [instituteId, recording.id]);

  // Load stats when switching to stats tab
  useEffect(() => {
    if (tab !== "stats") return;
    (async () => {
      setStatsLoading(true);
      try {
        const res = await fetch(
          `${recordingApiBase(instituteId)}/${recording.id}/video-stats`,
          { headers: recAuthHeaders() }
        );
        if (res.ok) setStats(await res.json());
      } finally {
        setStatsLoading(false);
      }
    })();
  }, [tab, instituteId, recording.id]);

  function openAddForm() {
    setEditingQ(null);
    setFormTimeStr("0:00");
    setFormQuestion("");
    setFormOptions(["", "", "", ""]);
    setFormCorrect(0);
    setFormMarks(1);
    setShowForm(true);
  }

  function openEditForm(q: VideoQuestion) {
    setEditingQ(q);
    setFormTimeStr(formatSeconds(q.atSeconds));
    setFormQuestion(q.question);
    setFormOptions([...q.options] as [string, string, string, string]);
    setFormCorrect(q.correctAnswer);
    setFormMarks(q.marks);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingQ(null);
  }

  function saveForm() {
    if (!formQuestion.trim() || formOptions.some((o) => !o.trim())) return;
    const newQ: VideoQuestion = {
      id: editingQ?.id ?? crypto.randomUUID(),
      atSeconds: parseTimeInput(formTimeStr),
      question: formQuestion.trim(),
      options: formOptions.map((o) => o.trim()) as [string, string, string, string],
      correctAnswer: formCorrect,
      marks: formMarks,
    };
    if (editingQ) {
      setQuestions((prev) => prev.map((q) => q.id === editingQ.id ? newQ : q));
    } else {
      setQuestions((prev) => [...prev, newQ]);
    }
    setShowForm(false);
    setEditingQ(null);
  }

  function deleteQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  async function handleSaveAll() {
    setSaving(true);
    try {
      const res = await fetch(
        `${recordingApiBase(instituteId)}/${recording.id}/video-questions`,
        {
          method: "PUT",
          headers: recAuthHeaders(),
          body: JSON.stringify({ questions }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions ?? questions);
        alert("Questions saved!");
      } else {
        alert("Save failed");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAutoGenerate() {
    if (generating) return;
    setGenerating(true);
    try {
      const text = `Video recording titled "${recording.title}". Generate quiz questions that test understanding of the concepts covered in this video lesson.`;
      const result = await aiService.generateQuestionsFromText({
        text,
        num_questions: genCount,
        difficulty: genDifficulty,
        question_type: "mcq",
      });
      if (!result) { alert("AI generation failed"); return; }
      // Convert ExamQuestion[] → VideoQuestion[] with evenly spaced timestamps
      const mcqOnly = result.filter((q) => q.type === "mcq" && q.options?.length === 4);
      const spacing = 120; // default 2 minutes apart
      const newQs: VideoQuestion[] = mcqOnly.map((q, i) => ({
        id: q.id,
        atSeconds: (i + 1) * spacing,
        question: q.question,
        options: q.options as [string, string, string, string],
        correctAnswer: q.correctAnswer ?? 0,
        marks: q.marks ?? 1,
      }));
      setQuestions((prev) => [...prev, ...newQs]);
    } finally {
      setGenerating(false);
    }
  }

  const sorted = [...questions].sort((a, b) => a.atSeconds - b.atSeconds);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Video Questions</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{recording.title}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors mt-0.5 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 px-6">
          {(["questions", "stats"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {t === "questions" ? "Questions" : "Student Performance"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "questions" && (
            <div className="flex flex-col gap-4">
              {/* AI Generate bar */}
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10">
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 whitespace-nowrap">Auto-generate with AI</span>
                <select
                  value={genCount}
                  onChange={(e) => setGenCount(Number(e.target.value))}
                  className="text-xs rounded-lg border border-purple-300 dark:border-purple-500/40 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-1 focus:outline-none"
                >
                  {[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n} questions</option>)}
                </select>
                <select
                  value={genDifficulty}
                  onChange={(e) => setGenDifficulty(e.target.value as "easy" | "medium" | "hard")}
                  className="text-xs rounded-lg border border-purple-300 dark:border-purple-500/40 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-1 focus:outline-none"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <button
                  onClick={handleAutoGenerate}
                  disabled={generating}
                  className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {generating ? "Generating…" : "✨ Generate"}
                </button>
              </div>

              {/* Add question button */}
              {!showForm && (
                <button
                  onClick={openAddForm}
                  className="flex items-center gap-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add question
                </button>
              )}

              {/* Add/Edit form */}
              {showForm && (
                <div className="rounded-xl border border-brand-300 dark:border-brand-500/40 bg-brand-50 dark:bg-brand-500/10 p-4 flex flex-col gap-3">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">{editingQ ? "Edit question" : "New question"}</p>

                  <div className="flex gap-3 flex-wrap">
                    <div className="flex-1 min-w-28">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Show at (m:ss or h:mm:ss)</label>
                      <input
                        type="text"
                        value={formTimeStr}
                        onChange={(e) => setFormTimeStr(e.target.value)}
                        placeholder="1:30"
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      />
                    </div>
                    <div className="w-20">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Marks</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={formMarks}
                        onChange={(e) => setFormMarks(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Question</label>
                    <textarea
                      value={formQuestion}
                      onChange={(e) => setFormQuestion(e.target.value)}
                      rows={2}
                      placeholder="Type the question…"
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Options (click radio to mark correct)</label>
                    {formOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={formCorrect === i}
                          onChange={() => setFormCorrect(i)}
                          className="accent-green-500"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const copy = [...formOptions] as [string, string, string, string];
                            copy[i] = e.target.value;
                            setFormOptions(copy);
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + i)}`}
                          className={`flex-1 px-3 py-1.5 rounded-lg border text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                            formCorrect === i
                              ? "border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-500/10"
                              : "border-gray-200 dark:border-gray-600"
                          }`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button onClick={cancelForm} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
                      Cancel
                    </button>
                    <button
                      onClick={saveForm}
                      disabled={!formQuestion.trim() || formOptions.some((o) => !o.trim())}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
                    >
                      {editingQ ? "Update" : "Add"}
                    </button>
                  </div>
                </div>
              )}

              {/* Questions list */}
              {loading ? (
                <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
              ) : sorted.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No questions yet. Add manually or use AI generation.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {sorted.map((q, idx) => (
                    <div key={q.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="shrink-0 text-xs font-bold text-white bg-brand-500 rounded-full w-5 h-5 flex items-center justify-center">{idx + 1}</span>
                          <span className="text-xs font-mono text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/15 px-2 py-0.5 rounded-full shrink-0">@ {formatSeconds(q.atSeconds)}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => openEditForm(q)} className="p-1 text-gray-400 hover:text-brand-500 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button onClick={() => deleteQuestion(q.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-gray-800 dark:text-white/90">{q.question}</p>
                      <div className="mt-2 grid grid-cols-2 gap-1">
                        {q.options.map((opt, i) => (
                          <span
                            key={i}
                            className={`text-xs px-2 py-1 rounded-lg ${
                              i === q.correctAnswer
                                ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 font-medium"
                                : "bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            {String.fromCharCode(65 + i)}. {opt}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "stats" && (
            <div className="flex flex-col gap-5">
              {statsLoading ? (
                <p className="text-sm text-gray-400 text-center py-8">Loading performance data…</p>
              ) : !stats || (stats.studentAttempts.length === 0 && stats.questionStats.length === 0) ? (
                <p className="text-sm text-gray-400 text-center py-8">No student attempts yet.</p>
              ) : (
                <>
                  {/* Per-question accuracy */}
                  {stats.questionStats.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Question Accuracy</h3>
                      <div className="flex flex-col gap-2">
                        {stats.questionStats.map((qs, i) => (
                          <div key={qs.questionId} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900/40">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="shrink-0 text-xs font-bold text-white bg-gray-500 rounded-full w-5 h-5 flex items-center justify-center">{i + 1}</span>
                                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">@ {formatSeconds(qs.atSeconds)}</span>
                              </div>
                              <span className={`text-xs font-semibold ${qs.accuracy >= 70 ? "text-green-600 dark:text-green-400" : qs.accuracy >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                                {qs.accuracy}% correct ({qs.correct}/{qs.total})
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{qs.question}</p>
                            <div className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${qs.accuracy >= 70 ? "bg-green-500" : qs.accuracy >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                                style={{ width: `${qs.accuracy}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Per-student results */}
                  {stats.studentAttempts.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Student Results</h3>
                      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-white/3 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Student</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Score</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">%</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Completed</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {stats.studentAttempts.map((a) => (
                              <tr key={a.userId} className="hover:bg-gray-50 dark:hover:bg-white/2">
                                <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-white/90">{a.studentName}</td>
                                <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{a.score}/{a.totalMarks}</td>
                                <td className="px-4 py-2.5">
                                  <span className={`text-xs font-semibold ${a.percentage >= 70 ? "text-green-600 dark:text-green-400" : a.percentage >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                                    {a.percentage}%
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-xs text-gray-400 dark:text-gray-500">
                                  {new Date(a.completedAt).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer (only for questions tab) */}
        {tab === "questions" && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">{questions.length} question{questions.length !== 1 ? "s" : ""}</span>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
                Cancel
              </button>
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save All"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mini Calendar Picker ──────────────────────────────────────────────────────

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface CalendarPickerProps {
  value: string;          // "YYYY-MM-DD" or ""
  onChange: (date: string) => void;
  placeholder?: string;
}

function CalendarPicker({ value, onChange, placeholder = "Select date" }: CalendarPickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parsed = value ? new Date(value + "T00:00:00") : null;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  function selectDay(day: number) {
    const month = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    onChange(`${viewYear}-${month}-${d}`);
    setOpen(false);
  }

  function isPast(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    return d < today;
  }

  function isSelected(day: number) {
    if (!parsed) return false;
    return (
      parsed.getFullYear() === viewYear &&
      parsed.getMonth() === viewMonth &&
      parsed.getDate() === day
    );
  }

  function isToday(day: number) {
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day
    );
  }

  const displayValue = parsed
    ? parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-4 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 ${
          open
            ? "border-brand-500 bg-white dark:bg-gray-700"
            : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-brand-400"
        } text-gray-900 dark:text-white`}
      >
        <span className={displayValue ? "" : "text-gray-400"}>
          {displayValue || placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl p-3 left-0">
          {/* Month/Year navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const past = isPast(day);
              const selected = isSelected(day);
              const tod = isToday(day);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={past}
                  onClick={() => selectDay(day)}
                  className={`w-full aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-colors
                    ${selected
                      ? "bg-brand-500 text-white"
                      : past
                      ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                      : tod
                      ? "bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-500/20"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                const y = today.getFullYear();
                const m = String(today.getMonth() + 1).padStart(2, "0");
                const d = String(today.getDate()).padStart(2, "0");
                onChange(`${y}-${m}-${d}`);
                setOpen(false);
              }}
              className="text-xs text-brand-500 hover:text-brand-600 font-medium"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="text-xs text-gray-400 hover:text-red-500 font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

interface RecordingCategory {
  id: string;
  name: string;
}

interface RecordingAssignment {
  id: string;
  courseId: string;
  courseName: string;
  deadline: string;
  status: "active" | "expired";
}

interface Recording {
  id: string;
  title: string;
  fileName?: string;
  fileUrl?: string;
  uploadDate: string;
  duration: string;
  category: RecordingCategory | null;
  categoryId: string | null;
  assignments: RecordingAssignment[];
}

// ── Badge palette ─────────────────────────────────────────────────────────────

const BADGE_PALETTE = [
  "bg-blue-500/85 text-white border border-blue-300/40",
  "bg-violet-500/85 text-white border border-violet-300/40",
  "bg-emerald-500/85 text-white border border-emerald-300/40",
  "bg-amber-500/90 text-white border border-amber-300/40",
  "bg-orange-500/90 text-white border border-orange-300/40",
  "bg-pink-500/85 text-white border border-pink-300/40",
  "bg-cyan-500/85 text-white border border-cyan-300/40",
  "bg-rose-500/85 text-white border border-rose-300/40",
];

function categoryColor(categoryId: string, categories: RecordingCategory[]) {
  const idx = categories.findIndex((c) => c.id === categoryId);
  return BADGE_PALETTE[idx % BADGE_PALETTE.length] ?? "bg-gray-900/80 text-white border border-white/30";
}

// ── API helpers ───────────────────────────────────────────────────────────────

function getApiBase(instituteId: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  return `${apiUrl}/api/institutes/institutes/${instituteId}/recordings`;
}

function authHeaders(): Record<string, string> {
  const token = authService.getToken();
  return { Authorization: `Bearer ${token}` };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TeacherRecordingsPage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  // ── Data state ───────────────────────────────────────────────────────────────
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [categories, setCategories] = useState<RecordingCategory[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Upload modal ─────────────────────────────────────────────────────────────
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategoryId, setUploadCategoryId] = useState("");
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [uploadCourseId, setUploadCourseId] = useState("");
  const [uploadDeadline, setUploadDeadline] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Assign modal ──────────────────────────────────────────────────────────────
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [assignCourseId, setAssignCourseId] = useState("");
  const [assignDeadline, setAssignDeadline] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignModalLoading, setAssignModalLoading] = useState(false);

  // ── Details modal ─────────────────────────────────────────────────────────────
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsRecording, setDetailsRecording] = useState<Recording | null>(null);

  // ── Video player modal ────────────────────────────────────────────────────────
  const [playRecording, setPlayRecording] = useState<Recording | null>(null);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [protectionNotice, setProtectionNotice] = useState<string | null>(null);
  const [watermarkTime, setWatermarkTime] = useState(() => new Date().toLocaleString());
  const protectionTimeoutRef = useRef<number | null>(null);
  const protectedVideoRef = useRef<HTMLVideoElement>(null);

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("All");

  // ── Category rename ───────────────────────────────────────────────────────────
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  // ── Video questions modal ─────────────────────────────────────────────────────
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [questionsRecording, setQuestionsRecording] = useState<Recording | null>(null);

  // ── Change recording category ─────────────────────────────────────────────────
  const [showChangeCatModal, setShowChangeCatModal] = useState(false);
  const [changeCatRecording, setChangeCatRecording] = useState<Recording | null>(null);
  const [changeCatId, setChangeCatId] = useState("");
  const [changeCatCreating, setChangeCatCreating] = useState(false);
  const [changeCatNewName, setChangeCatNewName] = useState("");
  const [changeCatSaving, setChangeCatSaving] = useState(false);

  // ── Fetch helpers ─────────────────────────────────────────────────────────────

  const fetchRecordings = useCallback(async (search?: string, categoryId?: string) => {
    if (!instituteId) return;
    const base = getApiBase(instituteId);
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (categoryId && categoryId !== "All") qs.set("categoryId", categoryId);
    const url = qs.toString() ? `${base}?${qs}` : base;
    const res = await fetch(url, { headers: authHeaders() });
    if (res.ok) setRecordings(await res.json());
  }, [instituteId]);

  const fetchCategories = useCallback(async () => {
    if (!instituteId) return;
    const res = await fetch(`${getApiBase(instituteId)}/categories`, { headers: authHeaders() });
    if (res.ok) setCategories(await res.json());
  }, [instituteId]);

  useEffect(() => {
    if (!instituteId) return;
    (async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchRecordings(),
          fetchCategories(),
          instituteService.getMyTeacherCourses(instituteId).then(setCourses),
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, [instituteId, fetchRecordings, fetchCategories]);

  // Re-fetch when filters change
  useEffect(() => {
    if (!instituteId || loading) return;
    fetchRecordings(searchQuery, filterCategoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterCategoryId]);

  // ── Category helpers ──────────────────────────────────────────────────────────

  async function handleAddCategory() {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`${getApiBase(instituteId)}/categories`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message ?? "Failed to create category");
        return;
      }
      const newCat: RecordingCategory = await res.json();
      setCategories((prev) => [...prev, newCat]);
      setUploadCategoryId(newCat.id);
      setNewCategoryInput("");
      setCreatingCategory(false);
    } catch {
      alert("Network error — could not create category");
    }
  }

  // ── File drop zone ────────────────────────────────────────────────────────────

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("video/")) setSelectedFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }

  // ── Upload ────────────────────────────────────────────────────────────────────

  function resetUploadModal() {
    setUploadTitle("");
    setUploadCategoryId("");
    setNewCategoryInput("");
    setCreatingCategory(false);
    setUploadCourseId("");
    setUploadDeadline("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload() {
    if (!uploadTitle.trim() || !uploadCategoryId) return;

    setUploading(true);
    try {
      const form = new FormData();
      form.append("title", uploadTitle.trim());
      form.append("categoryId", uploadCategoryId);
      if (selectedFile) form.append("file", selectedFile);
      if (uploadCourseId && uploadDeadline) {
        form.append("courseId", uploadCourseId);
        form.append("deadline", uploadDeadline);
      }

      const res = await fetch(getApiBase(instituteId), {
        method: "POST",
        headers: authHeaders(),
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message ?? "Upload failed");
        return;
      }

      const created: Recording = await res.json();
      setRecordings((prev) => [created, ...prev]);
      resetUploadModal();
      setShowUploadModal(false);
    } catch {
      alert("Network error — upload failed");
    } finally {
      setUploading(false);
    }
  }

  // ── Assign (post-upload) ──────────────────────────────────────────────────────

  async function handleAssign() {
    if (!selectedRecording || !assignCourseId || !assignDeadline) return;
    setAssigning(true);
    try {
      const res = await fetch(
        `${getApiBase(instituteId)}/${selectedRecording.id}/assignments`,
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ courseId: assignCourseId, deadline: assignDeadline }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message ?? "Assignment failed");
        return;
      }

      const updated: Recording = await res.json();
      setRecordings((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setSelectedRecording(updated);
      // Sync details modal if open for this recording
      if (detailsRecording?.id === updated.id) setDetailsRecording(updated);
      setAssignCourseId("");
      setAssignDeadline("");
      setShowAssignModal(false);
    } catch {
      alert("Network error — assignment failed");
    } finally {
      setAssigning(false);
    }
  }

  // ── Delete assignment ─────────────────────────────────────────────────────────

  async function handleDeleteAssignment(recordingId: string, assignmentId: string) {
    try {
      const res = await fetch(
        `${getApiBase(instituteId)}/${recordingId}/assignments/${assignmentId}`,
        { method: "DELETE", headers: authHeaders() }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message ?? "Failed to remove assignment");
        return;
      }
      setRecordings((prev) =>
        prev.map((r) =>
          r.id !== recordingId
            ? r
            : { ...r, assignments: r.assignments.filter((a) => a.id !== assignmentId) }
        )
      );
      if (detailsRecording?.id === recordingId) {
        setDetailsRecording((d) =>
          d ? { ...d, assignments: d.assignments.filter((a) => a.id !== assignmentId) } : d
        );
      }
    } catch {
      alert("Network error — could not remove assignment");
    }
  }

  // ── Delete recording ──────────────────────────────────────────────────────────

  async function handleDeleteRecording(recordingId: string) {
    if (!confirm("Delete this recording? This cannot be undone.")) return;
    try {
      const res = await fetch(`${getApiBase(instituteId)}/${recordingId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) return;
      setRecordings((prev) => prev.filter((r) => r.id !== recordingId));
    } catch {
      alert("Network error — could not delete recording");
    }
  }

  // ── Rename category ───────────────────────────────────────────────────────────

  async function handleRenameCategory(categoryId: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`${getApiBase(instituteId)}/categories/${categoryId}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message ?? "Failed to rename category");
        return;
      }
      const updated: RecordingCategory = await res.json();
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setRecordings((prev) =>
        prev.map((r) =>
          r.category?.id === updated.id ? { ...r, category: updated } : r
        )
      );
    } catch {
      alert("Network error — could not rename category");
    } finally {
      setEditingCategoryId(null);
      setEditingCategoryName("");
    }
  }

  // ── Change recording category ─────────────────────────────────────────────────

  async function handleChangeRecordingCategory() {
    if (!changeCatRecording) return;
    try {
      setChangeCatSaving(true);
      const res = await fetch(`${getApiBase(instituteId)}/${changeCatRecording.id}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: changeCatId || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message ?? "Failed to change category");
        return;
      }
      const updated: Recording = await res.json();
      setRecordings((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setShowChangeCatModal(false);
      setChangeCatRecording(null);
      setChangeCatId("");
      setChangeCatCreating(false);
      setChangeCatNewName("");
    } catch {
      alert("Network error — could not change category");
    } finally {
      setChangeCatSaving(false);
    }
  }

  async function handleCreateCategoryForChange() {
    const trimmed = changeCatNewName.trim();
    if (!trimmed) return;

    try {
      const res = await fetch(`${getApiBase(instituteId)}/categories`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message ?? "Failed to create category");
        return;
      }

      const created: RecordingCategory = await res.json();
      setCategories((prev) => [...prev, created]);
      setChangeCatId(created.id);
      setChangeCatNewName("");
      setChangeCatCreating(false);
    } catch {
      alert("Network error — could not create category");
    }
  }

  // ── Filtered view (client-side for instant feedback; server re-fetches on change) ──

  const filteredRecordings = useMemo(() => recordings, [recordings]);
  const watermarkIdentity = useMemo(() => {
    const user = authService.getUser();
    return user?.email || "unknown-user";
  }, []);

  // ── Protected playback guards (best effort for web) ───────────────────────────

  const showProtectionNotice = useCallback((message: string) => {
    setProtectionNotice(message);
    if (protectionTimeoutRef.current) window.clearTimeout(protectionTimeoutRef.current);
    protectionTimeoutRef.current = window.setTimeout(() => setProtectionNotice(null), 2400);
  }, []);

  const handleBlockPictureInPicture = useCallback(
    async (video: HTMLVideoElement | null) => {
      if (!video) return;
      showProtectionNotice("Picture-in-Picture is blocked for protected videos.");

      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        }
      } catch {
        // noop
      }

      try {
        const maybeSafariVideo = video as HTMLVideoElement & {
          webkitSetPresentationMode?: (mode: "inline" | "fullscreen" | "picture-in-picture") => void;
        };
        maybeSafariVideo.webkitSetPresentationMode?.("inline");
      } catch {
        // noop
      }
    },
    [showProtectionNotice]
  );

  useEffect(() => {
    if (!playRecording) return;

    const previousOverflow = document.body.style.overflow;
    const videoEl = protectedVideoRef.current;
    document.body.style.overflow = "hidden";

    function onWindowBlur() {
      setIsWindowFocused(false);
    }

    function onWindowFocus() {
      setIsWindowFocused(true);
    }

    function onVisibilityChange() {
      setIsWindowFocused(!document.hidden);
    }

    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      const isPrintScreen = e.key === "PrintScreen";
      const isMacScreenshotShortcut =
        e.metaKey && e.shiftKey && (key === "3" || key === "4" || key === "5");
      const isPiPShortcut = (e.metaKey && e.shiftKey && key === "p") || (e.altKey && key === "p");

      if (isPrintScreen || isMacScreenshotShortcut) {
        e.preventDefault();
        e.stopPropagation();
        showProtectionNotice("Screen capture is disabled while video is playing.");
        return;
      }

      if (isPiPShortcut) {
        e.preventDefault();
        e.stopPropagation();
        showProtectionNotice("Picture-in-Picture is blocked for protected videos.");
      }
    }

    function blockCaptureGesture(e: Event) {
      e.preventDefault();
      e.stopPropagation();
      showProtectionNotice("Copy and capture actions are blocked for protected videos.");
    }

    function onEnterPictureInPicture() {
      handleBlockPictureInPicture(videoEl ?? null);
    }

    function onWebkitPresentationModeChanged() {
      const maybeSafariVideo = videoEl as HTMLVideoElement & {
        webkitPresentationMode?: string;
      };
      if (maybeSafariVideo?.webkitPresentationMode === "picture-in-picture") {
        handleBlockPictureInPicture(videoEl ?? null);
      }
    }

    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("copy", blockCaptureGesture, true);
    document.addEventListener("dragstart", blockCaptureGesture, true);
    document.addEventListener("selectstart", blockCaptureGesture, true);
    videoEl?.addEventListener("enterpictureinpicture", onEnterPictureInPicture);
    videoEl?.addEventListener("webkitpresentationmodechanged", onWebkitPresentationModeChanged as EventListener);

    return () => {
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("focus", onWindowFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("copy", blockCaptureGesture, true);
      document.removeEventListener("dragstart", blockCaptureGesture, true);
      document.removeEventListener("selectstart", blockCaptureGesture, true);
      videoEl?.removeEventListener("enterpictureinpicture", onEnterPictureInPicture);
      videoEl?.removeEventListener("webkitpresentationmodechanged", onWebkitPresentationModeChanged as EventListener);
      document.body.style.overflow = previousOverflow;
      setIsWindowFocused(true);
      setProtectionNotice(null);
      if (protectionTimeoutRef.current) {
        window.clearTimeout(protectionTimeoutRef.current);
        protectionTimeoutRef.current = null;
      }
    };
  }, [handleBlockPictureInPicture, playRecording, showProtectionNotice]);

  useEffect(() => {
    if (!playRecording) return;
    const videoEl = protectedVideoRef.current;
    if (!videoEl) return;

    if (!isWindowFocused) {
      videoEl.pause();
    }
  }, [isWindowFocused, playRecording]);

  useEffect(() => {
    if (!playRecording) return;

    setWatermarkTime(new Date().toLocaleString());
    const interval = window.setInterval(() => {
      setWatermarkTime(new Date().toLocaleString());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [playRecording]);

  // Fetch latest recording assignments when assign modal opens
  useEffect(() => {
    if (!showAssignModal || !selectedRecording || !instituteId) return;

    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);

    (async () => {
      setAssignModalLoading(true);
      try {
        const res = await fetch(`${getApiBase(instituteId)}/${selectedRecording.id}`, {
          headers: authHeaders(),
          signal: controller.signal,
        });
        if (!res.ok) return;

        const latest: Recording = await res.json();
        if (cancelled) return;

        setSelectedRecording(latest);
        setRecordings((prev) => prev.map((r) => (r.id === latest.id ? latest : r)));
        if (detailsRecording?.id === latest.id) setDetailsRecording(latest);
      } catch {
        // Keep existing selectedRecording as fallback if refresh fails
      } finally {
        window.clearTimeout(timeoutId);
        if (!cancelled) setAssignModalLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [showAssignModal, selectedRecording?.id, instituteId, detailsRecording?.id]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recordings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Upload and manage class recordings, then assign them to courses
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Upload Recording
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recordings by title..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-white/3 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* All pill */}
            <button
              onClick={() => setFilterCategoryId("All")}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${
                filterCategoryId === "All"
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-white dark:bg-white/3 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-brand-400 hover:text-brand-500"
              }`}
            >
              All
            </button>

            {/* Category pills with inline rename */}
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-1 group">
                {editingCategoryId === cat.id ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleRenameCategory(cat.id, editingCategoryName); }}
                    className="flex items-center gap-1"
                  >
                    <input
                      autoFocus
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      onBlur={() => { if (editingCategoryName.trim() && editingCategoryName.trim() !== cat.name) handleRenameCategory(cat.id, editingCategoryName); else { setEditingCategoryId(null); setEditingCategoryName(""); } }}
                      onKeyDown={(e) => { if (e.key === "Escape") { setEditingCategoryId(null); setEditingCategoryName(""); } }}
                      className="px-2 py-1 text-xs rounded-full border border-brand-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none w-28"
                    />
                  </form>
                ) : (
                  <>
                    <button
                      onClick={() => setFilterCategoryId(cat.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${
                        filterCategoryId === cat.id
                          ? "bg-brand-500 text-white border-brand-500"
                          : "bg-white dark:bg-white/3 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-brand-400 hover:text-brand-500"
                      }`}
                    >
                      {cat.name}
                      <span className="ml-1 opacity-70">({recordings.filter((r) => r.categoryId === cat.id).length})</span>
                    </button>
                    <button
                      onClick={() => { setEditingCategoryId(cat.id); setEditingCategoryName(cat.name); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-brand-500 transition-all"
                      title="Rename category"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Upload Modal ─────────────────────────────────────────────────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5">Upload Recording</h2>

            <div className="flex flex-col gap-4">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                    : "border-gray-300 dark:border-gray-600 hover:border-brand-500"
                }`}
              >
                <VideoIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                {selectedFile ? (
                  <>
                    <p className="text-sm font-medium text-brand-600 dark:text-brand-400">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · Click to change
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Drag and drop your video</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">or click to browse</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Recording Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Enter a name for this recording"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>

                {!creatingCategory ? (
                  <div className="flex gap-2">
                    <select
                      value={uploadCategoryId}
                      onChange={(e) => setUploadCategoryId(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                    >
                      <option value="">Select a category...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setCreatingCategory(true)}
                      className="px-3 py-2 text-xs font-medium rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-brand-500 hover:text-brand-500 transition-colors whitespace-nowrap"
                    >
                      + New
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddCategory();
                        if (e.key === "Escape") setCreatingCategory(false);
                      }}
                      placeholder="Category name..."
                      className="flex-1 px-4 py-2 rounded-lg border border-brand-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={!newCategoryInput.trim()}
                      className="px-3 py-2 text-xs font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCreatingCategory(false); setNewCategoryInput(""); }}
                      className="px-3 py-2 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {uploadCategoryId && (
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Selected:{" "}
                    <span className="font-medium text-gray-700 dark:text-gray-200">
                      {categories.find((c) => c.id === uploadCategoryId)?.name}
                    </span>
                  </p>
                )}
              </div>

              {/* Optional course assignment */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Assign to Course (Optional)
                </p>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course</label>
                    <select
                      value={uploadCourseId}
                      onChange={(e) => { setUploadCourseId(e.target.value); setUploadDeadline(""); }}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                    >
                      <option value="">Choose a course...</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>{course.name}</option>
                      ))}
                    </select>
                  </div>

                  {uploadCourseId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Deadline <span className="text-red-500">*</span>
                      </label>
                      <CalendarPicker
                        value={uploadDeadline}
                        onChange={setUploadDeadline}
                        placeholder="Pick a deadline"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-1">
                <button
                  onClick={() => { resetUploadModal(); setShowUploadModal(false); }}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={
                    !uploadTitle.trim() ||
                    !uploadCategoryId ||
                    (!!uploadCourseId && !uploadDeadline) ||
                    uploading
                  }
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Modal ──────────────────────────────────────────────────────── */}
      {showAssignModal && selectedRecording && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Assign to Course</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{selectedRecording.title}</p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course</label>
                {(() => {
                  const unassigned = courses.filter((c) => !(selectedRecording.assignments ?? []).some((a) => a.courseId === c.id));
                  const allAssigned = !assignModalLoading && courses.length > 0 && unassigned.length === 0;
                  return allAssigned ? (
                    <div className="w-full px-4 py-2 rounded-lg border border-dashed border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 text-xs text-gray-500 dark:text-gray-400">
                      All your courses are already assigned to this recording.
                    </div>
                  ) : (
                    <select
                      value={assignCourseId}
                      onChange={(e) => { setAssignCourseId(e.target.value); setAssignDeadline(""); }}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                      disabled={assignModalLoading}
                    >
                      <option value="">Choose a course...</option>
                      {unassigned.map((course) => (
                        <option key={course.id} value={course.id}>{course.name}</option>
                      ))}
                    </select>
                  );
                })()}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {assignModalLoading
                    ? "Refreshing assigned courses in background..."
                    : "Only unassigned courses are shown."}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Deadline {assignCourseId && <span className="text-red-500">*</span>}
                  {assignCourseId && (
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                      for {courses.find((c) => c.id === assignCourseId)?.name}
                    </span>
                  )}
                </label>

                {assignCourseId ? (
                  <CalendarPicker
                    value={assignDeadline}
                    onChange={setAssignDeadline}
                    placeholder="Pick a deadline for selected course"
                  />
                ) : (
                  <div className="w-full px-4 py-2 rounded-lg border border-dashed border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 text-xs text-gray-500 dark:text-gray-400">
                    Select a course first to set its deadline.
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setShowAssignModal(false); setAssignCourseId(""); setAssignDeadline(""); }}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={!assignCourseId || !assignDeadline || assigning}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {assigning ? "Assigning..." : "Assign"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Assignment Details Modal ────────────────────────────────────────── */}
      {showDetailsModal && detailsRecording && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Assignment Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{detailsRecording.title}</p>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {detailsRecording.assignments.length} course{detailsRecording.assignments.length !== 1 ? "s" : ""}
              </p>

              {detailsRecording.assignments.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No course assignments yet.</p>
              ) : (
                <div className="space-y-2">
                  {detailsRecording.assignments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 dark:text-white text-sm">{a.courseName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(a.deadline).toLocaleDateString()}
                          </p>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              a.status === "active"
                                ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300"
                                : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"
                            }`}
                          >
                            {a.status === "active" ? "Active" : "Expired"}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAssignment(detailsRecording.id, a.id)}
                        className="ml-2 p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        <TrashBinIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Category Modal ────────────────────────────────────────────── */}
      {showChangeCatModal && changeCatRecording && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Change Category</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{changeCatRecording.title}</p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                {!changeCatCreating ? (
                  <div className="flex gap-2">
                    <select
                      value={changeCatId}
                      onChange={(e) => setChangeCatId(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                    >
                      <option value="">No category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setChangeCatCreating(true)}
                      className="px-3 py-2 text-xs font-medium rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-brand-500 hover:text-brand-500 transition-colors whitespace-nowrap"
                    >
                      + New
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={changeCatNewName}
                      onChange={(e) => setChangeCatNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateCategoryForChange();
                        if (e.key === "Escape") {
                          setChangeCatCreating(false);
                          setChangeCatNewName("");
                        }
                      }}
                      placeholder="Category name..."
                      className="flex-1 px-4 py-2 rounded-lg border border-brand-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategoryForChange}
                      disabled={!changeCatNewName.trim()}
                      className="px-3 py-2 text-xs font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => { setChangeCatCreating(false); setChangeCatNewName(""); }}
                      className="px-3 py-2 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowChangeCatModal(false);
                    setChangeCatRecording(null);
                    setChangeCatId("");
                    setChangeCatCreating(false);
                    setChangeCatNewName("");
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangeRecordingCategory}
                  disabled={changeCatSaving || changeCatId === (changeCatRecording.categoryId ?? "")}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {changeCatSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Video Player Modal ───────────────────────────────────────────────── */}
      {playRecording && (
        <div
          className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50"
          onClick={() => setPlayRecording(null)}
        >
          <div className="absolute top-0 inset-x-0 z-20 px-4 py-2 bg-red-600/85 text-white text-xs font-semibold text-center border-b border-red-300/30">
            Protected stream: recording or screenshot attempts are monitored and blocked where possible.
          </div>

          {protectionNotice && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-lg bg-red-500/95 text-white text-xs font-semibold shadow-lg border border-red-200/40">
              {protectionNotice}
            </div>
          )}

          <div
            className="relative w-full max-w-4xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setPlayRecording(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors flex items-center gap-1.5 text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>

            {/* Video */}
            <div className="relative">
              <video
                key={playRecording.id}
                ref={protectedVideoRef}
                src={playRecording.fileUrl}
                controls
                autoPlay
                playsInline
                controlsList="nodownload noremoteplayback"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
                className={`w-full rounded-xl bg-black max-h-[70vh] transition-all ${!isWindowFocused ? "blur-xl" : ""}`}
                style={{ outline: "none" }}
              />

              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                <div
                  className="absolute -left-40 top-10 text-red-300/55 text-xs font-bold tracking-widest whitespace-nowrap"
                  style={{ animation: "protected-watermark-drift-a 14s linear infinite" }}
                >
                  {watermarkIdentity} • {watermarkTime} • PROTECTED CONTENT
                </div>
                <div
                  className="absolute -right-52 top-1/2 text-red-300/50 text-xs font-bold tracking-widest whitespace-nowrap"
                  style={{ animation: "protected-watermark-drift-b 16s linear infinite" }}
                >
                  {watermarkIdentity} • {watermarkTime} • PROTECTED CONTENT
                </div>
                <div
                  className="absolute -left-56 bottom-10 text-red-400/45 text-xs font-bold tracking-widest whitespace-nowrap"
                  style={{ animation: "protected-watermark-drift-c 18s linear infinite" }}
                >
                  {watermarkIdentity} • {watermarkTime} • PROTECTED CONTENT
                </div>
              </div>

              <div className="pointer-events-none absolute inset-0 flex items-end justify-end p-3">
                <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-black/70 text-white/90 border border-white/30 backdrop-blur-sm">
                  Protected Content
                </span>
              </div>

              {!isWindowFocused && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/80 backdrop-blur-md">
                  <div className="px-4 py-3 rounded-xl border border-red-300/30 bg-red-900/45 text-center">
                    <p className="text-sm font-bold text-white">Playback hidden while window is inactive</p>
                    <p className="text-xs text-red-100 mt-1">Return to this tab to resume protected playback.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Title bar */}
            <div className="mt-3 flex items-center justify-between px-1">
              <div>
                <h3 className="text-white font-semibold text-sm">{playRecording.title}</h3>
                <p className="text-white/50 text-xs mt-0.5">
                  {playRecording.category?.name && (
                    <span className="mr-2">{playRecording.category.name}</span>
                  )}
                  {new Date(playRecording.uploadDate).toLocaleDateString()}
                </p>
              </div>
              <span className="text-white/50 text-xs">{playRecording.duration}</span>
            </div>
          </div>
        </div>
      )}

      {/* Results summary */}
      {(searchQuery || filterCategoryId !== "All") && (
        <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">
          Showing {filteredRecordings.length} of {recordings.length} recordings
          {filterCategoryId !== "All" && (
            <span>
              {" "}in{" "}
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {categories.find((c) => c.id === filterCategoryId)?.name}
              </span>
            </span>
          )}
          {searchQuery && (
            <span>
              {" "}matching &ldquo;
              <span className="font-medium text-gray-700 dark:text-gray-200">{searchQuery}</span>
              &rdquo;
            </span>
          )}
          <button
            onClick={() => { setSearchQuery(""); setFilterCategoryId("All"); }}
            className="ml-2 text-brand-500 hover:text-brand-600 font-medium"
          >
            Clear
          </button>
        </p>
      )}

      {/* ── Recordings Grid ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 overflow-hidden animate-pulse"
            >
              <div className="h-48 bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      ) : filteredRecordings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <VideoIcon className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {recordings.length === 0 ? "No recordings uploaded yet." : "No recordings match your filters."}
          </p>
          {(searchQuery || filterCategoryId !== "All") && (
            <button
              onClick={() => { setSearchQuery(""); setFilterCategoryId("All"); }}
              className="text-sm text-brand-500 hover:text-brand-600 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {filteredRecordings.map((recording) => (
            <div
              key={recording.id}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              {/* ── Thumbnail / video preview ── */}
              <div className="relative h-48 bg-gray-900 group">
                {recording.fileUrl ? (
                  <>
                    <video
                      src={recording.fileUrl}
                      className="w-full h-full object-cover"
                      preload="metadata"
                      muted
                      playsInline
                      controlsList="nodownload noremoteplayback"
                      disablePictureInPicture
                      onContextMenu={(e) => e.preventDefault()}
                      onLoadedMetadata={(e) => {
                        e.currentTarget.currentTime = 1;
                      }}
                    />
                    {/* Play button overlay */}
                    <button
                      onClick={() => setPlayRecording(recording)}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full bg-linear-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                    <VideoIcon className="w-10 h-10 text-white/40" />
                  </div>
                )}

                {/* Badges overlay — always visible */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => { setChangeCatRecording(recording); setChangeCatId(recording.categoryId ?? ""); setShowChangeCatModal(true); }}
                    title="Change category"
                    className={`group/catbadge flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full backdrop-blur-sm transition-opacity hover:opacity-80 ${
                      recording.category
                        ? categoryColor(recording.category.id, categories)
                        : "bg-black/40 text-white/70 border border-white/20"
                    }`}
                  >
                    {recording.category ? recording.category.name : "No category"}
                    <svg className="w-2.5 h-2.5 opacity-70 group-hover/catbadge:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  {recording.duration && recording.duration !== "0:00" && (
                    <span className="px-2 py-0.5 bg-black/60 text-white text-xs font-semibold rounded-full backdrop-blur-sm">
                      {recording.duration}
                    </span>
                  )}
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleDeleteRecording(recording.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 text-white hover:bg-red-500/80 transition-colors backdrop-blur-sm"
                >
                  <TrashBinIcon className="w-5 h-5" />
                </button>

                {/* Content + actions overlay */}
                <div className="absolute inset-x-0 bottom-0 z-10 p-3 bg-linear-to-t from-black/85 via-black/55 to-transparent">
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => recording.fileUrl && setPlayRecording(recording)}
                      >
                        <h3 className="font-semibold text-white text-sm line-clamp-2 hover:text-brand-200 transition-colors">
                          {recording.title}
                        </h3>
                      </button>
                      <p className="text-xs text-white/70 mt-0.5">
                        {new Date(recording.uploadDate).toLocaleDateString()}
                      </p>

                      {recording.assignments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {recording.assignments.slice(0, 1).map((a) => (
                            <span
                              key={a.id}
                              className="px-2 py-0.5 text-xs font-medium rounded-full bg-brand-500/20 text-brand-100 border border-brand-300/30"
                            >
                              {a.courseName.split(" ")[0]}
                            </span>
                          ))}
                          {recording.assignments.length > 1 && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/15 text-white/80 border border-white/20">
                              +{recording.assignments.length - 1}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 items-center shrink-0">
                      <button
                        onClick={() => {
                          setSelectedRecording(recording);
                          setShowAssignModal(true);
                        }}
                        className="px-3 py-1.5 text-xs rounded-lg border border-white/30 text-white bg-white/10 hover:bg-brand-500 hover:border-brand-400 transition-colors font-semibold backdrop-blur-sm"
                      >
                        Assign
                      </button>
                      <button
                        onClick={() => { setQuestionsRecording(recording); setShowQuestionsModal(true); }}
                        className="p-1.5 rounded-lg border border-white/30 text-white/80 bg-white/10 hover:bg-purple-500/70 hover:text-white transition-colors backdrop-blur-sm"
                        title="Video questions"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      {recording.assignments.length > 0 && (
                        <button
                          onClick={() => {
                            setDetailsRecording(recording);
                            setShowDetailsModal(true);
                          }}
                          className="p-1.5 rounded-lg border border-white/30 text-white/80 bg-white/10 hover:bg-white/20 hover:text-white transition-colors backdrop-blur-sm"
                          title="View assignments"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* ── Video Questions Modal ─────────────────────────────────────────── */}
      {showQuestionsModal && questionsRecording && (
        <VideoQuestionsModal
          instituteId={instituteId}
          recording={questionsRecording}
          onClose={() => { setShowQuestionsModal(false); setQuestionsRecording(null); }}
        />
      )}

      <style jsx global>{`
        @keyframes protected-watermark-drift-a {
          0% { transform: translateX(0) rotate(-24deg); }
          100% { transform: translateX(170%) rotate(-24deg); }
        }

        @keyframes protected-watermark-drift-b {
          0% { transform: translateX(0) rotate(-24deg); }
          100% { transform: translateX(-185%) rotate(-24deg); }
        }

        @keyframes protected-watermark-drift-c {
          0% { transform: translateX(0) rotate(-24deg); }
          100% { transform: translateX(190%) rotate(-24deg); }
        }
      `}</style>
    </div>
  );
}
