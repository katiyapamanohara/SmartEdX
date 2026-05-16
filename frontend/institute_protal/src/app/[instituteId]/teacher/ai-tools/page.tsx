  "use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { authService } from "@/services/authService";
import { examService, Exam } from "@/services/examService";
import { instituteService } from "@/services/instituteService";
import { useInstituteFeatures } from "@/hooks/useInstituteFeatures";
import { useFeatures } from "@/context/InstituteFeatureContext";
import VoiceModal from "../ai-tools/VoiceModal";

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

type Tab = "chat" | "lesson" | "essay" | "insights" | "atrisk";
const TABS: { id: Tab; label: string; icon: string; desc: string }[] = [
  { id: "chat",     label: "AI Chat",       icon: "", desc: "Chat with your AI teaching assistant" },
  { id: "lesson",   label: "Lesson Plan",   icon: "", desc: "Auto-generate structured lesson plans" },
  { id: "essay",    label: "Essay Grader",  icon: "", desc: "AI grades student essay submissions" },
  { id: "insights", label: "Class Insights",icon: "", desc: "Performance analytics & recommendations" },
  { id: "atrisk",   label: "At-Risk Alerts",icon: "", desc: "Identify struggling students early" },
];

// ── TeacherChat types ──────────────────────────────────────────────────────────

interface TeacherChatMessage {
  role: "user" | "assistant";
  content: string;
  fileName?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function AIToolsPage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [chatCourse, setChatCourse] = useState<{ id: string; name: string } | null>(null);

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

  const hideTabs = activeTab === "chat" && chatCourse !== null;

  // ── Unified full-screen layout for ALL tabs ──────────────────────────────────
  return (
    <div className="flex flex-col px-4 pt-3 pb-4 gap-3">

      {/* Compact pill tab switcher — hidden once chat is open */}
      {!hideTabs && (
      <div className="flex items-center justify-center gap-1.5 flex-wrap">

        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeTab === t.id
                ? "bg-brand-500 text-white shadow-sm"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      )}

      {/* Content */}
      <div>
        <div className={activeTab === "chat" ? "" : "hidden"}>
          <AIChatTab instituteId={instituteId} selectedCourse={chatCourse} onCourseSelect={setChatCourse} />
        </div>

        <div className={activeTab !== "chat" ? "rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3" : "hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3"}>
            <div className={activeTab === "lesson" ? "" : "hidden"}>
              <LessonPlanTab instituteId={instituteId} />
            </div>
            <div className={activeTab === "essay" ? "" : "hidden"}>
              <EssayGraderTab instituteId={instituteId} />
            </div>
            <div className={activeTab === "insights" ? "" : "hidden"}>
              <ClassInsightsTab instituteId={instituteId} />
            </div>
            <div className={activeTab === "atrisk" ? "" : "hidden"}>
              <AtRiskTab instituteId={instituteId} />
            </div>
          </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 0 — AI CHAT  (teacher assistant with voice)
// ══════════════════════════════════════════════════════════════════════════════

function AIChatTab({ instituteId, selectedCourse, onCourseSelect }: {
  instituteId: string;
  selectedCourse: { id: string; name: string } | null;
  onCourseSelect: (course: { id: string; name: string } | null) => void;
}) {
  const [courses, setCourses]             = useState<{ id: string; name: string }[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  const [messages, setMessages]   = useState<TeacherChatMessage[]>([]);
  const [input, setInput]         = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [voiceMode, setVoiceMode] = useState(false);
  const [isDark, setIsDark]       = useState(false);

  const { hasFeature } = useFeatures();
  const voiceEnabled = hasFeature("voice_agent");

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dark-mode detection
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Load all courses assigned to this teacher
  useEffect(() => {
    instituteService.getMyTeacherCourses(instituteId)
      .then(courses => {
        setCourses(courses.map(c => ({ id: c.id, name: c.name })));
        setCoursesLoading(false);
      })
      .catch(() => { setCourses([]); setCoursesLoading(false); });
  }, [instituteId]);

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, chatLoading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  function handleSelectCourse(course: { id: string; name: string }) {
    onCourseSelect(course);
    const user = authService.getUser();
    const name = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "";
    setMessages([{
      role: "assistant",
      content:
        `Hi${name ? ` ${name}` : ""}! 👋 I'm your AI teaching assistant for **${course.name}**.\n\n` +
        `I can help you with:\n` +
        `• Craft lesson plans & structured activities\n` +
        `• Explain difficult concepts or suggest analogies\n` +
        `• Analyze student performance patterns\n` +
        `• Suggest teaching strategies & differentiation tips\n` +
        `• Review uploaded documents or presentations\n` +
        `• Answer any teaching or curriculum questions\n\n` +
        `What would you like help with today?`,
    }]);
  }

  const sendMessage = useCallback(async (text: string, file?: File | null) => {
    const trimmed = text.trim();
    if ((!trimmed && !file) || chatLoading) return;

    const messageText = trimmed || `Please analyze this file: ${file!.name}`;
    const userMsg: TeacherChatMessage = { role: "user", content: messageText, fileName: file?.name };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setPendingFile(null);
    setChatLoading(true);

    try {
      const token = getToken();
      const user  = authService.getUser();

      const formData = new FormData();
      formData.append("messages",    JSON.stringify(updated.map(m => ({ role: m.role, content: m.content }))));
      formData.append("institute_id", instituteId);
      formData.append("teacher_id",   user?.id ?? "");
      formData.append("context", JSON.stringify({
        course_name:  selectedCourse?.name,
        course_id:    selectedCourse?.id,
        teacher_name: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "",
        role: "teacher",
      }));
      if (token) formData.append("auth_token", token);
      if (file)  formData.append("file", file);

      const res = await fetch(`${API}/api/ai/teacher-chat/message`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) throw new Error(res.statusText);
      const data: { reply: string } = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again!" }]);
    } finally {
      setChatLoading(false);
    }
  }, [messages, chatLoading, instituteId, selectedCourse]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input, pendingFile); }
  }
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPendingFile(e.target.files?.[0] ?? null);
    e.target.value = "";
  }

