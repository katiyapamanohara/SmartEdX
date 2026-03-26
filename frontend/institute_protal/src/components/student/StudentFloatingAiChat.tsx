"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { authService } from "@/services/authService";
import { instituteService } from "@/services/instituteService";

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = "user" | "assistant";

interface ChatMessage {
  role: MessageRole;
  content: string;
  fileName?: string;
}

interface StudentContext {
  student_name?: string;
  institute_name?: string;
  course_count?: number;
}

interface StudentFloatingAiChatProps {
  instituteId: string;
}

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTED = [
  { label: "📚 My courses",      text: "What courses am I enrolled in?" },
  { label: "🔍 Find a topic",    text: "I want to learn about machine learning" },
  { label: "🧠 Explain concept", text: "Explain recursion with a simple example" },
  { label: "📝 Study plan",      text: "Create a 2-week study plan for my exams" },
  { label: "📋 Practice quiz",   text: "Give me 5 practice questions on data structures" },
  { label: "🎓 My teachers",     text: "Who are my teachers and what do they teach?" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudentFloatingAiChat({ instituteId }: StudentFloatingAiChatProps) {
  const [open, setOpen]                   = useState(false);
  const [hasNew, setHasNew]               = useState(false);
  const [context, setContext]             = useState<StudentContext>({});
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [contextLoaded, setContextLoaded] = useState(false);
  const [pendingFile, setPendingFile]     = useState<File | null>(null);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // ── Load student context once ─────────────────────────────────────────────
  useEffect(() => {
    if (!instituteId || contextLoaded) return;
    async function load() {
      try {
        const user = authService.getUser();
        const [institute, courses] = await Promise.all([
          instituteService.getInstituteById(instituteId),
          instituteService.getCourses(instituteId),
        ]);
        const ctx: StudentContext = {
          student_name: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : undefined,
          institute_name: institute?.name,
          course_count: courses.length,
        };
        setContext(ctx);
        setContextLoaded(true);
        setMessages([{
          role: "assistant",
          content:
            `Hi${ctx.student_name ? ` ${ctx.student_name}` : ""}! 👋 I'm your SmartEdX AI Learning Companion.\n\n` +
            `I'm here to help you:\n` +
            `• 📚 Explore your courses & modules\n` +
            `• 🧠 Explain any concept — simply & clearly\n` +
            `• 📝 Create personalized study plans\n` +
            `• 📋 Generate practice questions & quizzes\n` +
            `• 📄 Analyze your notes or uploaded documents\n` +
            `• ❓ Resolve any doubts — anytime!\n\n` +
            `What would you like to learn today?`,
        }]);
      } catch {
        setContextLoaded(true);
        setMessages([{
          role: "assistant",
          content: "Hi! 👋 I'm your SmartEdX AI Learning Companion. Ask me anything — I'm here to help you learn!",
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
  const sendMessage = useCallback(async (text: string, file?: File | null) => {
    const trimmed = text.trim();
    if ((!trimmed && !file) || loading) return;

    const messageText = trimmed || (file ? `Please analyze this file: ${file.name}` : "");
    const userMsg: ChatMessage = { role: "user", content: messageText, fileName: file?.name };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setPendingFile(null);
    setLoading(true);

    try {
      const token = authService.getToken();
      const user  = authService.getUser();

      const apiMessages = updated.map((m) => ({ role: m.role, content: m.content }));

      const formData = new FormData();
      formData.append("messages",     JSON.stringify(apiMessages));
      formData.append("institute_id", instituteId);
      formData.append("student_id",   user?.id ?? "");
      formData.append("context",      JSON.stringify({
        student_name:  context.student_name,
        institute_name: context.institute_name,
        course_count:  context.course_count,
      }));
      if (token) formData.append("auth_token", token);
      if (file)  formData.append("file", file);

      const res = await fetch(`${apiUrl}/api/ai/student-chat/message`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) throw new Error(res.statusText);
      const data: { reply: string } = await res.json();

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (!open) setHasNew(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again!" },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, apiUrl, instituteId, context, open]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input, pendingFile);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPendingFile(file);
    e.target.value = "";
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

      {/* ── Centered modal ─────────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`relative w-full max-w-4xl h-[88vh] max-h-[800px] flex flex-col overflow-hidden
            bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl
            pointer-events-auto transition-all duration-300 ease-out
            ${open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
        >
          {/* ── Header ── */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0
            bg-gradient-to-r from-brand-50 to-indigo-50 dark:from-brand-500/5 dark:to-indigo-500/5">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-indigo-500 shadow-md shadow-brand-500/25">
              <BotIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">AI Learning Companion</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {context.student_name
                  ? `${context.student_name} · ${context.institute_name || "SmartEdX"}`
                  : context.institute_name || "SmartEdX"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-success-600 dark:text-success-500">
                <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
                Ready to help
              </span>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white/60 dark:hover:bg-gray-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Context pills ── */}
          {contextLoaded && context.course_count !== undefined && (
            <div className="flex gap-2 px-6 py-2.5 border-b border-gray-100 dark:border-gray-800 overflow-x-auto no-scrollbar shrink-0 bg-gray-50/60 dark:bg-gray-800/30">
              <StatPill icon="📚" label="Courses" value={context.course_count ?? 0} />
              <button
                onClick={() => sendMessage("What courses am I enrolled in?")}
                disabled={loading}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-gray-300 dark:border-gray-600 text-[11px] text-gray-400 hover:text-brand-500 hover:border-brand-400 transition-colors disabled:opacity-40"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
                View courses
              </button>
            </div>
          )}

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* ── Suggested prompts (only on greeting) ── */}
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

          {/* ── File pending badge ── */}
          {pendingFile && (
            <div className="mx-6 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/20">
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

          {/* ── Input area ── */}
          <div className="px-6 pb-6 pt-3 shrink-0 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-end gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-2.5 focus-within:border-brand-400 dark:focus-within:border-brand-600 transition-colors">
              {/* File upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.csv,.md"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                title="Upload notes or document (PDF, DOCX, TXT)"
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                </svg>
              </button>

              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  pendingFile
                    ? `Ask a question about ${pendingFile.name}…`
                    : "Ask anything — concepts, courses, study help, quizzes…"
                }
                disabled={loading}
                className="flex-1 resize-none bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none leading-relaxed disabled:opacity-50"
              />

              <button
                onClick={() => sendMessage(input, pendingFile)}
                disabled={(!input.trim() && !pendingFile) || loading}
                className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-indigo-500 hover:from-brand-500 hover:to-indigo-600 disabled:from-gray-200 disabled:to-gray-200 dark:disabled:from-gray-700 dark:disabled:to-gray-700 text-white disabled:text-gray-400 flex items-center justify-center transition-all hover:scale-105 disabled:scale-100 shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-gray-400 dark:text-gray-600">
              Enter to send · Shift+Enter for new line · Esc to close · Upload notes with the clip icon
            </p>
          </div>
        </div>
      </div>

      {/* ── Floating button ──────────────────────────────────────────────────── */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setHasNew(false); }}
          className="fixed bottom-6 right-6 z-99997 group"
          aria-label="Open AI learning companion"
        >
          <span className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping" />
          <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-brand-400 to-indigo-500 shadow-xl shadow-brand-500/30 transition-all duration-200 hover:scale-110 group-hover:shadow-brand-500/45">
            <BotIcon className="w-6 h-6 text-white" />
          </span>
          {hasNew && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 border-2 border-white dark:border-gray-950 animate-bounce" />
          )}
          <span className="absolute bottom-full right-0 mb-2.5 px-2.5 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
            AI Learning Companion
            <span className="absolute top-full right-4 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
          </span>
        </button>
      )}
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
          isUser
            ? "bg-gradient-to-br from-brand-400 to-indigo-500 text-white"
            : "bg-gradient-to-br from-brand-400 to-indigo-500 text-white"
        }`}
      >
        {isUser ? "You" : <BotIconSm />}
      </div>
      <div
        className={`max-w-[82%] text-sm leading-relaxed px-3.5 py-2.5 rounded-2xl whitespace-pre-wrap wrap-break-word ${
          isUser
            ? "bg-gradient-to-br from-brand-500 to-indigo-500 text-white rounded-tr-sm"
            : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm"
        }`}
      >
        {msg.fileName && (
          <span className="flex items-center gap-1 text-[10px] opacity-70 mb-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
            </svg>
            {msg.fileName}
          </span>
        )}
        {msg.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-indigo-500 flex items-center justify-center shrink-0">
        <BotIconSm />
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function StatPill({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
      <span>{icon}</span>
      <span className="font-bold">{value}</span>
      <span className="opacity-70">{label}</span>
    </span>
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
