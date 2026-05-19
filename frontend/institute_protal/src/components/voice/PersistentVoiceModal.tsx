"use client";
import { useCallback, useEffect } from "react";
import { useVoiceAgent } from "@/context/VoiceAgentContext";
import VoiceModal from "@/app/[instituteId]/student/ai-chat/VoiceModal";

/**
 * Rendered once at the student layout level so the voice session survives
 * navigation. Always renders in PiP mode so the underlying page stays visible.
 * Text transcripts and the send-text bridge are wired through VoiceAgentContext.
 */
export default function PersistentVoiceModal() {
  const { session, endSession, setVoiceSendFn, dispatchTranscript } = useVoiceAgent();

  const handleTranscript = useCallback(
    (role: "user" | "assistant", text: string) => dispatchTranscript(role, text),
    [dispatchTranscript],
  );

  const handleSendTextReady = useCallback(
    (fn: (text: string) => void) => setVoiceSendFn(fn),
    [setVoiceSendFn],
  );

  // Clear the send function when session ends
  useEffect(() => {
    if (!session) setVoiceSendFn(null);
  }, [session, setVoiceSendFn]);

  if (!session) return null;

  return (
    <VoiceModal
      isDark={session.isDark}
      instituteLogo={session.instituteLogo}
      context={session.studentContext}
      selectedCourse={session.course}
      instituteId={session.instituteId}
      onClose={endSession}
      forcePip={true}
      onTranscript={handleTranscript}
      onSendTextReady={handleSendTextReady}
    />
  );
}