  // ── Course selection screen ───────────────────────────────────────────────
  if (!selectedCourse) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-8">
        <div className="max-w-xl w-full">
          <div className="text-center mb-8">
            
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">Select a Course to Start</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Get tailored AI teaching assistance for a specific course.</p>
          </div>

          {coursesLoading ? (
            <div className="space-y-3">
              {[0,1,2].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {courses.length === 0 && (
                <p className="text-center text-sm text-gray-400 dark:text-gray-500 pb-4">No courses with students found — starting in general mode.</p>
              )}
              {courses.map(course => (
                <button key={course.id} onClick={() => handleSelectCourse(course)}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl bg-brand-50 dark:bg-brand-500/10 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-all text-left border border-brand-100 dark:border-brand-800">
                 
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{course.name}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-brand-400 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              ))}
              <button onClick={() => handleSelectCourse({ id: "general", name: "General Teaching" })}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl bg-brand-50 dark:bg-brand-500/10 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-all text-left border border-brand-100 dark:border-brand-800">
               
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">General AI Assistant</p>
                  <p className="text-xs text-gray-400 mt-0.5">Chat about any teaching topic</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Chat screen (full-height, matches student layout) ────────────────────
  const voiceWsUrl = (() => {
    const user    = authService.getUser();
    const wsBase  = process.env.NEXT_PUBLIC_VOICE_AGENT_WS_URL ?? "ws://localhost:5001/voice-agent";
    const userId  = user?.id ?? "teacher";
    const session = `tva-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return `${wsBase}/ws/course-qa/${instituteId}/${selectedCourse.id}/${userId}/${session}?course_name=${encodeURIComponent(selectedCourse.name)}&role=teacher`;
  })();

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] rounded-2xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 shrink-0 bg-linear-to-r from-brand-50 to-indigo-50 dark:from-brand-500/5 dark:to-indigo-500/5">
        <button onClick={() => { onCourseSelect(null); setMessages([]); }}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white/60 dark:hover:bg-gray-800 transition-colors shrink-0"
          title="Change course">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">{selectedCourse.name}</h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">AI Teaching Assistant · SmartEdX</p>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-green-600 dark:text-green-500 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Ready to help
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar">
        {messages.map((msg, i) => <TeacherMessageBubble key={i} msg={msg} />)}
        {chatLoading && <ChatTypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Pending file badge */}
      {pendingFile && (
        <div className="mx-6 mb-2 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-50 dark:bg-brand-500/10">
          <svg className="w-4 h-4 text-brand-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
          </svg>
          <span className="text-[11px] text-brand-700 dark:text-brand-400 flex-1 truncate">{pendingFile.name}</span>
          <button onClick={() => setPendingFile(null)} className="text-brand-400 hover:text-brand-600 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-6 pb-6 pt-1 shrink-0">
        <div className="flex items-center gap-2 rounded-full bg-white dark:bg-gray-800 shadow-md px-4 py-3">
          {/* Hidden file input */}
          <input ref={fileInputRef} type="file"
            accept=".pdf,.docx,.pptx,.txt,.csv,.md,.png,.jpg,.jpeg,.webp"
            onChange={handleFileChange} className="hidden" />

          {/* Attach button */}
          <button onClick={() => fileInputRef.current?.click()} disabled={chatLoading} title="Attach file"
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
            </svg>
          </button>

          {/* Textarea */}
          <textarea ref={textareaRef} rows={1} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={pendingFile ? `Ask about ${pendingFile.name}…` : "Ask anything…"}
            disabled={chatLoading}
            className="flex-1 resize-none bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none leading-relaxed disabled:opacity-50 max-h-[120px]" />

          {/* Send / Mic combo — mirrors student behaviour */}
          <button
            onClick={() =>
              input.trim() || pendingFile
                ? sendMessage(input, pendingFile)
                : voiceEnabled ? setVoiceMode(true) : undefined
            }
            disabled={chatLoading || (!input.trim() && !pendingFile && !voiceEnabled)}
            title={!voiceEnabled && !input.trim() && !pendingFile ? "Voice Agent not enabled" : undefined}
            className="shrink-0 w-9 h-9 rounded-full bg-gray-700 dark:bg-gray-600 hover:bg-gray-800 dark:hover:bg-gray-500 text-white flex items-center justify-center transition-all hover:scale-105 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {input.trim() || pendingFile ? (
              /* Send arrow */
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            ) : (
              /* Mic icon */
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                style={{ opacity: voiceEnabled ? 1 : 0.4 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-gray-400 dark:text-gray-600">
          This AI can make mistakes. Please verify important info.
        </p>
      </div>

      {/* ── Full-screen voice overlay (identical to student side) ─────────────── */}
      {voiceMode && voiceEnabled && (
        <VoiceModal
          isDark={isDark}
          instituteLogo={null}
          context={{ selected_course: selectedCourse.name }}
          selectedCourse={{ id: selectedCourse.id, name: selectedCourse.name, code: "" } as any}
          instituteId={instituteId}
          wsUrl={voiceWsUrl}
          label="Teacher Assistant"
          onClose={() => setVoiceMode(false)}
        />
      )}
    </div>
  );
}

function TeacherMessageBubble({ msg }: { msg: TeacherChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
   
      <div className={`max-w-[80%] ${isUser ? "order-1" : ""}`}>
        {msg.fileName && (
          <div className="mb-1 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <span>📎</span>{msg.fileName}
          </div>
        )}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-brand-500 text-white rounded-br-sm"
            : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
        }`}>
          {msg.content}
        </div>
      </div>
    </div>
  );
}

function ChatTypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
    
      <div className="px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 rounded-bl-sm flex items-center gap-1.5">
        {[0,1,2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
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
  const [gradeLevel] = useState("");
  const [duration, setDuration] = useState(60);
  const [objectives, setObjectives] = useState("");
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    instituteService.getMyTeacherCourses(instituteId)
      .then(courses => setCourses(courses.map(c => ({ id: c.id, name: c.name }))))
      .catch(() => {});
  }, [instituteId]);
  const [context, setContext] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [error, setError] = useState("");
  const lessonFileRef = useRef<HTMLInputElement>(null);

  async function generate() {
    if (!topic.trim() && !uploadedFile) { setError("Enter a topic or upload a file."); return; }
    setError(""); setLoading(true); setPlan(null);
    try {
      let result: LessonPlan;
      if (uploadedFile) {
        const token = getToken();
        const fd = new FormData();
        fd.append("file", uploadedFile);
        if (topic.trim())     fd.append("topic", topic.trim());
        if (subject.trim())   fd.append("subject", subject.trim());
        if (gradeLevel.trim()) fd.append("gradeLevel", gradeLevel.trim());
        fd.append("durationMinutes", String(duration));
        if (objectives.trim())
          fd.append("objectives", JSON.stringify(objectives.split("\n").map(s => s.trim()).filter(Boolean)));
        if (context.trim()) fd.append("additionalContext", context.trim());
        const res = await fetch(`${API}/api/ai/teacher-tools/lesson-plan`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        if (!res.ok) throw new Error(`AI request failed (${res.status})`);
        result = await res.json();
      } else {
        result = await aiPost("/teacher-tools/lesson-plan", {
          topic, subject, gradeLevel,
          durationMinutes: duration,
          objectives: objectives.split("\n").map(s => s.trim()).filter(Boolean),
          additionalContext: context,
        });
      }
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
    <div className="p-6 space-y-6 flex flex-col items-center">
      <div className="w-full max-w-xl">
        {/* Form */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Lesson Details</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Topic *</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Photosynthesis, World War II, Quadratic Equations"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Course</label>
              {courses.length > 0 ? (
                <select
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">— select course —</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Biology"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              )}
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

          {/* File upload */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Upload Material — optional (PDF, PPTX, DOCX, TXT)
            </label>
            <input ref={lessonFileRef} type="file"
              accept=".pdf,.pptx,.docx,.txt,.md"
              onChange={e => { setUploadedFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
              className="hidden" />
            {uploadedFile ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-brand-200 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/10 text-sm">
                <span className="text-brand-500 shrink-0">📎</span>
                <span className="flex-1 truncate text-brand-700 dark:text-brand-400 text-xs">{uploadedFile.name}</span>
                <button onClick={() => setUploadedFile(null)}
                  className="text-brand-400 hover:text-red-500 transition-colors text-xs font-bold shrink-0">✕</button>
              </div>
            ) : (
              <button onClick={() => lessonFileRef.current?.click()}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 hover:border-brand-300 dark:hover:border-brand-600 hover:text-brand-600 transition-colors">
                <span>📎</span> Click to upload course material…
              </button>
            )}
            {uploadedFile && !topic.trim() && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Topic will be auto-detected from the uploaded file.</p>
            )}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          <button onClick={generate} disabled={loading}
            className="w-full py-2.5 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading ? <><Spinner />Generating lesson plan…</> : "✨ Generate Lesson Plan"}
          </button>
        </div>


        {loading && (
          <div className="md:col-span-2 flex flex-col items-center justify-center py-16 text-center">
            <Spinner size="lg" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">AI is crafting your lesson plan…</p>
          </div>
        )}
      </div>

      {/* Result */}
      {plan && (
        <div className="space-y-5 border-t border-gray-100 dark:border-gray-800 pt-6 w-full max-w-3xl">
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
  const [allCourses, setAllCourses] = useState<{ id: string; name: string }[]>([]);
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
      instituteService.getMyTeacherCourses(instituteId),
    ]).then(([s, e, c]) => {
      setStudents(s);
      setExams(e);
      setAllCourses(c.map((course: any) => ({ id: course.id, name: course.name })));
      setLoadingData(false);
    });
  }, [instituteId]);

  const courses = useMemo(() => {
    const map = new Map<string, string>();
    allCourses.forEach(c => map.set(c.id, c.name));
    students.forEach(s => s.courses.forEach(c => map.set(c.courseId, c.courseName)));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [students, allCourses]);

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
  const [allCourses, setAllCourses] = useState<{ id: string; name: string }[]>([]);
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
      instituteService.getMyTeacherCourses(instituteId),
    ]).then(([s, e, c]) => {
      setStudents(s);
      setExams(e);
      setAllCourses(c.map((course: any) => ({ id: course.id, name: course.name })));
      setLoadingData(false);
    });
  }, [instituteId]);

  const courses = useMemo(() => {
    const map = new Map<string, string>();
    allCourses.forEach(c => map.set(c.id, c.name));
    students.forEach(s => s.courses.forEach(c => map.set(c.courseId, c.courseName)));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [students, allCourses]);

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
              <div key={s.label} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center bg-white dark:bg-white/3">
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
                  <div key={s.studentId} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 overflow-hidden">
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
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-white/3">
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
