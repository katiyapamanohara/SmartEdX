"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { authService } from "@/services/authService";
import { examService, Exam } from "@/services/examService";
import { useInstituteFeatures } from "@/hooks/useInstituteFeatures";

// ── Types ──────────────────────────────────────────────────────────────────────

interface LessonActivity {
  duration: string;
  title: string;
  description: string;
  activityType: string;
}
interface LessonPlan {
  title: string;
  subject: string;
  gradeLevel: string;
  totalDuration: string;
  learningObjectives: string[];
  materialsNeeded: string[];
  activities: LessonActivity[];
  assessmentStrategy: string;
  homework?: string;
  teacherNotes?: string;
  differentiationTips?: string;
}

interface EssayRubricItem {
  criterion: string;
  maxMarks: number;
  awardedMarks: number;
  comment: string;
}
interface EssayGrade {
  score: number;
  maxMarks: number;
  percentage: number;
  grade: string;
  overallFeedback: string;
  strengths: string[];
  areasForImprovement: string[];
  rubricBreakdown: EssayRubricItem[];
  suggestedScore: number;
}

interface PerformanceInsight {
  category: "strength" | "concern" | "trend" | "recommendation";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}
interface ClassInsights {
  overallSummary: string;
  classHealthScore: number;
  insights: PerformanceInsight[];
  weakAreas: string[];
  strongAreas: string[];
  recommendedActions: string[];
  teachingStrategySuggestions: string[];
}

interface AtRiskStudent {
  studentId: string;
  studentName: string;
  riskLevel: "critical" | "high" | "medium" | "watch";
  riskScore: number;
  primaryReasons: string[];
  immediateActions: string[];
  longTermRecommendations: string[];
}
interface AtRiskAnalysis {
  executiveSummary: string;
  atRiskStudents: AtRiskStudent[];
  classwidePatterns: string[];
  suggestedInterventions: string[];
  totalAnalyzed: number;
  atRiskCount: number;
}

