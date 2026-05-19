"use client";
import { createContext, useContext, useState, useCallback } from "react";
import { Course } from "@/services/instituteService";
import { StudentContext } from "@/app/[instituteId]/student/ai-chat/VoiceModal";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VoiceSessionParams {
  isDark: boolean;
  instituteLogo: string | null;
  studentContext: StudentContext;
  course: Course;
  instituteId: string;
  wsUrl?: string;
  label?: string;
}

interface VoiceAgentContextValue {
  session: VoiceSessionParams | null;
  startSession: (params: VoiceSessionParams) => void;
  endSession: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const VoiceAgentContext = createContext<VoiceAgentContextValue | null>(null);

export function useVoiceAgent(): VoiceAgentContextValue {
  const ctx = useContext(VoiceAgentContext);
  if (!ctx) throw new Error("useVoiceAgent must be used within VoiceAgentProvider");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function VoiceAgentProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<VoiceSessionParams | null>(null);

  const startSession = useCallback((params: VoiceSessionParams) => {
    setSession(params);
  }, []);

  const endSession = useCallback(() => {
    setSession(null);
  }, []);

  return (
    <VoiceAgentContext.Provider value={{ session, startSession, endSession }}>
      {children}
    </VoiceAgentContext.Provider>
  );
}
