"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { FiBookOpen } from "react-icons/fi";
import { authService } from "@/services/authService";
import { instituteService, Course } from "@/services/instituteService";
import VoiceModal from "./VoiceModal";
import { useFeatures } from "@/context/InstituteFeatureContext";
import { useInstituteFeatures } from "@/hooks/useInstituteFeatures";

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



// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AiChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const instituteId = params?.instituteId as string;

  const { isLoading: featuresLoading, hasFeature: hasInstFeature } = useInstituteFeatures({
    requiredFeature: "ai_tutor",
    redirectTo: `/${instituteId}/student`,
  });

  const [courses, setCourses]               = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [context, setContext]               = useState<StudentContext>({});
  const [instituteLogo, setInstituteLogo]   = useState<string | null>(null);
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null);
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [pendingFile, setPendingFile]     = useState<File | null>(null);

  const { hasFeature } = useFeatures();
  const voiceEnabled = hasFeature("voice_agent");
  const [voiceMode, setVoiceMode] = useState(false);

  const [isDark, setIsDark] = useState(false);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

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
        setInstituteLogo(institute?.logo ?? null);
        setUserProfilePicture(user?.profilePicture ?? null);
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

  // ── Auto-select course from query params (fast-forward, no wait) ──────────
  useEffect(() => {
    const courseId   = searchParams?.get("courseId");
    const courseName = searchParams?.get("courseName");
    if (!courseId || !courseName || selectedCourse) return;
    const courseCode = searchParams?.get("courseCode") ?? "";
    handleSelectCourse({ id: courseId, name: courseName, code: courseCode } as any);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Init chat after course is chosen ─────────────────────────────────────
  async function handleSelectCourse(course: Course) {
    setSelectedCourse(course);
    const ctx = { ...context, selected_course: course.name, course_id: course.id };
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

  // ── Voice mode ────────────────────────────────────────────────────────────
  function openVoiceMode()  { setVoiceMode(true);  }
  function closeVoiceMode() { setVoiceMode(false); }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPendingFile(file);
    e.target.value = "";
  }

  if (featuresLoading || !hasInstFeature("ai_tutor")) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Course selection screen ───────────────────────────────────────────────
  if (!selectedCourse) {
    return (
      <div className="flex flex-col items-center justify-start h-[calc(100vh-8rem)] max-h-[900px] rounded-2xl  dark:bg-gray-900 overflow-hidden">
        {/* Header */}
        

        {/* Course picker body */}
        <div className="w-full flex-1 flex items-start justify-center pt-16 px-6 pb-8">
          <div className="max-w-xl w-full">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center mb-4">
                {(() => {
                  const previews = courses.filter(c => c.coverImage).slice(0, 3);
                  if (coursesLoading || previews.length === 0) {
                    return (
                      <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
                        <FiBookOpen className="w-7 h-7 text-brand-500" />
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center">
                      {previews.map((c, i) => (
                        <img
                          key={c.id}
                          src={c.coverImage!}
                          alt={c.name}
                          className="w-12 h-12 rounded-xl object-cover border-2 border-white dark:border-gray-900 shadow-sm"
                          style={{ marginLeft: i === 0 ? 0 : "-10px", zIndex: previews.length - i }}
                        />
                      ))}
                    </div>
                  );
                })()}
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
    <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[900px] rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 shrink-0 rounded-2xl
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
        {selectedCourse.coverImage ? (
          <img
            src={selectedCourse.coverImage}
            alt={selectedCourse.name}
            className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-md"
          />
        ) : (
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-brand-400 to-indigo-500 shadow-md shadow-brand-500/25 shrink-0">
            <BotIcon className="w-5 h-5 text-white" />
          </div>
        )}
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
          <MessageBubble key={i} msg={msg} userProfilePicture={userProfilePicture} />
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>


      {/* File pending badge */}
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

      {/* Input area */}
      <div className="px-6 pb-6 pt-1 shrink-0">
        <div className="flex items-center gap-2 rounded-full bg-white dark:bg-gray-800 shadow-md px-4 py-3">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.csv,.md,.png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Attachment button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            title="Attach file"
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
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
            placeholder={pendingFile ? `Ask about ${pendingFile.name}…` : "Ask anything..."}
            disabled={loading}
            className="flex-1 resize-none bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none leading-relaxed disabled:opacity-50 max-h-[120px]"
          />

          {/* Send / mic button */}
          <button
            onClick={() => input.trim() || pendingFile ? sendMessage(input, pendingFile) : (voiceEnabled ? openVoiceMode() : undefined)}
            disabled={loading || (!input.trim() && !pendingFile && !voiceEnabled)}
            title={!input.trim() && !pendingFile && !voiceEnabled ? "Voice Agent not enabled for this institute" : undefined}
            className="shrink-0 w-9 h-9 rounded-full bg-gray-700 dark:bg-gray-600 hover:bg-gray-800 dark:hover:bg-gray-500 text-white flex items-center justify-center transition-all hover:scale-105 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {input.trim() || pendingFile ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ opacity: voiceEnabled ? 1 : 0.4 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-gray-400 dark:text-gray-600">
          This AI can make mistakes. Please verify important info.
        </p>
      </div>

      {/* ── Full-screen voice overlay ─────────────────────────────────────── */}
      {voiceMode && voiceEnabled && (
        <VoiceModal
          isDark={isDark}
          instituteLogo={instituteLogo}
          context={context}
          selectedCourse={selectedCourse}
          instituteId={instituteId}
          onClose={closeVoiceMode}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MessageBubble({ msg, userProfilePicture }: { msg: ChatMessage; userProfilePicture?: string | null }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold bg-linear-to-br from-brand-400 to-indigo-500 text-white">
        {isUser ? (
          userProfilePicture ? (
            <img src={userProfilePicture} alt="You" className="w-full h-full object-cover" />
          ) : (
            "You"
          )
        ) : (
          <BotIconSm />
        )}
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
