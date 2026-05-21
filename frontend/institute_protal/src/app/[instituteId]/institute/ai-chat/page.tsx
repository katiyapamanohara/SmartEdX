"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { FiPlus, FiTrash2, FiMessageSquare, FiEdit2 } from "react-icons/fi";
import { authService } from "@/services/authService";
import { instituteService, Course } from "@/services/instituteService";
import { useInstituteFeatures } from "@/hooks/useInstituteFeatures";
import { useFeatures } from "@/context/InstituteFeatureContext";
import { useVoiceAgent } from "@/context/VoiceAgentContext";
import { openPipWindowForNextSession } from "@/components/voice/pipBridge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = "user" | "assistant";

interface ToolCallEntry {
  name: string;
  label: string;
}

interface ChatMessage {
  role: MessageRole;
  content: string;
  fileName?: string;
  timestamp?: number;
  toolCalls?: ToolCallEntry[];
}

interface ActionBadge {
  type: "course_created" | "lecturer_invited";
  data: Record<string, unknown>;
}

interface InstituteContext {
  student_name?: string;
  institute_name?: string;
  student_count?: number;
  teacher_count?: number;
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
const MGMT_COURSE_ID = "institute-management";

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

// ─── Quick prompts ────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  "Show institute analytics",
  "Teacher performance report",
  "Course enrollment details",
  "How many students do we have?",
  "Invite a new lecturer",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InstituteAiChatPage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const { isLoading: featuresLoading, hasFeature } = useInstituteFeatures({
    requiredFeature: "ai_tutor",
    redirectTo: `/${instituteId}/institute`,
  });
  const { hasFeature: hasInstFeature } = useFeatures();
  const voiceEnabled = hasInstFeature("voice_agent");

  // ── Message & input state ─────────────────────────────────────────────────
  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [actions, setActions]       = useState<ActionBadge[]>([]);
  const [context, setContext]       = useState<InstituteContext>({
    selected_course: MGMT_COURSE_ID,
    course_id:       MGMT_COURSE_ID,
  });
  const [userPicture, setUserPicture]     = useState<string | null>(null);
  const [instituteLogo, setInstituteLogo] = useState<string | null>(null);

