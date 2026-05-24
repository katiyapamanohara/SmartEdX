"use client";
import { useCallback, useEffect } from "react";
import { useVoiceAgent } from "@/context/VoiceAgentContext";
import VoiceModal from "@/app/[instituteId]/student/ai-chat/VoiceModal";

/**
 * Rendered once at the institute layout level so the voice session survives
 * navigation. Starts in PiP view automatically. Transcripts and the send-text
 * bridge are wired through VoiceAgentContext.
 */
export default function PersistentInstituteVoiceModal() {
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

  return (
    <VoiceModal
      isDark={session.isDark}
      instituteLogo={session.instituteLogo}
      context={session.studentContext}
      selectedCourse={session.course}
      instituteId={session.instituteId}
      wsUrl={session.wsUrl}
      label={session.label ?? "Institute Assistant"}
      forcePip={true}
      onClose={endSession}
      onTranscript={handleTranscript}
      onSendTextReady={handleSendTextReady}
    />
  );
}
