"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { FiBookOpen, FiPlus, FiTrash2, FiMessageSquare, FiEdit2 } from "react-icons/fi";
import { authService } from "@/services/authService";
import { instituteService, Course } from "@/services/instituteService";
import { useFeatures } from "@/context/InstituteFeatureContext";
import { useVoiceAgent } from "@/context/VoiceAgentContext";
import { useInstituteFeatures } from "@/hooks/useInstituteFeatures";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = "user" | "assistant";

interface ChatMessage {
  role: MessageRole;
  content: string;
  fileName?: string;
  timestamp?: number;
}

interface StudentContext {
  student_name?: string;
  institute_name?: string;
  course_count?: number;
  selected_course?: string;
  course_id?: string;
}

interface ChatSession {
  chat_id: string;
  course_id: string;
  role: string;
  title: string;
  created_at: number;
  updated_at: number;
  message_count: number;
  msg_collection: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

async function apiPost(path: string, body: unknown) {
  const token = authService.getToken();
  const res = await fetch(`${apiUrl}/api/ai/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.status === 204 ? null : res.json();
}

async function apiGet(path: string, params: Record<string, string>) {
  const token = authService.getToken();
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${apiUrl}/api/ai/${path}?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

async function apiDelete(path: string, params: Record<string, string>) {
  const token = authService.getToken();
  const qs = new URLSearchParams(params).toString();
  await fetch(`${apiUrl}/api/ai/${path}?${qs}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
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

  // ── Course & profile state ────────────────────────────────────────────────
  const [courses, setCourses]               = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [context, setContext]               = useState<StudentContext>({});
  const [instituteLogo, setInstituteLogo]   = useState<string | null>(null);
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null);

  // ── Chat session state ────────────────────────────────────────────────────
  const [chatSessions, setChatSessions]     = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId]     = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // ── Message state ─────────────────────────────────────────────────────────
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // ── Sidebar & UI state ────────────────────────────────────────────────────
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [renamingId, setRenamingId]     = useState<string | null>(null);
  const [renameValue, setRenameValue]   = useState("");
  const [isDark, setIsDark]             = useState(false);

  const { hasFeature }  = useFeatures();
  const voiceEnabled    = hasFeature("voice_agent");
  const { startSession, session: voiceSession, sendTextToVoice, setTranscriptHandler } = useVoiceAgent();

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Per-course chatId helpers (keeps which chat was open per course across visits)
  const getSavedChatId = (courseId: string): string | undefined => {
    try { return sessionStorage.getItem(`ai-chat-student-${instituteId}-${courseId}`) ?? undefined; }
    catch { return undefined; }
  };
  const setSavedChatId = (courseId: string, chatId: string) => {
    try { sessionStorage.setItem(`ai-chat-student-${instituteId}-${courseId}`, chatId); }
    catch { /* ignore */ }
  };

