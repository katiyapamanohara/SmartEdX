"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { FiBookOpen } from "react-icons/fi";
import { authService } from "@/services/authService";
import { instituteService, Course } from "@/services/instituteService";

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
  selected_course?: string;
}

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTED = [
  { label: "📚 Course modules",  text: "What modules are in this course?" },
  { label: "🧠 Explain concept", text: "Explain the key concepts in this course" },
  { label: "📝 Study plan",      text: "Create a 2-week study plan for this course" },
  { label: "📋 Practice quiz",   text: "Give me 5 practice questions from this course" },
  { label: "🔍 Find a topic",    text: "I want to learn about a specific topic" },
  { label: "❓ Ask a doubt",     text: "I have a doubt about something in this course" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AiChatPage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  // course selection state
  const [courses, setCourses]           = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // chat state
  const [context, setContext]             = useState<StudentContext>({});
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [pendingFile, setPendingFile]     = useState<File | null>(null);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // ── Load enrolled courses ─────────────────────────────────────────────────
  useEffect(() => {
    if (!instituteId) return;
    async function load() {
      setCoursesLoading(true);
      try {
        const [user, institute, enrolled] = await Promise.all([
          Promise.resolve(authService.getUser()),
          instituteService.getInstituteById(instituteId),
          instituteService.getMyEnrolledCourses(instituteId),
        ]);
        setCourses(enrolled);
        setContext({
          student_name:  user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : undefined,
          institute_name: institute?.name,
          course_count:  enrolled.length,
        });
      } catch {
        setCourses([]);
      } finally {
        setCoursesLoading(false);
      }
    }
    load();
  }, [instituteId]);

  // ── Init chat after course is chosen ─────────────────────────────────────
  function handleSelectCourse(course: Course) {
    setSelectedCourse(course);
    const ctx = { ...context, selected_course: course.name };
    setContext(ctx);
    setMessages([{
      role: "assistant",
      content:
        `Hi${ctx.student_name ? ` ${ctx.student_name}` : ""}! 👋 I'm your AI tutor for **${course.name}**.\n\n` +
        `I can help you with:\n` +
        `• 📚 Explore modules & topics in this course\n` +
        `• 🧠 Explain any concept — simply & clearly\n` +
        `• 📝 Create a personalized study plan\n` +
        `• 📋 Generate practice questions & quizzes\n` +
        `• 📄 Analyze your notes or uploaded documents\n` +
        `• ❓ Resolve any doubts — anytime!\n\n` +
        `What would you like to learn today?`,
    }]);
  }

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

      const formData = new FormData();
      formData.append("messages",     JSON.stringify(updated.map((m) => ({ role: m.role, content: m.content }))));
      formData.append("institute_id", instituteId);
      formData.append("student_id",   user?.id ?? "");
      formData.append("context",      JSON.stringify(context));
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
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again!" },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, apiUrl, instituteId, context]);

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

  // ── Course selection screen ───────────────────────────────────────────────
  if (!selectedCourse) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[900px] rounded-2xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 shrink-0
          bg-linear-to-r from-brand-50 to-indigo-50 dark:from-brand-500/5 dark:to-indigo-500/5">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-brand-400 to-indigo-500 shadow-md shadow-brand-500/25">
            <BotIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">AI Learning Companion</h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {context.institute_name || "SmartEdX"}
            </p>
          </div>
        </div>

        {/* Course picker body */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-500/10 mb-4">
                <FiBookOpen className="w-7 h-7 text-brand-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">
                Select a Course to Start
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose which course you'd like help with today.
              </p>
            </div>

            {coursesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                ))}
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400 dark:text-gray-500">
                You are not enrolled in any courses yet.
              </div>
            ) : (
              <div className="space-y-3">
                {courses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => handleSelectCourse(course)}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl bg-white dark:bg-gray-800/50 hover:bg-brand-50/50 dark:hover:bg-brand-500/5 transition-all text-left group"
                  >
                    {course.coverImage ? (
                      <img
                        src={course.coverImage}
                        alt={course.name}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-linear-to-br from-violet-500 to-blue-400 shrink-0 flex items-center justify-center">
                        <FiBookOpen className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {course.name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {course.code}
                        {course.batchNumber ? ` · Batch ${course.batchNumber}` : ""}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-brand-400 transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Chat screen ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[900px] rounded-2xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 shrink-0
        bg-linear-to-r from-brand-50 to-indigo-50 dark:from-brand-500/5 dark:to-indigo-500/5">
        <button
          onClick={() => { setSelectedCourse(null); setMessages([]); }}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white/60 dark:hover:bg-gray-800 transition-colors shrink-0"
          title="Change course"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-brand-400 to-indigo-500 shadow-md shadow-brand-500/25 shrink-0">
          <BotIcon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">
            {selectedCourse.name}
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            AI Learning Companion · {context.institute_name || "SmartEdX"}
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-success-600 dark:text-success-500 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
          Ready to help
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts (only on greeting) */}
      {messages.length <= 1 && !loading && (
        <div className="px-6 pb-3 flex flex-wrap gap-2 shrink-0">
          {SUGGESTED.map((p) => (
            <button
              key={p.text}
              onClick={() => sendMessage(p.text)}
              className="text-[11px] px-3 py-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors whitespace-nowrap"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* File pending badge */}
      {pendingFile && (
        <div className="mx-6 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-50 dark:bg-brand-500/10">
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

      {/* Input area */}
      <div className="px-6 pb-6 pt-3 shrink-0">
        <div className="flex items-end gap-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 px-3 py-2.5 transition-colors">
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
                : `Ask anything about ${selectedCourse.name}…`
            }
            disabled={loading}
            className="flex-1 resize-none bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none leading-relaxed disabled:opacity-50"
          />

          <button
            onClick={() => sendMessage(input, pendingFile)}
            disabled={(!input.trim() && !pendingFile) || loading}
            className="shrink-0 w-8 h-8 rounded-lg bg-linear-to-br from-brand-400 to-indigo-500 hover:from-brand-500 hover:to-indigo-600 disabled:from-gray-200 disabled:to-gray-200 dark:disabled:from-gray-700 dark:disabled:to-gray-700 text-white disabled:text-gray-400 flex items-center justify-center transition-all hover:scale-105 disabled:scale-100 shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-gray-400 dark:text-gray-600">
          Enter to send · Shift+Enter for new line · Upload notes with the clip icon
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold bg-linear-to-br from-brand-400 to-indigo-500 text-white">
        {isUser ? "You" : <BotIconSm />}
      </div>
      <div
        className={`max-w-[82%] text-sm leading-relaxed px-3.5 py-2.5 rounded-2xl whitespace-pre-wrap wrap-break-word ${
          isUser
            ? "bg-linear-to-br from-brand-500 to-indigo-500 text-white rounded-tr-sm"
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
      <div className="w-7 h-7 rounded-full bg-linear-to-br from-brand-400 to-indigo-500 flex items-center justify-center shrink-0">
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
