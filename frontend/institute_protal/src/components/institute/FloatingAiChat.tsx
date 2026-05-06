"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { authService } from "@/services/authService";
import { instituteService } from "@/services/instituteService";

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = "user" | "assistant";
type MessageType = "text" | "course_created" | "analytics";

interface ChatMessage {
  role: MessageRole;
  type: MessageType;
  content: string;
  data?: Record<string, unknown>;
}

interface InstituteContext {
  institute_name?: string;
  student_count?: number;
  teacher_count?: number;
  course_count?: number;
}

interface FloatingAiChatProps {
  instituteId: string;
}

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTED = [
  { label: "📊 Live analytics", text: "Show me live analytics for my institute" },
  { label: "➕ Create a course", text: "I want to create a new course" },
  { label: "📢 Draft announcement", text: "Draft an announcement for students" },
  { label: "📋 Report template", text: "Generate a monthly report template" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function FloatingAiChat({ instituteId }: FloatingAiChatProps) {
  const [open, setOpen]                   = useState(false);
  const [hasNew, setHasNew]               = useState(false);
  const [context, setContext]             = useState<InstituteContext>({});
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [contextLoaded, setContextLoaded] = useState(false);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // ── Fetch institute context once ──────────────────────────────────────────
  useEffect(() => {
    if (!instituteId || contextLoaded) return;
    async function load() {
      try {
        const [institute, students, teacherCount, courses] = await Promise.all([
          instituteService.getInstituteById(instituteId),
          instituteService.getInstituteUsers(instituteId, "student"),
          instituteService.getTeacherCount(instituteId),
          instituteService.getCourses(instituteId),
        ]);
        const ctx: InstituteContext = {
          institute_name: institute?.name,
          student_count:  students.length,
          teacher_count:  teacherCount,
          course_count:   courses.length,
        };
        setContext(ctx);
        setContextLoaded(true);
        // Personalise greeting
        setMessages([{
          role: "assistant",
          type: "text",
          content:
            `Hi! I'm your SmartEdX AI assistant${ctx.institute_name ? ` for **${ctx.institute_name}**` : ""}.\n\n` +
            `I have live access to your institute data and can:\n` +
            `• 📊 Fetch real-time analytics\n` +
            `• ➕ Create courses directly\n` +
            `• 📢 Draft announcements\n` +
            `• 📋 Generate reports & outlines\n\n` +
            `How can I help you today?`,
        }]);
      } catch {
        setContextLoaded(true);
        setMessages([{
          role: "assistant",
          type: "text",
          content: "Hi! I'm your SmartEdX AI assistant. How can I help you today?",
        }]);
      }
    }
    load();
  }, [instituteId, contextLoaded]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Auto-resize textarea ──────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  // ── Escape to close ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: "user", type: "text", content: trimmed };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const token = authService.getToken();

      // Only pass text messages to the API (strip UI-only type/data fields)
      const apiMessages = updated.map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`${apiUrl}/api/ai/chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages:    apiMessages,
          institute_id: instituteId,
          context,
          auth_token:  token ?? undefined,
        }),
      });

      if (!res.ok) throw new Error(res.statusText);
      const data: { reply: string; actions: Array<{ type: string; data: Record<string, unknown> }> } = await res.json();

      // Build new messages from response
      const newMsgs: ChatMessage[] = [
        { role: "assistant", type: "text", content: data.reply },
      ];

      // Handle side-effect actions
      for (const action of data.actions ?? []) {
        if (action.type === "course_created") {
          newMsgs.push({
            role: "assistant",
            type: "course_created",
            content: "",
            data: action.data,
          });
          // Update context pill immediately
          setContext((prev) => ({ ...prev, course_count: (prev.course_count ?? 0) + 1 }));
        }
      }

      setMessages((prev) => [...prev, ...newMsgs]);
      if (!open) setHasNew(true);

    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", type: "text", content: "Sorry, I ran into an error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, apiUrl, instituteId, context, open]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-999998 bg-black/40 dark:bg-black/60 backdrop-blur-[3px]
          transition-opacity duration-300
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setOpen(false)}
      />

      {/* ── Centered modal ───────────────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-999999 flex items-center justify-center p-4 pointer-events-none`}
      >
      <div
        className={`relative w-full max-w-4xl h-[85vh] max-h-[780px] flex flex-col overflow-hidden
          bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl
          pointer-events-auto
          transition-all duration-300 ease-out
          ${open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-br from-brand-400 to-brand-600 shadow-sm shadow-brand-500/30">
            <SparkleIcon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">AI Institute Assistant</h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
              {context.institute_name || "SmartEdX"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-success-600 dark:text-success-500">
              <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
              Live
            </span>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Analytics pills */}
        {contextLoaded && context.student_count !== undefined && (
          <div className="flex gap-2 px-6 py-3 border-b border-gray-100 dark:border-gray-800 overflow-x-auto no-scrollbar shrink-0 bg-gray-50/60 dark:bg-gray-800/30">
            <StatPill icon="👥" label="Students" value={context.student_count ?? 0} color="blue" />
            <StatPill icon="🎓" label="Teachers" value={context.teacher_count ?? 0} color="purple" />
            <StatPill icon="📚" label="Courses"  value={context.course_count ?? 0}  color="green" />
            <button
              onClick={() => sendMessage("Show me live analytics for my institute")}
              disabled={loading}
              title="Refresh analytics"
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-gray-300 dark:border-gray-600 text-[11px] text-gray-400 hover:text-brand-500 hover:border-brand-400 transition-colors disabled:opacity-40"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Live
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar">
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}

          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Suggested prompts — only on greeting */}
        {messages.length <= 1 && !loading && (
          <div className="px-6 pb-3 flex flex-wrap gap-2 shrink-0">
            {SUGGESTED.map((p) => (
              <button
                key={p.text}
                onClick={() => sendMessage(p.text)}
                className="text-[11px] px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-brand-300 hover:text-brand-600 dark:hover:border-brand-500 dark:hover:text-brand-400 transition-colors whitespace-nowrap"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-6 pb-6 pt-3 shrink-0 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-end gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-2.5 focus-within:border-brand-400 dark:focus-within:border-brand-600 transition-colors">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your institute…"
              disabled={loading}
              className="flex-1 resize-none bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none leading-relaxed disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="shrink-0 w-8 h-8 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 text-white disabled:text-gray-400 flex items-center justify-center transition-all hover:scale-105 disabled:scale-100"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-gray-400 dark:text-gray-600">
            Enter to send · Shift+Enter for new line · Esc to close
          </p>
        </div>
      </div>
      </div>

      {/* ── Floating button ─────────────────────────────────────────────────── */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setHasNew(false); }}
          className="fixed bottom-6 right-6 z-99997 group"
          aria-label="Open AI assistant"
        >
          <span className="absolute inset-0 rounded-full bg-brand-500/25 animate-ping" />
          <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-linear-to-br from-brand-400 to-brand-600 shadow-xl shadow-brand-500/35 transition-all duration-200 hover:scale-110 group-hover:shadow-brand-500/50">
            <SparkleIcon className="w-6 h-6 text-white" />
          </span>
          {hasNew && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 border-2 border-white dark:border-gray-950 animate-bounce" />
          )}
          <span className="absolute bottom-full right-0 mb-2.5 px-2.5 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
            AI Assistant
            <span className="absolute top-full right-4 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
          </span>
        </button>
      )}
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  // Course-created action card
  if (msg.type === "course_created" && msg.data) {
    return (
      <div className="flex justify-center">
        <div className="w-full max-w-[90%] rounded-2xl border border-success-200 dark:border-success-500/20 bg-success-50 dark:bg-success-500/10 p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-success-500 flex items-center justify-center text-white text-xs font-bold shrink-0">✓</span>
            <span className="text-sm font-semibold text-success-700 dark:text-success-400">Course Created</span>
          </div>
          <div className="space-y-1 text-xs text-success-700 dark:text-success-300">
            {!!msg.data.name && (
              <p><span className="font-medium">Name:</span> {String(msg.data.name)}</p>
            )}
            {!!msg.data.code && (
              <p><span className="font-medium">Code:</span> {String(msg.data.code)}</p>
            )}
            {!!msg.data.batchNumber && (
              <p><span className="font-medium">Batch:</span> {String(msg.data.batchNumber)}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Normal text bubble
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
          isUser
            ? "bg-brand-500 text-white"
            : "bg-linear-to-br from-brand-400 to-brand-600 text-white"
        }`}
      >
        {isUser ? "You" : "AI"}
      </div>
      <div
        className={`max-w-[82%] text-sm leading-relaxed px-3.5 py-2.5 rounded-2xl whitespace-pre-wrap wrap-break-word ${
          isUser
            ? "bg-brand-500 text-white rounded-tr-sm"
            : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm"
        }`}
      >
        {msg.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div className="w-7 h-7 rounded-full bg-linear-to-br from-brand-400 to-brand-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
        AI
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: "blue" | "purple" | "green";
}) {
  const colors = {
    blue:   "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    purple: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
    green:  "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 ${colors[color]}`}>
      <span>{icon}</span>
      <span className="font-bold">{value}</span>
      <span className="opacity-70">{label}</span>
    </span>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
    </svg>
  );
}
