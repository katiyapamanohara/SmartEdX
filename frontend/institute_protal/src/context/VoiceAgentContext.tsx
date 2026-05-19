"use client";
import { createContext, useContext, useState, useCallback, useRef } from "react";
import { Course } from "@/services/instituteService";
import { StudentContext } from "@/app/[instituteId]/student/ai-chat/VoiceModal";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VoiceSessionParams {
  isDark: boolean;
  instituteLogo: string | null;
  studentContext: StudentContext;
  course: Course;
  instituteId: string;
  /** Active chat session ID — transcripts are saved to this chat's Qdrant collection */
  chatId?: string;
  userId?: string;
  userRole?: "student" | "teacher";
  wsUrl?: string;
  label?: string;
}

export interface PendingTranscript {
  role: "user" | "assistant";
  text: string;
}

interface VoiceAgentContextValue {
  session: VoiceSessionParams | null;
  startSession: (params: VoiceSessionParams) => void;
  endSession: () => void;
  /** Send a text message into the active voice WebSocket session */
  sendTextToVoice: (text: string) => void;
  /** Called by VoiceModal once the WS is ready to accept text */
  setVoiceSendFn: (fn: ((text: string) => void) | null) => void;
  /** Register a handler that receives transcripts from the voice session */
  setTranscriptHandler: (fn: ((role: "user" | "assistant", text: string) => void) | null) => void;
  /** Fired by VoiceModal when a text transcript arrives */
  dispatchTranscript: (role: "user" | "assistant", text: string) => void;
  /** Returns and clears transcripts buffered while no page handler was registered */
  drainPendingTranscripts: () => PendingTranscript[];
}

// ── Context ───────────────────────────────────────────────────────────────────

const VoiceAgentContext = createContext<VoiceAgentContextValue | null>(null);

export function useVoiceAgent(): VoiceAgentContextValue {
  const ctx = useContext(VoiceAgentContext);
  if (!ctx) throw new Error("useVoiceAgent must be used within VoiceAgentProvider");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

const SESSION_STORAGE_KEY         = "voiceAgentSession";
const PENDING_STORAGE_KEY         = "voiceAgentPending";

function readStoredSession(): VoiceSessionParams | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as VoiceSessionParams) : null;
  } catch {
    return null;
  }
}

function readStoredPending(): PendingTranscript[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(PENDING_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingTranscript[]) : [];
  } catch {
    return [];
  }
}

export function VoiceAgentProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<VoiceSessionParams | null>(readStoredSession);
  const sendFnRef             = useRef<((text: string) => void) | null>(null);
  const transcriptHandlerRef  = useRef<((role: "user" | "assistant", text: string) => void) | null>(null);
  const pendingTranscriptsRef = useRef<PendingTranscript[]>(readStoredPending());

  const startSession = useCallback((params: VoiceSessionParams) => {
    pendingTranscriptsRef.current = [];
    setSession(params);
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(params));
      sessionStorage.removeItem(PENDING_STORAGE_KEY);
    } catch {}
  }, []);

  const endSession = useCallback(() => {
    pendingTranscriptsRef.current = [];
    setSession(null);
    sendFnRef.current = null;
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      sessionStorage.removeItem(PENDING_STORAGE_KEY);
    } catch {}
  }, []);

  const sendTextToVoice = useCallback((text: string) => {
    sendFnRef.current?.(text);
  }, []);

  const setVoiceSendFn = useCallback((fn: ((text: string) => void) | null) => {
    sendFnRef.current = fn;
  }, []);

  const setTranscriptHandler = useCallback((fn: ((role: "user" | "assistant", text: string) => void) | null) => {
    transcriptHandlerRef.current = fn;
  }, []);

  const dispatchTranscript = useCallback((role: "user" | "assistant", text: string) => {
    if (transcriptHandlerRef.current) {
      transcriptHandlerRef.current(role, text);
    } else {
      // No page handler registered (user navigated away) — buffer and persist
      pendingTranscriptsRef.current.push({ role, text });
      try { sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pendingTranscriptsRef.current)); } catch {}
    }
  }, []);

  const drainPendingTranscripts = useCallback((): PendingTranscript[] => {
    const pending = pendingTranscriptsRef.current;
    pendingTranscriptsRef.current = [];
    try { sessionStorage.removeItem(PENDING_STORAGE_KEY); } catch {}
    return pending;
  }, []);

  return (
    <VoiceAgentContext.Provider value={{
      session, startSession, endSession,
      sendTextToVoice, setVoiceSendFn,
      setTranscriptHandler, dispatchTranscript,
      drainPendingTranscripts,
    }}>
      {children}
    </VoiceAgentContext.Provider>
  );
}
