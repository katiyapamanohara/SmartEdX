"use client";
import { usePathname } from "next/navigation";
import { useVoiceAgent } from "@/context/VoiceAgentContext";
import VoiceModal from "@/app/[instituteId]/student/ai-chat/VoiceModal";

/**
 * Rendered once at the student layout level so the voice session survives
 * navigation. Auto-switches to PiP when the user leaves the ai-chat page.
 */
export default function PersistentVoiceModal() {
  const { session, endSession } = useVoiceAgent();
  const pathname = usePathname() ?? "";

  if (!session) return null;

  const isOnChatPage = pathname.includes("/ai-chat");

  return (
    <VoiceModal
      isDark={session.isDark}
      instituteLogo={session.instituteLogo}
      context={session.studentContext}
      selectedCourse={session.course}
      instituteId={session.instituteId}
      onClose={endSession}
      forcePip={!isOnChatPage}
    />
  );
}