  // ── Dark-mode detection & dropdown click-outside handler ────────────────
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // ── Persist the active chatId per course so re-selecting loads it ────────
  useEffect(() => {
    if (!selectedCourse?.id || !activeChatId) return;
    setSavedChatId(selectedCourse.id, activeChatId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId, selectedCourse]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  // ── Load enrolled courses + profile ──────────────────────────────────────
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

  // ── Auto-select course from query params (runs once after courses load) ───
  useEffect(() => {
    if (coursesLoading || selectedCourse) return;
    const courseId   = searchParams?.get("courseId");
    const courseName = searchParams?.get("courseName");
    if (!courseId || !courseName) return;
    const courseCode = searchParams?.get("courseCode") ?? "";
    const course = courses.find((c) => c.id === courseId)
      ?? ({ id: courseId, name: courseName, code: courseCode } as Course);
    handleSelectCourse(course, getSavedChatId(courseId));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coursesLoading]);

  // ── Voice transcript → messages + save to active chat ────────────────────
  useEffect(() => {
    setTranscriptHandler((role, text) => {
      setMessages((prev) => [...prev, { role, content: text, timestamp: Date.now() / 1000 }]);
    });
    return () => setTranscriptHandler(null);
  }, [setTranscriptHandler]);

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

  // ── Save messages to Qdrant chat collection whenever messages change ──────
  useEffect(() => {
    if (!messages.length || !activeChatId || !context.course_id) return;
    const user = authService.getUser();
    if (!user?.id) return;
    apiPost("chat-sessions/messages/save", {
      institute_id: instituteId,
      course_id:    context.course_id,
      user_id:      user.id,
      role:         "student",
      chat_id:      activeChatId,
      messages:     messages.map((m) => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // ── Load chat sessions for a course ──────────────────────────────────────
  async function loadChatSessions(course: Course) {
    const user = authService.getUser();
    if (!user?.id) return [];
    setSessionsLoading(true);
    try {
      const data = await apiGet("chat-sessions/list", {
        institute_id: instituteId,
        user_id:      user.id,
        course_id:    course.id,
        role:         "student",
      });
      const sessions: ChatSession[] = data ?? [];
      setChatSessions(sessions);
      return sessions;
    } catch {
      setChatSessions([]);
      return [];
    } finally {
      setSessionsLoading(false);
    }
  }

  // ── Select course → load sessions, open most recent or create new ─────────
  async function handleSelectCourse(course: Course, preferChatId?: string) {
    const ctx = { ...context, selected_course: course.name, course_id: course.id };
    setContext(ctx);
    setSelectedCourse(course);
    setMessages([]);
    setActiveChatId(null);

    const sessions = await loadChatSessions(course);

    if (sessions.length > 0) {
      const target = preferChatId
        ? (sessions.find((s) => s.chat_id === preferChatId) ?? sessions[0])
        : sessions[0];
      await openChat(target, ctx);
    } else {
      await createNewChat(course, ctx);
    }
  }

  // ── Open an existing chat session ─────────────────────────────────────────
  async function openChat(session: ChatSession, ctx: StudentContext = context) {
    setActiveChatId(session.chat_id);
    setMessages([]);
    const user = authService.getUser();
    if (!user?.id) return;

    try {
      const data = await apiGet("chat-sessions/messages/load", {
        institute_id: instituteId,
        course_id:    session.course_id,
        user_id:      user.id,
        role:         "student",
        chat_id:      session.chat_id,
      });
      const msgs = (data?.messages ?? []) as ChatMessage[];
      if (msgs.length > 0) {
        setMessages(msgs);
        // Retroactively rename chats that still have the default title
        if (session.title === "New Chat") {
          const firstUserMsg = msgs.find((m) => m.role === "user");
          if (firstUserMsg) {
            const title = firstUserMsg.content.slice(0, 40).trim();
            if (title) {
              setChatSessions((prev) => prev.map((s) => s.chat_id === session.chat_id ? { ...s, title } : s));
              apiPost("chat-sessions/rename", {
                institute_id: instituteId, user_id: user.id, course_id: session.course_id,
                role: "student", chat_id: session.chat_id, title,
              }).catch(() => {});
            }
          }
        }
        return;
      }
    } catch { /* fall through */ }

    // Empty chat — show welcome message
    showWelcome(ctx, session.chat_id);
  }

  // ── Create a new chat session ─────────────────────────────────────────────
  async function createNewChat(course: Course | null = selectedCourse, ctx: StudentContext = context) {
    if (!course) return;
    const user = authService.getUser();
    if (!user?.id) return;

    try {
      const meta: ChatSession = await apiPost("chat-sessions/create", {
        institute_id: instituteId,
        course_id:    course.id,
        user_id:      user.id,
        role:         "student",
        title:        "New Chat",
      });
      setChatSessions((prev) => [meta, ...prev]);
      setActiveChatId(meta.chat_id);
      setMessages([]);
      showWelcome(ctx, meta.chat_id);
    } catch {
      // fallback: just clear messages with local id
      const localId = Math.random().toString(36).slice(2, 10);
      setActiveChatId(localId);
      setMessages([]);
      showWelcome(ctx, localId);
    }
  }

  function showWelcome(ctx: StudentContext, _chatId: string) {
    setMessages([{
      role: "assistant",
      timestamp: Date.now() / 1000,
      content:
        `Hi${ctx.student_name ? ` ${ctx.student_name}` : ""}! 👋 I'm your AI tutor for **${ctx.selected_course}**.\n\n` +
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

  // ── Delete a chat session ─────────────────────────────────────────────────
  async function deleteChat(session: ChatSession) {
    const user = authService.getUser();
    if (!user?.id) return;
    try {
      await apiDelete("chat-sessions/delete", {
        institute_id: instituteId,
        user_id:      user.id,
        course_id:    session.course_id,
        role:         "student",
        chat_id:      session.chat_id,
      });
    } catch { /* ignore */ }

    const remaining = chatSessions.filter((s) => s.chat_id !== session.chat_id);
    setChatSessions(remaining);

    if (activeChatId === session.chat_id) {
      if (remaining.length > 0) {
        await openChat(remaining[0]);
      } else {
        await createNewChat();
      }
    }
  }

  // ── Rename a chat ─────────────────────────────────────────────────────────
  async function commitRename(session: ChatSession) {
    const title = renameValue.trim() || "New Chat";
    setRenamingId(null);
    setChatSessions((prev) => prev.map((s) => s.chat_id === session.chat_id ? { ...s, title } : s));
    const user = authService.getUser();
    if (!user?.id) return;
    apiPost("chat-sessions/rename", {
      institute_id: instituteId,
      user_id:      user.id,
      course_id:    session.course_id,
      role:         "student",
      chat_id:      session.chat_id,
      title,
    }).catch(() => {});
  }

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string, file?: File | null) => {
    const trimmed = text.trim();
    if ((!trimmed && !file) || loading) return;

    const messageText = trimmed || (file ? `Please analyze this file: ${file.name}` : "");
    const userMsg: ChatMessage = { role: "user", content: messageText, fileName: file?.name, timestamp: Date.now() / 1000 };
    setInput("");
    setPendingFile(null);

    // Auto-rename the chat on first user message
    const isFirstUserMsg = !messages.some((m) => m.role === "user");
    if (isFirstUserMsg && activeChatId && context.course_id) {
      const title = messageText.slice(0, 40).trim();
      if (title) {
        setChatSessions((prev) => prev.map((s) => s.chat_id === activeChatId ? { ...s, title } : s));
        const u = authService.getUser();
        if (u?.id) apiPost("chat-sessions/rename", {
          institute_id: instituteId, user_id: u.id, course_id: context.course_id,
          role: "student", chat_id: activeChatId, title,
        }).catch(() => {});
      }
    }

    if (voiceSession && !file) {
      setMessages((prev) => [...prev, userMsg]);
      sendTextToVoice(messageText);
      return;
    }

    const updated = [...messages, userMsg];
    setMessages(updated);
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
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply, timestamp: Date.now() / 1000 }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again!", timestamp: Date.now() / 1000 }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, activeChatId, instituteId, context, voiceSession, sendTextToVoice]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input, pendingFile); }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPendingFile(e.target.files?.[0] ?? null);
    e.target.value = "";
  }

  function openVoiceMode() {
    if (!selectedCourse || !activeChatId) return;
    const user = authService.getUser();
    startSession({
      isDark, instituteLogo,
      studentContext: context,
      course: selectedCourse,
      instituteId,
      chatId:   activeChatId,
      userId:   user?.id,
      userRole: "student",
    });
  }

  // ── Feature gate / loading ────────────────────────────────────────────────
  if (featuresLoading || !hasInstFeature("ai_tutor")) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Course selection screen ───────────────────────────────────────────────
  if (!selectedCourse) {
    return (
      <div className="flex flex-col items-center justify-start h-[calc(100vh-8rem)] max-h-[900px] rounded-2xl dark:bg-gray-900 overflow-hidden">
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
                        <img key={c.id} src={c.coverImage!} alt={c.name}
                          className="w-12 h-12 rounded-xl object-cover border-2 border-white dark:border-gray-900 shadow-sm"
                          style={{ marginLeft: i === 0 ? 0 : "-10px", zIndex: previews.length - i }} />
                      ))}
                    </div>
                  );
                })()}
              </div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">Select a Course to Start</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Choose which course you'd like help with today.</p>
            </div>

            {coursesLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}</div>
            ) : courses.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400">You are not enrolled in any courses yet.</div>
            ) : (
              <div className="space-y-3">
                {courses.map((course) => (
                  <button key={course.id} onClick={() => handleSelectCourse(course, getSavedChatId(course.id))}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl bg-white dark:bg-gray-800/50 hover:bg-brand-50/50 dark:hover:bg-brand-500/5 transition-all text-left group">
                    {course.coverImage ? (
                      <img src={course.coverImage} alt={course.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-linear-to-br from-brand-400 to-indigo-500 shrink-0 flex items-center justify-center">
                        <FiBookOpen className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{course.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{course.code}{course.batchNumber ? ` · Batch ${course.batchNumber}` : ""}</p>
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

  // ── Active session for sidebar label ─────────────────────────────────────
  const activeSession = chatSessions.find((s) => s.chat_id === activeChatId);

  // ── Chat screen ───────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-8rem)] max-h-[900px] rounded-2xl overflow-hidden">
      {/* ── Main chat panel ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 shrink-0
          bg-linear-to-r from-brand-50 to-indigo-50 dark:from-brand-500/5 dark:to-indigo-500/5">
          {/* Chat history dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white/60 dark:hover:bg-gray-800 transition-colors shrink-0"
              title="Chat history"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                {/* Dropdown header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Chats</span>
                  <button
                    onClick={() => { createNewChat(); setDropdownOpen(false); }}
                    title="New chat"
                    className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                  >
                    <FiPlus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Chat list */}
                <div className="max-h-96 overflow-y-auto py-1 custom-scrollbar">
                  {sessionsLoading ? (
                    <div className="space-y-1 px-2 pt-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-7 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                      ))}
                    </div>
                  ) : chatSessions.length === 0 ? (
                    <p className="text-[11px] text-gray-400 text-center py-4">No chats yet</p>
                  ) : (
                    chatSessions.map((session) => (
                      <div
                        key={session.chat_id}
                        className={`group flex items-center gap-1.5 mx-1 my-0.5 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                          session.chat_id === activeChatId
                            ? "bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                        onClick={() => {
                          if (renamingId !== session.chat_id) {
                            openChat(session);
                            setDropdownOpen(false);
                          }
                        }}
                      >
                        <FiMessageSquare className="w-3 h-3 shrink-0 opacity-60" />
                        {renamingId === session.chat_id ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => commitRename(session)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename(session);
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            className="flex-1 text-xs bg-transparent border-b border-brand-400 outline-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="flex-1 text-xs truncate">{session.title}</span>
                        )}
                        {session.chat_id === activeChatId && renamingId !== session.chat_id && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenamingId(session.chat_id);
                                setRenameValue(session.title);
                              }}
                              className="w-4 h-4 flex items-center justify-center rounded hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors"
                            >
                              <FiEdit2 className="w-2 h-2" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteChat(session);
                              }}
                              className="w-4 h-4 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-500/20 text-red-400 transition-colors"
                            >
                              <FiTrash2 className="w-2 h-2" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Course label */}
                <div className="px-3 py-2.5 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setSelectedCourse(null);
                      setMessages([]);
                      setActiveChatId(null);
                      setChatSessions([]);
                      setDropdownOpen(false);
                    }}
                    className="flex items-center gap-2 w-full text-left hover:opacity-70 transition-opacity"
                  >
                    {selectedCourse?.coverImage ? (
                      <img src={selectedCourse.coverImage} alt="" className="w-4 h-4 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded bg-brand-100 dark:bg-brand-500/20 shrink-0 flex items-center justify-center">
                        <FiBookOpen className="w-2 h-2 text-brand-500" />
                      </div>
                    )}
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{selectedCourse?.name}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {selectedCourse?.coverImage ? (
            <img src={selectedCourse.coverImage} alt={selectedCourse.name} className="w-9 h-9 rounded-xl object-cover shrink-0 shadow-md" />
          ) : (
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-br from-brand-400 to-indigo-500 shadow-md shadow-brand-500/25 shrink-0">
              <BotIcon className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">
              {activeSession?.title ?? selectedCourse?.name}
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              AI Tutor · {context.institute_name || "SmartEdX"}
            </p>
          </div>
          <button onClick={() => createNewChat()} title="New chat"
            className="shrink-0 flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors shadow-sm">
            <FiPlus className="w-3 h-3" />
            New chat
          </button>
          {voiceSession ? (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-violet-600 dark:text-violet-400 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />Voice active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-success-600 dark:text-success-500 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />Ready
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 custom-scrollbar">
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} userProfilePicture={userProfilePicture} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* File badge */}
        {pendingFile && (
          <div className="mx-5 mb-2 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-50 dark:bg-brand-500/10">
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
        <div className="px-5 pb-5 pt-1 shrink-0">
          <div className={`flex items-center gap-2 rounded-full bg-white dark:bg-gray-800 shadow-md px-4 py-3 transition-shadow ${voiceSession ? "ring-2 ring-violet-400/50" : ""}`}>
            <input ref={fileInputRef} type="file"
              accept=".pdf,.docx,.txt,.csv,.md,.png,.jpg,.jpeg,.webp"
              onChange={handleFileChange} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={loading} title="Attach file"
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
              </svg>
            </button>
            <textarea ref={textareaRef} rows={1} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={pendingFile ? `Ask about ${pendingFile.name}…` : voiceSession ? "Message voice agent…" : "Ask anything..."}
              disabled={loading}
              className="flex-1 resize-none bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none leading-relaxed disabled:opacity-50 max-h-[120px]" />
            <button
              onClick={() => input.trim() || pendingFile ? sendMessage(input, pendingFile) : (voiceEnabled ? openVoiceMode() : undefined)}
              disabled={loading || (!input.trim() && !pendingFile && !voiceEnabled)}
              title={!input.trim() && !pendingFile && !voiceEnabled ? "Voice Agent not enabled" : undefined}
              className="shrink-0 w-9 h-9 rounded-full bg-gray-700 dark:bg-gray-600 hover:bg-gray-800 dark:hover:bg-gray-500 text-white flex items-center justify-center transition-all hover:scale-105 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
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
      </div>
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
          userProfilePicture ? <img src={userProfilePicture} alt="You" className="w-full h-full object-cover" /> : "You"
        ) : <BotIconSm />}
      </div>
      <div className={`max-w-[82%] text-sm leading-relaxed px-3.5 py-2.5 rounded-2xl wrap-break-word ${
        isUser
          ? "bg-linear-to-br from-brand-500 to-indigo-500 text-white rounded-tr-sm whitespace-pre-wrap"
          : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm"
      }`}>
        {msg.fileName && (
          <span className="flex items-center gap-1 text-[10px] opacity-70 mb-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
            </svg>
            {msg.fileName}
          </span>
        )}
        {isUser ? msg.content : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
            li: ({ children }) => <li className="ml-2">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            h1: ({ children }) => <h1 className="text-base font-bold mb-1.5 mt-2 first:mt-0">{children}</h1>,
            h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5 mt-2 first:mt-0">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
            code: ({ children, className }) => className ? (
              <code className="block bg-gray-200 dark:bg-gray-700 rounded-lg px-3 py-2 my-1.5 text-xs font-mono overflow-x-auto whitespace-pre">{children}</code>
            ) : (
              <code className="bg-gray-200 dark:bg-gray-700 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
            ),
            pre: ({ children }) => <pre className="my-1.5 overflow-x-auto">{children}</pre>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-green-400 bg-green-50 dark:bg-green-900/20 pl-3 pr-2 py-1.5 rounded-r-lg my-2 text-green-800 dark:text-green-300 not-italic font-medium">{children}</blockquote>
            ),
            hr: () => <hr className="border-gray-300 dark:border-gray-600 my-3" />,
            a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline opacity-80 hover:opacity-100">{children}</a>,
          }}>{msg.content}</ReactMarkdown>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div className="w-7 h-7 rounded-full bg-linear-to-br from-brand-400 to-indigo-500 flex items-center justify-center shrink-0"><BotIconSm /></div>
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