interface StudentRow {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  courses: { courseId: string; courseName: string; quizzes: { score: number | null; totalMarks: number; contentId: string; contentTitle: string; attemptedAt: string | null }[] }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL;

function getToken() { return authService.getToken(); }

async function aiPost(path: string, body: unknown) {
  const r = await fetch(`${API}/api/ai${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`AI request failed (${r.status}): ${txt}`);
  }
  return r.json();
}

function avg(nums: number[]) {
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}
function pct(score: number | null, total: number) {
  if (score === null || total === 0) return null;
  return Math.round((score / total) * 100);
}

const RISK_COLOR: Record<string, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  watch: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const INSIGHT_COLOR: Record<string, string> = {
  strength: "border-green-400 bg-green-50 dark:bg-green-900/10",
  concern: "border-red-400 bg-red-50 dark:bg-red-900/10",
  trend: "border-blue-400 bg-blue-50 dark:bg-blue-900/10",
  recommendation: "border-purple-400 bg-purple-50 dark:bg-purple-900/10",
};

const INSIGHT_ICON: Record<string, string> = {
  strength: "Check",
  concern: "Warning",
  trend: "Trend",
  recommendation: "Idea",
};

const ACTIVITY_COLOR: Record<string, string> = {
  introduction: "bg-blue-100 text-blue-700",
  lecture: "bg-purple-100 text-purple-700",
  discussion: "bg-green-100 text-green-700",
  activity: "bg-orange-100 text-orange-700",
  assessment: "bg-red-100 text-red-700",
  "wrap-up": "bg-gray-100 text-gray-700",
};

// ── Tab types ──────────────────────────────────────────────────────────────────

type Tab = "lesson" | "essay" | "insights" | "atrisk";

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: "lesson", label: "Lesson Plan", desc: "Auto-generate structured lesson plans" },
  { id: "essay", label: "Essay Grader", desc: "AI grades student essay submissions" },
  { id: "insights", label: "Class Insights", desc: "Performance analytics & recommendations" },
  { id: "atrisk", label: "At-Risk Alerts", desc: "Identify struggling students early" },
];

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function AIToolsPage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;
  const [activeTab, setActiveTab] = useState<Tab>("lesson");

  const { isLoading: featuresLoading } = useInstituteFeatures({
    requiredFeature: "ai_tools",
    redirectTo: `/${instituteId}/teacher`,
  });

  if (featuresLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Teacher AI Tools
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Powered by AI — save hours every week on planning, grading, and analysis.
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all ${
              activeTab === t.id
                ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                : "border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 bg-white dark:bg-white/[0.03]"
            }`}
          >
            <span className="text-xl">{t.icon}</span>
            <span className={`text-sm font-semibold ${activeTab === t.id ? "text-brand-600 dark:text-brand-400" : "text-gray-900 dark:text-white"}`}>
              {t.label}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{t.desc}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] overflow-hidden">
        {activeTab === "lesson" && <LessonPlanTab instituteId={instituteId} />}
        {activeTab === "essay" && <EssayGraderTab instituteId={instituteId} />}
        {activeTab === "insights" && <ClassInsightsTab instituteId={instituteId} />}
        {activeTab === "atrisk" && <AtRiskTab instituteId={instituteId} />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — LESSON PLAN GENERATOR
// ══════════════════════════════════════════════════════════════════════════════

function LessonPlanTab({ instituteId }: { instituteId: string }) {
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [duration, setDuration] = useState(60);
  const [objectives, setObjectives] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [error, setError] = useState("");

  async function generate() {
    if (!topic.trim()) { setError("Topic is required."); return; }
    setError(""); setLoading(true); setPlan(null);
    try {
      const result = await aiPost("/teacher-tools/lesson-plan", {
        topic, subject, gradeLevel,
        durationMinutes: duration,
        objectives: objectives.split("\n").map(s => s.trim()).filter(Boolean),
        additionalContext: context,
      });
      setPlan(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function downloadPlan() {
    if (!plan) return;
    const lines = [
      `# ${plan.title}`,
      `**Subject:** ${plan.subject}  |  **Grade:** ${plan.gradeLevel}  |  **Duration:** ${plan.totalDuration}`,
      "",
      "## Learning Objectives",
      ...plan.learningObjectives.map(o => `- ${o}`),
      "",
      "## Materials Needed",
      ...plan.materialsNeeded.map(m => `- ${m}`),
      "",
      "## Lesson Activities",
      ...plan.activities.map(a => `### ${a.title} (${a.duration})\n*${a.activityType}*\n${a.description}`),
      "",
      "## Assessment Strategy",
      plan.assessmentStrategy,
      ...(plan.homework ? ["", "## Homework", plan.homework] : []),
      ...(plan.teacherNotes ? ["", "## Teacher Notes", plan.teacherNotes] : []),
      ...(plan.differentiationTips ? ["", "## Differentiation Tips", plan.differentiationTips] : []),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${plan.title.replace(/\s+/g, "_")}_lesson_plan.md`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Lesson Details</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Topic *</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Photosynthesis, World War II, Quadratic Equations"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Subject</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Biology"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Grade / Level</label>
              <input value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} placeholder="e.g. Grade 10"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Duration (minutes)</label>
            <input type="number" value={duration} onChange={e => setDuration(+e.target.value)} min={15} max={180} step={5}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Learning Objectives (one per line)</label>
            <textarea value={objectives} onChange={e => setObjectives(e.target.value)} rows={3}
              placeholder={"Understand the process of photosynthesis\nIdentify the reactants and products"}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Additional Context (optional)</label>
            <textarea value={context} onChange={e => setContext(e.target.value)} rows={2}
              placeholder="e.g. Students have prior knowledge of cells, lab equipment available"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button onClick={generate} disabled={loading}
            className="w-full py-2.5 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading ? <><Spinner />Generating lesson plan…</> : "Generate Lesson Plan"}
          </button>
        </div>

        {/* Preview placeholder */}
        {!plan && !loading && (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Your lesson plan will appear here</span>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Fill in the details and click Generate</p>
          </div>
        )}
        {loading && (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-200 dark:border-brand-700 p-8 text-center">
            <Spinner size="lg" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">AI is crafting your lesson plan…</p>
          </div>
        )}
      </div>

      {/* Result */}
      {plan && (
        <div className="space-y-5 border-t border-gray-100 dark:border-gray-800 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{plan.title}</h2>
              <div className="flex gap-3 mt-1 flex-wrap">
                {[plan.subject, plan.gradeLevel, plan.totalDuration].filter(Boolean).map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{tag}</span>
                ))}
              </div>
            </div>
            <button onClick={downloadPlan}
              className="shrink-0 px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              Download .md
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <Section title="Learning Objectives">
              <ul className="space-y-1">{plan.learningObjectives.map((o, i) => <li key={i} className="text-sm flex gap-2"><span className="text-green-500 mt-0.5">✓</span><span>{o}</span></li>)}</ul>
            </Section>
            <Section title="Materials Needed">
              <ul className="space-y-1">{plan.materialsNeeded.map((m, i) => <li key={i} className="text-sm flex gap-2"><span className="text-gray-400">•</span><span>{m}</span></li>)}</ul>
            </Section>
          </div>

          <Section title="Activities">
            <div className="space-y-3">
              {plan.activities.map((a, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="shrink-0 text-xs font-medium px-2 py-1 rounded-full mt-0.5" style={{backgroundColor: "#f3f4f6"}}>{a.duration}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{a.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ACTIVITY_COLOR[a.activityType] ?? "bg-gray-100 text-gray-600"}`}>{a.activityType}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <div className="grid md:grid-cols-2 gap-5">
            <Section title="Assessment Strategy"><p className="text-sm text-gray-700 dark:text-gray-300">{plan.assessmentStrategy}</p></Section>
            {plan.homework && <Section title="Homework"><p className="text-sm text-gray-700 dark:text-gray-300">{plan.homework}</p></Section>}
            {plan.teacherNotes && <Section title="Teacher Notes"><p className="text-sm text-gray-700 dark:text-gray-300">{plan.teacherNotes}</p></Section>}
            {plan.differentiationTips && <Section title="Differentiation Tips"><p className="text-sm text-gray-700 dark:text-gray-300">{plan.differentiationTips}</p></Section>}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — ESSAY GRADER
// ══════════════════════════════════════════════════════════════════════════════

function EssayGraderTab({ instituteId }: { instituteId: string }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [grading, setGrading] = useState(false);
  const [grade, setGrade] = useState<EssayGrade | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    examService.getMyExams(instituteId).then(e => { setExams(e); setLoadingExams(false); });
  }, [instituteId]);

  const essayQuestions = useMemo(() =>
    selectedExam?.questions?.filter(q => q.type === "essay") ?? [], [selectedExam]);

  const submittedStudents = useMemo(() => {
    if (!selectedExam) return [];
    const attempts = (selectedExam as any).studentAttempts ?? {};
    return Object.entries(attempts).map(([userId, attempt]: [string, any]) => ({
      userId,
      name: attempt.studentName ?? userId,
      answers: attempt.answers ?? {},
      pendingEssay: attempt.pendingEssayReview ?? false,
    }));
  }, [selectedExam]);

  const selectedStudent = submittedStudents.find(s => s.userId === selectedStudentId);
  const selectedQuestion = essayQuestions.find(q => q.id === selectedQuestionId);
  const studentAnswer = selectedStudent?.answers?.[selectedQuestionId] ?? "";

  async function gradeEssay() {
    if (!selectedQuestion || !studentAnswer) return;
    setError(""); setGrading(true); setGrade(null); setSaved(false);
    try {
      const result = await aiPost("/teacher-tools/grade-essay", {
        question: selectedQuestion.question,
        studentAnswer: String(studentAnswer),
        maxMarks: selectedQuestion.marks,
        sampleAnswer: selectedQuestion.sampleAnswer ?? "",
      });
      setGrade(result);
    } catch (e: any) { setError(e.message); }
    finally { setGrading(false); }
  }

  async function saveGrade() {
    if (!grade || !selectedExam || !selectedStudentId || !selectedQuestionId) return;
    setSaving(true);
    try {
      const token = getToken();
      await fetch(`${API}/api/institutes/institutes/${instituteId}/exams/${selectedExam.id}/grade-essay/${selectedStudentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ questionId: selectedQuestionId, score: grade.suggestedScore, feedback: grade.overallFeedback }),
      });
      setSaved(true);
    } catch { setError("Failed to save grade."); }
    finally { setSaving(false); }
  }

  const gradeColor = { A: "text-green-600", B: "text-blue-600", C: "text-yellow-600", D: "text-orange-600", F: "text-red-600" };

  if (loadingExams) return <div className="p-12 text-center text-sm text-gray-400"><Spinner /> Loading exams…</div>;

  return (
    <div className="p-6 space-y-5">
      <div className="grid md:grid-cols-3 gap-4">
        {/* Exam picker */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Select Exam</label>
          <select value={selectedExam?.id ?? ""} onChange={e => { setSelectedExam(exams.find(x => x.id === e.target.value) ?? null); setSelectedStudentId(""); setSelectedQuestionId(""); setGrade(null); }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">— choose exam —</option>
            {exams.filter(e => e.questions?.some(q => q.type === "essay")).map(e => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
          {selectedExam && essayQuestions.length === 0 && (
            <p className="text-xs text-amber-500 mt-1">This exam has no essay questions.</p>
          )}
        </div>

        {/* Student picker */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Select Student</label>
          <select value={selectedStudentId} onChange={e => { setSelectedStudentId(e.target.value); setGrade(null); setSaved(false); }}
            disabled={!selectedExam}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50">
            <option value="">— choose student —</option>
            {submittedStudents.map(s => (
              <option key={s.userId} value={s.userId}>{s.name}{s.pendingEssay ? " ⏳" : ""}</option>
            ))}
          </select>
        </div>

        {/* Question picker */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Select Essay Question</label>
          <select value={selectedQuestionId} onChange={e => { setSelectedQuestionId(e.target.value); setGrade(null); setSaved(false); }}
            disabled={!selectedStudentId}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50">
            <option value="">— choose question —</option>
            {essayQuestions.map(q => (
              <option key={q.id} value={q.id}>{q.question.slice(0, 60)}… ({q.marks} marks)</option>
            ))}
          </select>
        </div>
      </div>

      {/* Student answer preview */}
      {selectedQuestion && selectedStudent && (
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Question ({selectedQuestion.marks} marks)</p>
            <p className="text-sm text-gray-900 dark:text-white">{selectedQuestion.question}</p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Student Answer</p>
            {studentAnswer
              ? <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{String(studentAnswer)}</p>
              : <p className="text-sm text-amber-500 italic">Student has not answered this question yet.</p>}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          {!grade && (
            <button onClick={gradeEssay} disabled={grading || !studentAnswer}
              className="w-full py-2.5 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {grading ? <><Spinner />AI is grading…</> : "Grade with AI"}
            </button>
          )}
        </div>
      )}

      {/* Grade result */}
      {grade && (
        <div className="border-t border-gray-100 dark:border-gray-800 pt-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className={`text-4xl font-black ${gradeColor[grade.grade as keyof typeof gradeColor] ?? "text-gray-900"}`}>{grade.grade}</div>
                <div className="text-xs text-gray-500 mt-0.5">Grade</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{grade.suggestedScore}<span className="text-base text-gray-400">/{grade.maxMarks}</span></div>
                <div className="text-xs text-gray-500 mt-0.5">{grade.percentage}%</div>
              </div>
            </div>
            <div className="flex gap-2">
              {!saved ? (
                <button onClick={saveGrade} disabled={saving}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
                  {saving ? "Saving…" : "✓ Accept & Save"}
                </button>
              ) : (
                <span className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">✓ Grade Saved</span>
              )}
              <button onClick={() => { setGrade(null); setSaved(false); }}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                Re-grade
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-blue-50 dark:bg-blue-900/10">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Overall Feedback</p>
            <p className="text-sm text-gray-800 dark:text-gray-200">{grade.overallFeedback}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-green-200 dark:border-green-800 p-4 bg-green-50 dark:bg-green-900/10">
              <p className="text-xs font-semibold text-green-600 mb-2">Strengths</p>
              <ul className="space-y-1">{grade.strengths.map((s, i) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2"><span className="text-green-500">•</span>{s}</li>)}</ul>
            </div>
            <div className="rounded-xl border border-orange-200 dark:border-orange-800 p-4 bg-orange-50 dark:bg-orange-900/10">
              <p className="text-xs font-semibold text-orange-600 mb-2">Areas to Improve</p>
              <ul className="space-y-1">{grade.areasForImprovement.map((a, i) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2"><span className="text-orange-500">•</span>{a}</li>)}</ul>
            </div>
          </div>

          <Section title="Rubric Breakdown">
            <div className="space-y-2">
              {grade.rubricBreakdown.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{r.criterion}</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">{r.awardedMarks}/{r.maxMarks}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(r.awardedMarks / r.maxMarks) * 100}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {!selectedExam && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Select an exam with essay questions to begin</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">AI will analyze the student's answer and provide detailed feedback</p>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — CLASS PERFORMANCE INSIGHTS
// ══════════════════════════════════════════════════════════════════════════════

function ClassInsightsTab({ instituteId }: { instituteId: string }) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [insights, setInsights] = useState<ClassInsights | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    Promise.all([
      fetch(`${API}/api/institutes/institutes/${instituteId}/courses/student-report`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.ok ? r.json() : []),
      examService.getMyExams(instituteId),
    ]).then(([s, e]) => { setStudents(s); setExams(e); setLoadingData(false); });
  }, [instituteId]);

  const courses = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach(s => s.courses.forEach(c => map.set(c.courseId, c.courseName)));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [students]);

  async function generateInsights() {
    if (!selectedCourse) return;
    setError(""); setGenerating(true); setInsights(null);
    try {
      const courseStudents = students.filter(s => s.courses.some(c => c.courseId === selectedCourse));
      const courseName = courses.find(c => c.id === selectedCourse)?.name ?? "Course";

      // Build quiz stats per quiz content
      const quizMap = new Map<string, { title: string; scores: number[]; total: number; attempts: number; students: number }>();
      courseStudents.forEach(s => {
        const c = s.courses.find(c2 => c2.courseId === selectedCourse);
        if (!c) return;
        c.quizzes.forEach(q => {
          if (!quizMap.has(q.contentId)) quizMap.set(q.contentId, { title: q.contentTitle, scores: [], total: q.totalMarks, attempts: 0, students: 0 });
          const entry = quizMap.get(q.contentId)!;
          entry.students++;
          if (q.score !== null) { entry.scores.push(Math.round((q.score / q.totalMarks) * 100)); entry.attempts++; }
        });
      });

      const quizStats = Array.from(quizMap.values()).map(q => ({
        title: q.title,
        avgScore: q.scores.length ? q.scores.reduce((a, b) => a + b, 0) / q.scores.length : 0,
        attemptRate: q.students > 0 ? (q.attempts / q.students) * 100 : 0,
      }));

      // Exam stats for this course
      const courseExams = exams.filter(e => e.courseId === selectedCourse);
      const examStats = courseExams.map(e => {
        const attempts = Object.values((e as any).studentAttempts ?? {}) as any[];
        const scores = attempts.map(a => a.totalMarks > 0 ? (a.score / a.totalMarks) * 100 : 0);
        const passed = attempts.filter(a => a.passed).length;
        return {
          title: e.title,
          avgScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
          passRate: attempts.length > 0 ? (passed / attempts.length) * 100 : 0,
        };
      });

      // Compute class average
      const allPcts: number[] = [];
      courseStudents.forEach(s => {
        const c = s.courses.find(c2 => c2.courseId === selectedCourse);
        if (!c) return;
        c.quizzes.forEach(q => { if (q.score !== null) allPcts.push(Math.round((q.score / q.totalMarks) * 100)); });
      });
      const classAvg = allPcts.length ? allPcts.reduce((a, b) => a + b, 0) / allPcts.length : 0;
      const passingCount = allPcts.filter(p => p >= 50).length;
      const passingRate = allPcts.length ? (passingCount / allPcts.length) * 100 : 0;

      const result = await aiPost("/teacher-tools/class-insights", {
        courseName, totalStudents: courseStudents.length,
        classAverage: classAvg, passingRate, quizStats, examStats,
      });
      setInsights(result);
    } catch (e: any) { setError(e.message); }
    finally { setGenerating(false); }
  }

  const healthColor = (score: number) =>
    score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-600";

  if (loadingData) return <div className="p-12 text-center text-sm text-gray-400"><Spinner /> Loading class data…</div>;
  if (!courses.length) return <EmptyState title="No course data available" desc="Once students complete quizzes, insights will appear here." />;

  return (
    <div className="p-6 space-y-5">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Select Course to Analyze</label>
          <select value={selectedCourse} onChange={e => { setSelectedCourse(e.target.value); setInsights(null); }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">— choose course —</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={generateInsights} disabled={!selectedCourse || generating}
          className="px-5 py-2 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center gap-2 whitespace-nowrap">
          {generating ? <><Spinner />Analyzing…</> : "Generate Insights"}
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {!insights && !generating && (
        <EmptyState title="Select a course and click Generate Insights" desc="AI will analyze quiz scores, exam results, and engagement to surface patterns." />
      )}
      {generating && <div className="py-20 text-center"><Spinner size="lg" /><p className="text-sm text-gray-400 mt-3">Analyzing class performance…</p></div>}

      {insights && (
        <div className="space-y-5">
          {/* Health score */}
          <div className="flex items-center gap-5 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="text-center">
              <div className={`text-5xl font-black ${healthColor(insights.classHealthScore)}`}>{insights.classHealthScore}</div>
              <div className="text-xs text-gray-500 mt-1">Class Health /100</div>
            </div>
            <div className="flex-1">
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
                <div className={`h-full rounded-full ${insights.classHealthScore >= 80 ? "bg-green-500" : insights.classHealthScore >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                  style={{ width: `${insights.classHealthScore}%` }} />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{insights.overallSummary}</p>
            </div>
          </div>

          {/* Insights grid */}
          <div className="grid md:grid-cols-2 gap-3">
            {insights.insights.map((ins, i) => (
              <div key={i} className={`rounded-xl border-l-4 p-4 ${INSIGHT_COLOR[ins.category]}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span>{INSIGHT_ICON[ins.category]}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{ins.category}</span>
                  <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${ins.priority === "high" ? "bg-red-100 text-red-600" : ins.priority === "medium" ? "bg-yellow-100 text-yellow-600" : "bg-gray-100 text-gray-600"}`}>{ins.priority}</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{ins.title}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{ins.description}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <Section title=" Weak Areas">
              <ul className="space-y-1">{insights.weakAreas.map((w, i) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2"><span className="text-red-400">⚠</span>{w}</li>)}</ul>
            </Section>
            <Section title="Strong Areas">
              <ul className="space-y-1">{insights.strongAreas.map((s, i) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2"><span className="text-green-400">✓</span>{s}</li>)}</ul>
            </Section>
          </div>

          <Section title="Recommended Actions">
            <ol className="space-y-2">{insights.recommendedActions.map((a, i) => (
              <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                {a}
              </li>
            ))}</ol>
          </Section>

          <Section title="Teaching Strategy Suggestions">
            <ul className="space-y-1">{insights.teachingStrategySuggestions.map((s, i) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2"><span className="text-purple-400"></span>{s}</li>)}</ul>
          </Section>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4 — AT-RISK STUDENTS
// ══════════════════════════════════════════════════════════════════════════════

function AtRiskTab({ instituteId }: { instituteId: string }) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [analysis, setAnalysis] = useState<AtRiskAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    Promise.all([
      fetch(`${API}/api/institutes/institutes/${instituteId}/courses/student-report`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.ok ? r.json() : []),
      examService.getMyExams(instituteId),
    ]).then(([s, e]) => { setStudents(s); setExams(e); setLoadingData(false); });
  }, [instituteId]);

  const courses = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach(s => s.courses.forEach(c => map.set(c.courseId, c.courseName)));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [students]);

  async function runAnalysis() {
    if (!selectedCourse) return;
    setError(""); setAnalyzing(true); setAnalysis(null);
    try {
      const courseName = courses.find(c => c.id === selectedCourse)?.name ?? "Course";
      const courseStudents = students.filter(s => s.courses.some(c => c.courseId === selectedCourse));
      const courseExams = exams.filter(e => e.courseId === selectedCourse);

      const studentData = courseStudents.map(s => {
        const c = s.courses.find(c2 => c2.courseId === selectedCourse)!;
        const quizPcts = c.quizzes.filter(q => q.score !== null).map(q => Math.round((q.score! / q.totalMarks) * 100));
        const examAttempts = courseExams.map(ex => {
          const att = (ex as any).studentAttempts?.[s.userId];
          return att ? Math.round((att.score / att.totalMarks) * 100) : null;
        }).filter(Boolean) as number[];
        return {
          id: s.userId,
          name: [s.firstName, s.lastName].filter(Boolean).join(" ") || s.email,
          quizAvg: quizPcts.length ? Math.round(quizPcts.reduce((a, b) => a + b) / quizPcts.length) : null,
          examAvg: examAttempts.length ? Math.round(examAttempts.reduce((a, b) => a + b) / examAttempts.length) : null,
          overallAvg: [...quizPcts, ...examAttempts].length ? Math.round([...quizPcts, ...examAttempts].reduce((a, b) => a + b) / [...quizPcts, ...examAttempts].length) : null,
          quizzesAttempted: quizPcts.length,
          totalQuizzes: c.quizzes.length,
          examsAttempted: examAttempts.length,
          totalExams: courseExams.length,
        };
      });

      const result = await aiPost("/teacher-tools/at-risk", { courseName, students: studentData });
      setAnalysis(result);
    } catch (e: any) { setError(e.message); }
    finally { setAnalyzing(false); }
  }

  if (loadingData) return <div className="p-12 text-center text-sm text-gray-400"><Spinner /> Loading student data…</div>;
  if (!courses.length) return <EmptyState title="No student data available" desc="Enroll students in courses and have them complete assessments to see at-risk alerts." />;

  return (
    <div className="p-6 space-y-5">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Select Course to Analyze</label>
          <select value={selectedCourse} onChange={e => { setSelectedCourse(e.target.value); setAnalysis(null); }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">— choose course —</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={runAnalysis} disabled={!selectedCourse || analyzing}
          className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2 whitespace-nowrap">
          {analyzing ? <><Spinner />Analyzing…</> : "Identify At-Risk Students"}
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {!analysis && !analyzing && (
        <EmptyState title="Identify students who need your attention" desc="AI analyzes quiz scores, exam results, and missed assignments to find at-risk students before it's too late." />
      )}
      {analyzing && <div className="py-20 text-center"><Spinner size="lg" /><p className="text-sm text-gray-400 mt-3">Scanning student performance data…</p></div>}

      {analysis && (
        <div className="space-y-5">
          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Students Analyzed", value: analysis.totalAnalyzed, color: "text-gray-900 dark:text-white" },
              { label: "At Risk", value: analysis.atRiskCount, color: "text-red-600" },
              { label: "Safe", value: analysis.totalAnalyzed - analysis.atRiskCount, color: "text-green-600" },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center bg-white dark:bg-white/[0.03]">
                <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-4">
            <p className="text-xs font-semibold text-amber-600 mb-1">Executive Summary</p>
            <p className="text-sm text-gray-800 dark:text-gray-200">{analysis.executiveSummary}</p>
          </div>

          {/* At-risk student cards */}
          {analysis.atRiskStudents.length === 0
            ? <div className="py-10 text-center"><span className="text-4xl"></span><p className="text-sm font-medium text-green-600 dark:text-green-400 mt-2">No at-risk students found!</p><p className="text-xs text-gray-400 mt-1">The class appears to be on track.</p></div>
            : (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">At-Risk Students ({analysis.atRiskStudents.length})</h3>
                {analysis.atRiskStudents.map(s => (
                  <div key={s.studentId} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] overflow-hidden">
                    <button className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                      onClick={() => setExpandedStudent(expandedStudent === s.studentId ? null : s.studentId)}>
                      <div className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${RISK_COLOR[s.riskLevel]}`}>{s.riskLevel}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">{s.studentName}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{s.primaryReasons[0]}</div>
                      </div>
                      <div className="shrink-0 text-center">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{s.riskScore}</div>
                        <div className="text-xs text-gray-500">Risk Score</div>
                      </div>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedStudent === s.studentId ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>

                    {expandedStudent === s.studentId && (
                      <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 space-y-4 pt-4">
                        <div>
                          <p className="text-xs font-semibold text-red-500 mb-1">⚠ Risk Factors</p>
                          <ul className="space-y-0.5">{s.primaryReasons.map((r, i) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2"><span className="text-red-400">•</span>{r}</li>)}</ul>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-orange-500 mb-1">⚡ Immediate Actions</p>
                            <ul className="space-y-0.5">{s.immediateActions.map((a, i) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2"><span className="text-orange-400">{i + 1}.</span>{a}</li>)}</ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-blue-500 mb-1">Long-Term Recommendations</p>
                            <ul className="space-y-0.5">{s.longTermRecommendations.map((r, i) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2"><span className="text-blue-400">•</span>{r}</li>)}</ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

          <div className="grid md:grid-cols-2 gap-5">
            {analysis.classwidePatterns.length > 0 && (
              <Section title="Classwide Patterns">
                <ul className="space-y-1">{analysis.classwidePatterns.map((p, i) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2"><span className="text-gray-400">•</span>{p}</li>)}</ul>
              </Section>
            )}
            {analysis.suggestedInterventions.length > 0 && (
              <Section title="Suggested Interventions">
                <ul className="space-y-1">{analysis.suggestedInterventions.map((i, idx) => <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2"><span className="text-purple-400"></span>{i}</li>)}</ul>
              </Section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared UI components ───────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-white/[0.03]">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs">{desc}</p>
    </div>
  );
}

function Spinner({ size = "sm" }: { size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "w-8 h-8" : "w-4 h-4";
  return <svg className={`${cls} animate-spin text-brand-500`} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>;
}