  // ── Session state ─────────────────────────────────────────────────────────
  const [chatSessions, setChatSessions]   = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId]   = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const [renamingId, setRenamingId]       = useState<string | null>(null);
  const [renameValue, setRenameValue]     = useState("");

  // ── Voice state ───────────────────────────────────────────────────────────
  const {
    session: voiceSession, startSession, sendTextToVoice,
    setTranscriptHandler, drainPendingTranscripts,
  } = useVoiceAgent();
  const [isDark, setIsDark]         = useState(false);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef  = useRef<HTMLDivElement>(null);

  // ── Dark-mode detection ───────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [dropdownOpen]);

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

  // ── Save messages to Qdrant on change ─────────────────────────────────────
  useEffect(() => {
    if (!messages.length || !activeChatId) return;
    const user = authService.getUser();
    if (!user?.id) return;
    apiPost("chat-sessions/messages/save", {
      institute_id: instituteId,
      course_id:    MGMT_COURSE_ID,
      user_id:      user.id,
      role:         "teacher",
      chat_id:      activeChatId,
      messages:     messages.map((m) => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // ── Load context + sessions on mount ─────────────────────────────────────
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
        const instructorName = user
          ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || undefined
          : undefined;
        const instituteName = institute?.name;

        setContext(prev => ({
          ...prev,
          student_name:  instructorName,
          institute_name: instituteName,
          student_count: Array.isArray(students) ? students.length : 0,
          teacher_count: Array.isArray(teachers) ? teachers.length : 0,
          course_count:  Array.isArray(courses)  ? courses.length  : 0,
        }));

        const u = authService.getUser();
        if (!u?.id) return;
        setSessionsLoading(true);
        try {
          const data = await apiGet("chat-sessions/list", {
            institute_id: instituteId, user_id: u.id,
            course_id:    MGMT_COURSE_ID, role: "teacher",
          });
          const sessions: ChatSession[] = data ?? [];
          setChatSessions(sessions);
          if (sessions.length > 0) {
            // If a voice session is active, prefer the chat it belongs to
            const voiceActiveId = voiceSession?.chatId;
            const target = voiceActiveId
              ? (sessions.find(s => s.chat_id === voiceActiveId) ?? sessions[0])
              : sessions[0];
            await openChatById(target, instructorName, instituteName);
          } else {
            await createNewChat(instructorName, instituteName);
          }
        } catch {
          await createNewChat(instructorName, instituteName);
        } finally {
          setSessionsLoading(false);
        }
      } catch { /* context stays empty */ }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instituteId]);

  // ── Open an existing chat ─────────────────────────────────────────────────
  async function openChatById(
    session: ChatSession,
    instructorName?: string,
    instituteName?: string,
  ) {
    setActiveChatId(session.chat_id);
    setMessages([]);
    const user = authService.getUser();
    if (!user?.id) return;
    try {
      const data = await apiGet("chat-sessions/messages/load", {
        institute_id: instituteId, course_id: MGMT_COURSE_ID,
        user_id: user.id, role: "teacher", chat_id: session.chat_id,
      });
      const msgs: ChatMessage[] = data?.messages ?? [];
      // Flush voice transcripts that arrived while on another page
      const pending = voiceSession?.chatId === session.chat_id
        ? drainPendingTranscripts().map(p => ({ role: p.role as MessageRole, content: p.text, timestamp: Date.now() / 1000 }))
        : [];
      if (msgs.length > 0 || pending.length > 0) {
        setMessages([...msgs, ...pending]);
        // Retroactively rename chats still using the default title
        if (session.title === "New Chat") {
          const firstUser = msgs.find(m => m.role === "user");
          if (firstUser) {
            const title = firstUser.content.slice(0, 40).trim();
            if (title) {
              setChatSessions(prev => prev.map(s => s.chat_id === session.chat_id ? { ...s, title } : s));
              apiPost("chat-sessions/rename", {
                institute_id: instituteId, user_id: user.id, course_id: MGMT_COURSE_ID,
                role: "teacher", chat_id: session.chat_id, title,
              }).catch(() => {});
            }
          }
        }
        return;
      }
    } catch { /* fall through to welcome */ }
    showWelcome(session.chat_id, instructorName, instituteName);
  }

  // ── Create a new chat ─────────────────────────────────────────────────────
  async function createNewChat(instructorName?: string, instituteName?: string) {
    const user = authService.getUser();
    if (!user?.id) return;
    try {
      const meta: ChatSession = await apiPost("chat-sessions/create", {
        institute_id: instituteId, course_id: MGMT_COURSE_ID,
        user_id: user.id, role: "teacher", title: "New Chat",
      });
      setChatSessions(prev => [meta, ...prev]);
      setActiveChatId(meta.chat_id);
      setMessages([]);
      showWelcome(meta.chat_id, instructorName, instituteName);
    } catch {
      const localId = Math.random().toString(36).slice(2, 10);
      setActiveChatId(localId);
      setMessages([]);
      showWelcome(localId, instructorName, instituteName);
    }
  }

  function showWelcome(_chatId: string, instructorName?: string, instituteName?: string) {
    const name = instructorName ?? context.student_name;
    const inst = instituteName ?? context.institute_name;
    setMessages([{
      role: "assistant",
      timestamp: Date.now() / 1000,
      content:
        `Hello${name ? ` ${name}` : ""}! 👋 I'm your **${inst ?? "Institute"} AI Assistant**.\n\n` +
        `I can help you with:\n` +
        `- 📊 **Analytics** — students, teachers, course stats\n` +
        `- 🎓 **Teacher performance** — who teaches what and how many students\n` +
        `- 📚 **Course enrollment** — enrollment numbers per course\n` +
        `- ➕ **Create courses** — add new courses to the institute\n` +
        `- 📧 **Invite lecturers** — add a new lecturer by email\n` +
        `- 📄 **Analyze documents** — upload files for analysis\n\n` +
        `What would you like to know?`,
    }]);
  }

  // ── Delete a chat ─────────────────────────────────────────────────────────
  async function deleteChat(session: ChatSession) {
    const user = authService.getUser();
    if (!user?.id) return;
    try {
      await apiDelete("chat-sessions/delete", {
        institute_id: instituteId, user_id: user.id,
        course_id: MGMT_COURSE_ID, role: "teacher", chat_id: session.chat_id,
      });
    } catch { /* ignore */ }
    const remaining = chatSessions.filter(s => s.chat_id !== session.chat_id);
    setChatSessions(remaining);
    if (activeChatId === session.chat_id) {
      if (remaining.length > 0) await openChatById(remaining[0]);
      else await createNewChat();
    }
  }

  // ── Rename a chat ─────────────────────────────────────────────────────────
  async function commitRename(session: ChatSession) {
    const title = renameValue.trim() || "New Chat";
    setRenamingId(null);
    setChatSessions(prev => prev.map(s => s.chat_id === session.chat_id ? { ...s, title } : s));
    const user = authService.getUser();
    if (!user?.id) return;
    apiPost("chat-sessions/rename", {
      institute_id: instituteId, user_id: user.id, course_id: MGMT_COURSE_ID,
      role: "teacher", chat_id: session.chat_id, title,
    }).catch(() => {});
  }

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string, file?: File | null) => {
    const trimmed = text.trim();
    if ((!trimmed && !file) || loading) return;

    const messageText = trimmed || (file ? `Please analyze this file: ${file.name}` : "");
    const userMsg: ChatMessage = {
      role: "user", content: messageText,
      fileName: file?.name, timestamp: Date.now() / 1000,
    };
    setInput("");
    setPendingFile(null);

    // Auto-rename on first user message
    const isFirstUserMsg = !messages.some(m => m.role === "user");
    if (isFirstUserMsg && activeChatId) {
      const title = messageText.slice(0, 40).trim();
      if (title) {
        setChatSessions(prev => prev.map(s => s.chat_id === activeChatId ? { ...s, title } : s));
        const u = authService.getUser();
        if (u?.id) apiPost("chat-sessions/rename", {
          institute_id: instituteId, user_id: u.id, course_id: MGMT_COURSE_ID,
          role: "teacher", chat_id: activeChatId, title,
        }).catch(() => {});
      }
    }

    // Route through voice WebSocket if active
    if (voiceSession && !file) {
      setMessages(prev => [...prev, userMsg]);
      sendTextToVoice(messageText);
      return;
    }

    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);

    try {
      const token = authService.getToken();
      let res: Response;

      if (file) {
        const form = new FormData();
        form.append("messages",     JSON.stringify(updated.map(m => ({ role: m.role, content: m.content }))));
        form.append("institute_id", instituteId);
        form.append("context",      JSON.stringify(context));
        if (token) form.append("auth_token", token);
        form.append("file", file);
        res = await fetch(`${apiUrl}/api/ai/chat/message`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });
      } else {
        res = await fetch(`${apiUrl}/api/ai/chat/message`, {
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
      }

      if (!res.ok) throw new Error(res.statusText);
      const data: { reply: string; actions?: ActionBadge[]; tool_calls?: ToolCallEntry[] } =
        await res.json();

      setMessages(prev => [...prev, {
        role:      "assistant",
        content:   data.reply,
        timestamp: Date.now() / 1000,
        toolCalls: data.tool_calls?.length ? data.tool_calls : undefined,
      }]);
      if (data.actions?.length) setActions(prev => [...prev, ...data.actions!]);
    } catch {
      setMessages(prev => [...prev, {
        role:    "assistant",
        content: "Sorry, something went wrong. Please try again.",
        timestamp: Date.now() / 1000,
      }]);
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

  async function openVoiceMode() {
    if (!activeChatId) return;

    // Open Document PiP NOW — we still have the user gesture from the button click.
    // VoiceModal will pick this window up via pipBridge and render straight into it,
    // so the widget stays visible even when the user switches to another browser tab.
    await openPipWindowForNextSession();

    const wsBase     = process.env.NEXT_PUBLIC_VOICE_AGENT_WS_URL ?? "ws://localhost:5001/voice-agent";
    const voiceUser  = authService.getUserId() ?? "instructor";
    const voiceSid   = `iva-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const voiceToken = authService.getToken() ?? "";
    const wsUrl =
      `${wsBase}/ws/institute-management/${instituteId}/${voiceUser}/${voiceSid}` +
      `?institute_name=${encodeURIComponent(context.institute_name ?? "")}` +
      `&user_name=${encodeURIComponent(context.student_name ?? "")}` +
      `&user_token=${encodeURIComponent(voiceToken)}`;
    startSession({
      isDark,
      instituteLogo,
      studentContext: {
        student_name:    context.student_name,
        institute_name:  context.institute_name,
        course_count:    context.course_count,
        selected_course: context.institute_name,
      },
      course: {
        id:         MGMT_COURSE_ID,
        name:       context.institute_name ?? "Institute Management",
        code:       "MGMT",
        coverImage: instituteLogo ?? undefined,
      } as Course,
      instituteId,
      chatId:   activeChatId,
      userId:   authService.getUserId() ?? undefined,
      userRole: "teacher",
      wsUrl,
      label: "Institute Assistant",
    });
  }

  // ── Transcript handler — wires voice transcripts into chat messages ───────
  useEffect(() => {
    setTranscriptHandler((role, text) => {
      setMessages(prev => [...prev, { role, content: text, timestamp: Date.now() / 1000 }]);
    });
    return () => setTranscriptHandler(null);
  }, [setTranscriptHandler]);

  // ── Feature gate ──────────────────────────────────────────────────────────
  if (featuresLoading || !hasFeature("ai_tutor")) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeSession = chatSessions.find(s => s.chat_id === activeChatId);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex h-[calc(100vh-8rem)] max-h-[900px] rounded-2xl overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-5 py-3.5 shrink-0
            bg-linear-to-r from-violet-50 to-indigo-50 dark:from-violet-500/5 dark:to-indigo-500/5">

            {/* Chat history dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setDropdownOpen(v => !v)}
                title="Chat history"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400
                  hover:text-gray-700 hover:bg-white/60 dark:hover:bg-gray-800 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800
                  border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                  <div className="flex items-center justify-between px-3 py-2.5
                    border-b border-gray-200 dark:border-gray-700">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Chats
                    </span>
                    <button
                      onClick={() => { createNewChat(); setDropdownOpen(false); }}
                      className="w-5 h-5 flex items-center justify-center rounded text-gray-400
                        hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
                    >
                      <FiPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto py-1 custom-scrollbar">
                    {sessionsLoading ? (
                      <div className="space-y-1 px-2 pt-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="h-7 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                        ))}
                      </div>
                    ) : chatSessions.length === 0 ? (
                      <p className="text-[11px] text-gray-400 text-center py-4">No chats yet</p>
                    ) : (
                      chatSessions.map(session => (
                        <div
                          key={session.chat_id}
                          className={`group flex items-center gap-1.5 mx-1 my-0.5 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                            session.chat_id === activeChatId
                              ? "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                          }`}
                          onClick={() => {
                            if (renamingId !== session.chat_id) {
                              openChatById(session);
                              setDropdownOpen(false);
                            }
                          }}
                        >
                          <FiMessageSquare className="w-3 h-3 shrink-0 opacity-60" />
                          {renamingId === session.chat_id ? (
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onBlur={() => commitRename(session)}
                              onKeyDown={e => {
                                if (e.key === "Enter") commitRename(session);
                                if (e.key === "Escape") setRenamingId(null);
                              }}
                              className="flex-1 text-xs bg-transparent border-b border-violet-400 outline-none"
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            <span className="flex-1 text-xs truncate">{session.title}</span>
                          )}
                          {session.chat_id === activeChatId && renamingId !== session.chat_id && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setRenamingId(session.chat_id);
                                  setRenameValue(session.title);
                                }}
                                className="w-4 h-4 flex items-center justify-center rounded
                                  hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors"
                              >
                                <FiEdit2 className="w-2 h-2" />
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); deleteChat(session); }}
                                className="w-4 h-4 flex items-center justify-center rounded
                                  hover:bg-red-100 dark:hover:bg-red-500/20 text-red-400 transition-colors"
                              >
                                <FiTrash2 className="w-2 h-2" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Logo / bot icon */}
            {instituteLogo ? (
              <img src={instituteLogo} alt="Institute" className="w-9 h-9 rounded-xl object-cover shrink-0 shadow-md" />
            ) : (
              <div className="flex items-center justify-center w-9 h-9 rounded-xl
                bg-linear-to-br from-violet-500 to-indigo-500 shadow-md shadow-violet-500/25 shrink-0">
                <BotIcon className="w-4 h-4 text-white" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">
                {activeSession?.title ?? `${context.institute_name ?? "Institute"} AI Assistant`}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Analytics · Management · Tool-calling
              </p>
            </div>

            {/* Stats pills */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
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

            <button
              onClick={() => createNewChat()}
              title="New chat"
              className="shrink-0 flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full
                bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                text-gray-600 dark:text-gray-300 hover:border-violet-400 hover:text-violet-600
                dark:hover:text-violet-400 transition-colors shadow-sm"
            >
              <FiPlus className="w-3 h-3" />
              New chat
            </button>

            {voiceSession ? (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-violet-600 dark:text-violet-400 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                Voice active
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-green-600 dark:text-green-500 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Ready
              </span>
            )}
          </div>

          {/* ── Action badges ────────────────────────────────────────────────── */}
          {actions.length > 0 && (
            <div className="px-5 pt-3 flex flex-wrap gap-2 shrink-0">
              {actions.map((a, i) => (
                <ActionBadgeItem
                  key={i}
                  action={a}
                  onDismiss={() => setActions(p => p.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          )}

          {/* ── Messages ─────────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 custom-scrollbar">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} userPicture={userPicture} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* ── File badge ───────────────────────────────────────────────────── */}
          {pendingFile && (
            <div className="mx-5 mb-2 flex items-center gap-2 px-4 py-2.5 rounded-2xl
              bg-violet-50 dark:bg-violet-500/10">
              <svg className="w-4 h-4 text-violet-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
              </svg>
              <span className="text-[11px] text-violet-700 dark:text-violet-400 flex-1 truncate">
                {pendingFile.name}
              </span>
              <button onClick={() => setPendingFile(null)} className="text-violet-400 hover:text-violet-600 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* ── Quick prompts ────────────────────────────────────────────────── */}
          <div className="px-5 pb-2 shrink-0 flex gap-2 flex-wrap">
            {QUICK_PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                disabled={loading}
                className="text-[11px] px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800
                  text-gray-600 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-violet-500/10
                  hover:text-violet-700 dark:hover:text-violet-300 transition-colors disabled:opacity-40"
              >
                {p}
              </button>
            ))}
          </div>

          {/* ── Input bar ────────────────────────────────────────────────────── */}
          <div className="px-5 pb-5 pt-1 shrink-0">
            <div className={`flex items-center gap-2 rounded-full bg-white dark:bg-gray-800
              shadow-md px-4 py-3 transition-shadow ${voiceSession ? "ring-2 ring-violet-400/50" : ""}`}>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.csv,.md,.xlsx,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                title="Attach file"
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                  text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                  hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                </svg>
              </button>

              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  pendingFile ? `Ask about ${pendingFile.name}…` :
                  voiceSession ? "Message voice agent…" :
                  "Ask about teachers, courses, enrollment, or invite a lecturer…"
                }
                disabled={loading}
                className="flex-1 resize-none bg-transparent text-sm text-gray-800 dark:text-gray-200
                  placeholder-gray-400 dark:placeholder-gray-500 outline-none leading-relaxed
                  disabled:opacity-50 max-h-[120px]"
              />

              {/* Send / mic button */}
              <button
                onClick={() =>
                  input.trim() || pendingFile
                    ? sendMessage(input, pendingFile)
                    : voiceEnabled ? openVoiceMode() : undefined
                }
                disabled={loading || (!input.trim() && !pendingFile && !voiceEnabled)}
                title={
                  !input.trim() && !pendingFile && !voiceEnabled
                    ? "Voice Agent not enabled"
                    : undefined
                }
                className="shrink-0 w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-700 text-white
                  flex items-center justify-center transition-all hover:scale-105 shadow-sm
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {input.trim() || pendingFile ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                    style={{ opacity: voiceEnabled ? 1 : 0.4 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-gray-400 dark:text-gray-600">
              AI can make mistakes. Verify important information before acting.
            </p>
          </div>

        </div>
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue:   "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300",
    violet: "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300",
    indigo: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  };
  return (
    <div className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full ${colors[color] ?? colors.blue}`}>
      <span className="font-bold">{value}</span>
      <span className="opacity-75">{label}</span>
    </div>
  );
}

function ActionBadgeItem({ action, onDismiss }: { action: ActionBadge; onDismiss: () => void }) {
  const isInvite = action.type === "lecturer_invited";
  const d = action.data as Record<string, string>;
  const label = isInvite
    ? `Lecturer invited: ${d.firstName ?? ""} ${d.lastName ?? ""} (${d.email ?? ""})`
    : `Course created: ${d.name ?? ""} [${d.code ?? ""}]`;
  return (
    <div className="flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-full
      bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300
      border border-green-200 dark:border-green-500/20">
      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
      <span>{label}</span>
      <button onClick={onDismiss} className="ml-1 opacity-60 hover:opacity-100">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function ToolCallBadge({ toolCall }: { toolCall: ToolCallEntry }) {
  const TOOL_LABELS: Record<string, string> = {
    create_course:     "Created course",
    invite_lecturer:   "Invited lecturer",
    get_analytics:     "Fetched analytics",
    get_enrollments:   "Fetched enrollments",
    get_teachers:      "Fetched teachers",
    get_courses:       "Fetched courses",
    get_students:      "Fetched students",
    search_knowledge:  "Searched knowledge base",
  };
  const label = TOOL_LABELS[toolCall.name] ?? toolCall.label ?? toolCall.name;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full
      bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 font-medium">
      <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.654-4.654m5.65-4.65 1.48-1.752a4.5 4.5 0 0 0-6.328-6.328l-1.752 1.48" />
      </svg>
      {label}
    </span>
  );
}

function MessageBubble({ msg, userPicture }: { msg: ChatMessage; userPicture?: string | null }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden flex items-center justify-center
        text-[10px] font-bold bg-linear-to-br from-violet-500 to-indigo-500 text-white">
        {isUser ? (
          userPicture
            ? <img src={userPicture} alt="You" className="w-full h-full object-cover" />
            : "You"
        ) : (
          <BotIconSm />
        )}
      </div>
      <div className={`max-w-[82%] flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
        {/* Tool call badges — shown above the assistant bubble */}
        {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {msg.toolCalls.map((tc, i) => <ToolCallBadge key={i} toolCall={tc} />)}
          </div>
        )}
        <div className={`text-sm leading-relaxed px-3.5 py-2.5 rounded-2xl wrap-break-word ${
          isUser
            ? "bg-linear-to-br from-violet-500 to-indigo-500 text-white rounded-tr-sm whitespace-pre-wrap"
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
                    <code className="block bg-gray-200 dark:bg-gray-700 rounded-lg px-3 py-2 my-1.5 text-xs font-mono overflow-x-auto whitespace-pre">
                      {children}
                    </code>
                  ) : (
                    <code className="bg-gray-200 dark:bg-gray-700 rounded px-1 py-0.5 text-xs font-mono">
                      {children}
                    </code>
                  ),
                pre:        ({ children }) => <pre className="my-1.5 overflow-x-auto">{children}</pre>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-violet-400 pl-3 italic opacity-80 my-1.5">
                    {children}
                  </blockquote>
                ),
                hr:         () => <hr className="border-gray-300 dark:border-gray-600 my-2" />,
                a:          ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="underline opacity-80 hover:opacity-100">
                    {children}
                  </a>
                ),
              }}
            >
              {msg.content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div className="w-7 h-7 rounded-full bg-linear-to-br from-violet-500 to-indigo-500
        flex items-center justify-center shrink-0">
        <BotIconSm />
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3
        flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
        <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">Running tools…</span>
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
