"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { authService } from "@/services/authService";
import { instituteService } from "@/services/instituteService";
import TeacherVoiceAgent from "@/components/teacher/TeacherVoiceAgent";

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = "user" | "assistant";

interface ChatMessage {
  role: MessageRole;
  content: string;
  fileName?: string;
}

interface TeacherContext {
  teacher_name?: string;
  institute_name?: string;
  course_count?: number;
  student_count?: number;
}

interface TeacherFloatingAiChatProps {
  instituteId: string;
}

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTED = [
  { label: "📚 My courses", text: "Show me my assigned courses" },
  { label: "👥 My students", text: "List all my students" },
  { label: "📝 Lesson plan", text: "Generate a lesson plan for a 1-hour class on programming basics" },
  { label: "📋 Quiz generator", text: "Create a 10-question quiz on mathematics fundamentals" },
  { label: "📢 Announcement", text: "Draft an announcement reminding students about the upcoming assignment deadline" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function TeacherFloatingAiChat({ instituteId }: TeacherFloatingAiChatProps) {
  const [open, setOpen]                   = useState(false);
  const [hasNew, setHasNew]               = useState(false);
  const [context, setContext]             = useState<TeacherContext>({});
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [contextLoaded, setContextLoaded] = useState(false);
  const [pendingFile, setPendingFile]     = useState<File | null>(null);
  const [isRecording, setIsRecording]       = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [hasMicSupport, setHasMicSupport]   = useState(false);
  const [voiceError, setVoiceError]         = useState<string | null>(null);
  const [voiceAgentOpen, setVoiceAgentOpen] = useState(false);

  const bottomRef        = useRef<HTMLDivElement>(null);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const fileInputRef     = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef   = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  // Tracks the committed final text so interim results can be appended cleanly
  const finalTranscriptRef = useRef("");
  // Set to false when the user explicitly stops — prevents onend from restarting
  const keepRecordingRef = useRef(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // ── Voice support check (client-only) ────────────────────────────────────
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _w = window as any;
    const hasSpeech = !!(_w.SpeechRecognition ?? _w.webkitSpeechRecognition);
    const hasMic = !!("mediaDevices" in navigator && "MediaRecorder" in window);
    setHasMicSupport(hasSpeech || hasMic);
  }, []);

  const startMediaRecorder = useCallback(async () => {
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const ext = mimeType === "audio/webm" ? "webm" : "ogg";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      // Prevent overlapping transcription requests
      let busy = false;

      const transcribe = async (blob: Blob, isFinal: boolean) => {
        if (busy && !isFinal) return;
        busy = true;
        setIsTranscribing(true);
        try {
          const token = authService.getToken();
          const formData = new FormData();
          formData.append("audio", blob, `recording.${ext}`);

          const res = await fetch(`${apiUrl}/api/ai/transcribe`, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          });
          if (res.ok) {
            const { transcript } = await res.json() as { transcript: string };
            // Always replace with the latest full transcript (accumulated audio)
            if (transcript) setInput(transcript);
          } else {
            const body = await res.json().catch(() => ({}));
            const msg = body?.detail || body?.message || "Transcription failed";
            console.error("Transcription API error:", msg);
            if (isFinal) setVoiceError(msg);
          }
        } catch (err) {
          console.error("Transcription fetch error:", err);
          if (isFinal) setVoiceError("Could not reach transcription service.");
        } finally {
          busy = false;
          setIsTranscribing(false);
          if (isFinal) textareaRef.current?.focus();
        }
      };

      // Fires every 3 s while recording — sends full accumulated audio for live updates
      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
          const fullBlob = new Blob(audioChunksRef.current, { type: mimeType });
          await transcribe(fullBlob, false);
        }
      };

      // Final pass when user stops recording
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (audioChunksRef.current.length > 0) {
          const finalBlob = new Blob(audioChunksRef.current, { type: mimeType });
          audioChunksRef.current = [];
          await transcribe(finalBlob, true);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(3000); // fire ondataavailable every 3 seconds
      setIsRecording(true);
    } catch (err: any) {
      setIsRecording(false);
      const msg = err?.name === "NotAllowedError"
        ? "Microphone access denied. Allow mic in browser settings."
        : "Could not access microphone.";
      console.error("MediaRecorder error:", err);
      setVoiceError(msg);
    }
  }, [apiUrl]);

  const toggleRecording = useCallback(async () => {
    if (!hasMicSupport) return;

    // ── Stop ──────────────────────────────────────────────────────────────
    if (isRecording) {
      keepRecordingRef.current = false;
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    // ── Try Web Speech API first (live interim results) ───────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechAPI: (new () => any) | undefined = w.SpeechRecognition ?? w.webkitSpeechRecognition;

    if (SpeechAPI) {
      const recognition = new SpeechAPI();
      recognition.lang = navigator.language || "en-US";
      recognition.interimResults = true;
      recognition.continuous = true;
      finalTranscriptRef.current = input;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (e: any) => {
        let interim = "";
        let newFinal = finalTranscriptRef.current;
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            newFinal += (newFinal ? " " : "") + t.trim();
            finalTranscriptRef.current = newFinal;
          } else {
            interim = t;
          }
        }
        setInput(interim ? `${newFinal} ${interim}` : newFinal);
      };

      recognition.onend = () => {
        if (keepRecordingRef.current) {
          try { recognition.start(); } catch { /* already started */ }
        } else {
          setIsRecording(false);
          recognitionRef.current = null;
          textareaRef.current?.focus();
        }
      };

      recognition.onerror = (e: any) => {
        if (keepRecordingRef.current && e?.error === "no-speech") {
          try { recognition.start(); } catch { /* already started */ }
          return;
        }
        keepRecordingRef.current = false;
        setIsRecording(false);
        recognitionRef.current = null;

        if (e?.error === "network") {
          // Browser Speech API is blocked — silently switch to backend STT
          startMediaRecorder();
        } else if (e?.error === "not-allowed") {
          setVoiceError("Microphone access denied. Allow mic in browser settings.");
        } else if (e?.error) {
          setVoiceError(`Voice error: ${e.error}`);
        }
      };

      setVoiceError(null);
      keepRecordingRef.current = true;
      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      return;
    }

    // ── No Speech API — go straight to backend STT ────────────────────────
    await startMediaRecorder();
  }, [hasMicSupport, isRecording, input, startMediaRecorder]);

  // ── Load teacher context once ─────────────────────────────────────────────
  useEffect(() => {
    if (!instituteId || contextLoaded) return;
    async function load() {
      try {
        const user = authService.getUser();
        const [institute, students, courses] = await Promise.all([
          instituteService.getInstituteById(instituteId),
          instituteService.getInstituteUsers(instituteId, "student"),
          instituteService.getCourses(instituteId),
        ]);
        const assignedCourses = courses.filter(
          (c) => c.assignedTeacher?.id === user?.id
        );
        const ctx: TeacherContext = {
          teacher_name: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : undefined,
          institute_name: institute?.name,
          course_count: assignedCourses.length,
          student_count: students.length,
        };
        setContext(ctx);
        setContextLoaded(true);
        setMessages([{
          role: "assistant",
          content:
            `Hi${ctx.teacher_name ? ` ${ctx.teacher_name}` : ""}! I'm your SmartEdX AI Teaching Assistant.\n\n` +
            `I can help you with:\n` +
            `• 📚 View your courses & students\n` +
            `• 📝 Generate lesson plans\n` +
            `• 📋 Create quizzes & assessments\n` +
            `• 📢 Draft announcements & emails\n` +
            `• 📄 Analyze uploaded documents (PDF, DOCX)\n\n` +
            `What would you like to do today?`,
        }]);
      } catch {
        setContextLoaded(true);
        setMessages([{
          role: "assistant",
          content: "Hi! I'm your SmartEdX AI Teaching Assistant. How can I help you today?",
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

  // ── Stop recording when chat closes or component unmounts ─────────────────
  useEffect(() => {
    if (!open && isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
  }, [open, isRecording]);

  useEffect(() => {
    return () => {
      keepRecordingRef.current = false;
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
    };
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string, file?: File | null) => {
    const trimmed = text.trim();
    if ((!trimmed && !file) || loading) return;

    const messageText = trimmed || (file ? `Analyze this file: ${file.name}` : "");
    const userMsg: ChatMessage = {
      role: "user",
      content: messageText,
      fileName: file?.name,
    };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setPendingFile(null);
    setLoading(true);

    try {
      const token = authService.getToken();
      const user = authService.getUser();

      const apiMessages = updated.map((m) => ({ role: m.role, content: m.content }));

      const formData = new FormData();
      formData.append("messages", JSON.stringify(apiMessages));
      formData.append("institute_id", instituteId);
      formData.append("teacher_id", user?.id ?? "");
      formData.append("context", JSON.stringify({
        teacher_name: context.teacher_name,
        institute_name: context.institute_name,
        course_count: context.course_count,
        student_count: context.student_count,
      }));
      if (token) formData.append("auth_token", token);
      if (file) formData.append("file", file);

      const res = await fetch(`${apiUrl}/api/ai/teacher-chat/message`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) throw new Error(res.statusText);
      const data: { reply: string; actions: Array<{ type: string; data: Record<string, unknown> }> } = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
      if (!open) setHasNew(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I ran into an error. Please try again." },
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
          className={`relative w-full max-w-4xl h-[85vh] max-h-[780px] flex flex-col overflow-hidden
            bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl
            pointer-events-auto
            transition-all duration-300 ease-out
            ${open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-br from-violet-400 to-violet-600 shadow-sm shadow-violet-500/30">
              <SparkleIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">AI Teaching Assistant</h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                {context.teacher_name
                  ? `${context.teacher_name} · ${context.institute_name || "SmartEdX"}`
                  : context.institute_name || "SmartEdX"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-success-600 dark:text-success-500">
                <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
                Live
              </span>
              <button
                onClick={() => setVoiceAgentOpen(true)}
                title="Open Voice Agent"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
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

          {/* Context pills */}
          {contextLoaded && context.course_count !== undefined && (
            <div className="flex gap-2 px-6 py-3 border-b border-gray-100 dark:border-gray-800 overflow-x-auto no-scrollbar shrink-0 bg-gray-50/60 dark:bg-gray-800/30">
              <StatPill icon="📚" label="My Courses" value={context.course_count ?? 0} color="violet" />
              <StatPill icon="👥" label="Students"   value={context.student_count ?? 0} color="blue" />
              <button
                onClick={() => sendMessage("Show me my assigned courses")}
                disabled={loading}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-gray-300 dark:border-gray-600 text-[11px] text-gray-400 hover:text-violet-500 hover:border-violet-400 transition-colors disabled:opacity-40"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Refresh
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

          {/* Suggested prompts */}
          {messages.length <= 1 && !loading && (
            <div className="px-6 pb-3 flex flex-wrap gap-2 shrink-0">
              {SUGGESTED.map((p) => (
                <button
                  key={p.text}
                  onClick={() => sendMessage(p.text)}
                  className="text-[11px] px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-violet-300 hover:text-violet-600 dark:hover:border-violet-500 dark:hover:text-violet-400 transition-colors whitespace-nowrap"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* File pending indicator */}
          {pendingFile && (
            <div className="mx-6 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20">
              <svg className="w-4 h-4 text-violet-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
              </svg>
              <span className="text-[11px] text-violet-700 dark:text-violet-400 flex-1 truncate">{pendingFile.name}</span>
              <button
                onClick={() => setPendingFile(null)}
                className="text-violet-400 hover:text-violet-600 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Input */}
          <div className="px-6 pb-6 pt-3 shrink-0 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-end gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3 py-2.5 focus-within:border-violet-400 dark:focus-within:border-violet-600 transition-colors">
              {/* File upload button */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                title="Upload file (PDF, DOCX, TXT)"
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                </svg>
              </button>

              {/* Voice input button */}
              {hasMicSupport && (
                <button
                  onClick={toggleRecording}
                  disabled={loading || isTranscribing}
                  title={isRecording ? "Stop recording" : isTranscribing ? "Transcribing…" : "Voice input"}
                  className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 ${
                    isRecording
                      ? "text-red-500 bg-red-50 dark:bg-red-500/10 animate-pulse"
                      : isTranscribing
                      ? "text-violet-500 bg-violet-50 dark:bg-violet-500/10 animate-spin"
                      : "text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                  </svg>
                </button>
              )}

              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => { setInput(e.target.value); setVoiceError(null); }}
                onKeyDown={handleKeyDown}
                placeholder={isTranscribing ? "Transcribing…" : isRecording ? "Listening…" : pendingFile ? `Ask about ${pendingFile.name}…` : "Ask anything — lesson plans, students, quizzes…"}
                disabled={loading}
                className="flex-1 resize-none bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none leading-relaxed disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage(input, pendingFile)}
                disabled={(!input.trim() && !pendingFile) || loading}
                className="shrink-0 w-8 h-8 rounded-lg bg-violet-500 hover:bg-violet-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 text-white disabled:text-gray-400 flex items-center justify-center transition-all hover:scale-105 disabled:scale-100"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              </button>
            </div>
            {voiceError && (
              <p className="mt-1.5 text-center text-[10px] text-red-500 dark:text-red-400">
                {voiceError}
              </p>
            )}
            {!voiceError && (
              <p className="mt-1.5 text-center text-[10px] text-gray-400 dark:text-gray-600">
                Enter to send · Shift+Enter for new line · Esc to close · Mic for voice input
              </p>
            )}
          </div>
        </div>
      </div>

      <TeacherVoiceAgent
        isOpen={voiceAgentOpen}
        onClose={() => setVoiceAgentOpen(false)}
        instituteId={instituteId}
      />

      {/* ── Floating button ──────────────────────────────────────────────────── */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setHasNew(false); }}
          className="fixed bottom-6 right-6 z-99997 group"
          aria-label="Open AI teaching assistant"
        >
          <span className="absolute inset-0 rounded-full bg-violet-500/25 animate-ping" />
          <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-linear-to-br from-violet-400 to-violet-600 shadow-xl shadow-violet-500/35 transition-all duration-200 hover:scale-110 group-hover:shadow-violet-500/50">
            <SparkleIcon className="w-6 h-6 text-white" />
          </span>
          {hasNew && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 border-2 border-white dark:border-gray-950 animate-bounce" />
          )}
          <span className="absolute bottom-full right-0 mb-2.5 px-2.5 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
            AI Teaching Assistant
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
            ? "bg-violet-500 text-white"
            : "bg-linear-to-br from-violet-400 to-violet-600 text-white"
        }`}
      >
        {isUser ? "You" : "AI"}
      </div>
      <div
        className={`max-w-[82%] text-sm leading-relaxed px-3.5 py-2.5 rounded-2xl whitespace-pre-wrap wrap-break-word ${
          isUser
            ? "bg-violet-500 text-white rounded-tr-sm"
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
      <div className="w-7 h-7 rounded-full bg-linear-to-br from-violet-400 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
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
  color: "violet" | "blue" | "green";
}) {
  const colors = {
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
    blue:   "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
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
