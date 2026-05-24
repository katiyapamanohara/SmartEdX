"use client";
import { useCallback, useEffect } from "react";
import { useVoiceAgent } from "@/context/VoiceAgentContext";
import { authService } from "@/services/authService";
import VoiceModal from "@/app/[instituteId]/teacher/ai-tools/VoiceModal";

/**
 * Rendered once at the teacher layout level so the voice session survives
 * navigation. Auto-switches to PiP when the user leaves the ai-tools page.
 * Text transcripts and the send-text bridge are wired through VoiceAgentContext.
 */
export default function PersistentTeacherVoiceModal() {
  const { session, endSession, setVoiceSendFn, dispatchTranscript } = useVoiceAgent();
  const handleTranscript = useCallback(
    (role: "user" | "assistant", text: string) => dispatchTranscript(role, text),
    [dispatchTranscript],
  );

  const handleSendTextReady = useCallback(
    (fn: (text: string) => void) => setVoiceSendFn(fn),
    [setVoiceSendFn],
  );

  useEffect(() => {
    if (!session) setVoiceSendFn(null);
  }, [session, setVoiceSendFn]);

  if (!session) return null;

  const wsBase = process.env.NEXT_PUBLIC_VOICE_AGENT_WS_URL ?? "ws://localhost:5001/voice-agent";
  const userId = session.userId ?? authService.getUserId() ?? "teacher";
  const sessionId = `tva-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const wsUrl = session.wsUrl ?? (() => {
    const qs = new URLSearchParams({
      course_name: session.course.name,
      role:        session.userRole ?? "teacher",
      ...(session.chatId ? { chat_id: session.chatId } : {}),
    }).toString();
    return `${wsBase}/ws/course-qa/${session.instituteId}/${session.course.id}/${userId}/${sessionId}?${qs}`;
  })();

  return (
    <VoiceModal
      isDark={session.isDark}
      instituteLogo={session.instituteLogo}
      context={session.studentContext}
      selectedCourse={session.course}
      instituteId={session.instituteId}
      wsUrl={wsUrl}
      label={session.label}
      onClose={endSession}
      forcePip={true}
      onTranscript={handleTranscript}
      onSendTextReady={handleSendTextReady}
    />
  );
}
