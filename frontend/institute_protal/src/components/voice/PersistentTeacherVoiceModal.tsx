"use client";
import { usePathname } from "next/navigation";
import { useVoiceAgent } from "@/context/VoiceAgentContext";
import VoiceModal from "@/app/[instituteId]/teacher/ai-tools/VoiceModal";

/**
 * Rendered once at the teacher layout level so the voice session survives
 * navigation. Auto-switches to PiP when the user leaves the ai-tools page.
 */
export default function PersistentTeacherVoiceModal() {
  const { session, endSession } = useVoiceAgent();
  const pathname = usePathname() ?? "";

  if (!session) return null;

  const isOnAiToolsPage = pathname.includes("/ai-tools");

  return (
    <VoiceModal
      isDark={session.isDark}
      instituteLogo={session.instituteLogo}
      context={session.studentContext}
      selectedCourse={session.course}
      instituteId={session.instituteId}
      wsUrl={session.wsUrl}
      label={session.label}
      onClose={endSession}
      forcePip={!isOnAiToolsPage}
    />
  );
}
