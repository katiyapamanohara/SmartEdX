"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { authService } from "@/services/authService";
import { instituteService } from "@/services/instituteService";
import { useInstituteFeatures } from "@/hooks/useInstituteFeatures";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = "user" | "assistant";

interface ChatMessage {
  role: MessageRole;
  content: string;
}

interface ActionBadge {
  type: "course_created" | "lecturer_invited";
  data: Record<string, unknown>;
}

interface InstituteContext {
  institute_name?: string;
  student_count?: number;
  teacher_count?: number;
  course_count?: number;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InstituteAiChatPage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const { isLoading: featuresLoading, hasFeature } = useInstituteFeatures({
    requiredFeature: "ai_tutor",
    redirectTo: `/${instituteId}/institute`,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: "assistant",
    content:
      "Hello! 👋 I'm your **Institute AI Assistant**.\n\n" +
      "I can help you with:\n" +
      "- 📊 **Analytics** — students, teachers, course stats\n" +
      "- 🎓 **Teacher performance** — who teaches what and how many students\n" +
      "- 📚 **Course enrollment** — enrollment numbers per course\n" +
      "- ➕ **Create courses** — add new courses to the institute\n" +
      "- 📧 **Invite lecturers** — add a new lecturer by email\n\n" +
      "What would you like to know?",
  }]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [actions, setActions]   = useState<ActionBadge[]>([]);
  const [context, setContext]   = useState<InstituteContext>({});
  const [userPicture, setUserPicture] = useState<string | null>(null);
  const [instituteLogo, setInstituteLogo] = useState<string | null>(null);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // ── Load institute context ────────────────────────────────────────────────
  useEffect(() => {
    if (!instituteId) return;
    async function load() {
      try {
        const [user, institute, students, teachers, courses] = await Promise.all([
          Promise.resolve(authService.getUser()),
          instituteService.getInstituteById(instituteId),
          fetch(`${apiUrl}/api/institutes/institutes/${instituteId}/users?role=student`, {
            headers: { Authorization: `Bearer ${authService.getToken()}` },
          }).then(r => r.ok ? r.json() : []),
          fetch(`${apiUrl}/api/institutes/institutes/${instituteId}/users?role=teacher`, {
            headers: { Authorization: `Bearer ${authService.getToken()}` },
          }).then(r => r.ok ? r.json() : []),
          fetch(`${apiUrl}/api/institutes/institutes/${instituteId}/courses`, {
            headers: { Authorization: `Bearer ${authService.getToken()}` },
          }).then(r => r.ok ? r.json() : []),
        ]);
        setUserPicture(user?.profilePicture ?? null);
        setInstituteLogo(institute?.logo ?? null);
        setContext({
          institute_name: institute?.name,
          student_count:  Array.isArray(students) ? students.length : 0,
          teacher_count:  Array.isArray(teachers) ? teachers.length : 0,
          course_count:   Array.isArray(courses)  ? courses.length  : 0,
        });
      } catch {
        // context stays empty — agent fetches live data via tools anyway
      }
    }
    load();
  }, [instituteId, apiUrl]);

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

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const token = authService.getToken();
      const res = await fetch(`${apiUrl}/api/ai/chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages:     updated.map(m => ({ role: m.role, content: m.content })),
          institute_id: instituteId,
          context,
          auth_token:   token,
        }),
      });

      if (!res.ok) throw new Error(res.statusText);
      const data: { reply: string; actions?: ActionBadge[] } = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      if (data.actions?.length) {
        setActions(prev => [...prev, ...data.actions!]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, apiUrl, instituteId, context]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  // ── Feature gate loading ──────────────────────────────────────────────────
  if (featuresLoading || !hasFeature("ai_tutor")) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Chat screen ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[900px] rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 shrink-0 rounded-t-2xl
        bg-linear-to-r from-violet-50 to-indigo-50 dark:from-violet-500/5 dark:to-indigo-500/5">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-violet-500 to-indigo-500 shadow-md shadow-violet-500/25 shrink-0">
          {instituteLogo ? (
            <img src={instituteLogo} alt="Institute" className="w-full h-full rounded-xl object-cover" />
          ) : (
            <BotIcon className="w-5 h-5 text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">
            {context.institute_name ?? "Institute"} AI Assistant
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Analytics · Teacher Performance · Enrollment · Course Management
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {context.student_count !== undefined && (
            <StatPill label="Students" value={context.student_count} color="blue" />
          )}
          {context.teacher_count !== undefined && (
            <StatPill label="Teachers" value={context.teacher_count} color="violet" />
          )}
          {context.course_count !== undefined && (
            <StatPill label="Courses" value={context.course_count} color="indigo" />
          )}
        </div>
      </div>

      {/* Action badges */}
      {actions.length > 0 && (
        <div className="px-6 pt-3 flex flex-wrap gap-2 shrink-0">
          {actions.map((a, i) => (
            <ActionBadgeItem key={i} action={a} onDismiss={() => setActions(p => p.filter((_, j) => j !== i))} />
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} userPicture={userPicture} />
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="px-6 pb-2 shrink-0 flex gap-2 flex-wrap">
        {QUICK_PROMPTS.map(p => (
          <button
            key={p}
            onClick={() => sendMessage(p)}
            disabled={loading}
            className="text-[11px] px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-300 transition-colors disabled:opacity-40"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-6 pb-6 pt-1 shrink-0">
        <div className="flex items-center gap-2 rounded-full bg-white dark:bg-gray-800 shadow-md px-4 py-3">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about teachers, courses, enrollment, or invite a lecturer..."
            disabled={loading}
            className="flex-1 resize-none bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none leading-relaxed disabled:opacity-50 max-h-[120px]"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="shrink-0 w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition-all hover:scale-105 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-gray-400 dark:text-gray-600">
          AI can make mistakes. Verify important information before acting.
        </p>
      </div>
    </div>
  );
}

// ─── Quick prompts ────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  "Show institute analytics",
  "Teacher performance report",
  "Course enrollment details",
  "How many students do we have?",
  "Invite a new lecturer",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue:   "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300",
    violet: "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300",
    indigo: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  };
  return (
    <div className={`hidden sm:flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full ${colors[color] ?? colors.blue}`}>
      <span className="font-bold">{value}</span>
      <span className="opacity-75">{label}</span>
    </div>
  );
}

function ActionBadgeItem({ action, onDismiss }: { action: ActionBadge; onDismiss: () => void }) {
  const isInvite = action.type === "lecturer_invited";
  const d = action.data as any;
  const label = isInvite
    ? `✅ Lecturer invited: ${d.firstName ?? ""} ${d.lastName ?? ""} (${d.email ?? ""})`
    : `✅ Course created: ${d.name ?? ""} [${d.code ?? ""}]`;

  return (
    <div className="flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-500/20">
      <span>{label}</span>
      <button onClick={onDismiss} className="ml-1 opacity-60 hover:opacity-100">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function MessageBubble({ msg, userPicture }: { msg: ChatMessage; userPicture?: string | null }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold bg-linear-to-br from-violet-500 to-indigo-500 text-white">
        {isUser ? (
          userPicture ? (
            <img src={userPicture} alt="You" className="w-full h-full object-cover" />
          ) : (
            "You"
          )
        ) : (
          <BotIconSm />
        )}
      </div>
      <div
        className={`max-w-[82%] text-sm leading-relaxed px-3.5 py-2.5 rounded-2xl wrap-break-word ${
          isUser
            ? "bg-linear-to-br from-violet-500 to-indigo-500 text-white rounded-tr-sm whitespace-pre-wrap"
            : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm"
        }`}
      >
        {isUser ? (
          msg.content
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p:          ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul:         ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
              ol:         ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
              li:         ({ children }) => <li className="ml-2">{children}</li>,
              strong:     ({ children }) => <strong className="font-semibold">{children}</strong>,
              em:         ({ children }) => <em className="italic">{children}</em>,
              h1:         ({ children }) => <h1 className="text-base font-bold mb-1.5 mt-2 first:mt-0">{children}</h1>,
              h2:         ({ children }) => <h2 className="text-sm font-bold mb-1.5 mt-2 first:mt-0">{children}</h2>,
              h3:         ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
              code: ({ children, className }) =>
                className ? (
                  <code className="block bg-gray-200 dark:bg-gray-700 rounded-lg px-3 py-2 my-1.5 text-xs font-mono overflow-x-auto whitespace-pre">{children}</code>
                ) : (
                  <code className="bg-gray-200 dark:bg-gray-700 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
                ),
              pre:        ({ children }) => <pre className="my-1.5 overflow-x-auto">{children}</pre>,
              blockquote: ({ children }) => <blockquote className="border-l-2 border-violet-400 pl-3 italic opacity-80 my-1.5">{children}</blockquote>,
              hr:         () => <hr className="border-gray-300 dark:border-gray-600 my-2" />,
              a:          ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline opacity-80 hover:opacity-100">{children}</a>,
            }}
          >
            {msg.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div className="w-7 h-7 rounded-full bg-linear-to-br from-violet-500 to-indigo-500 flex items-center justify-center shrink-0">
        <BotIconSm />
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
  );
}

function BotIconSm() {
  return (
    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
  );
}
