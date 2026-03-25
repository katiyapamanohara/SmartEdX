"use client";
import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLiveSession } from "@/context/LiveSessionContext";

// ── Inline icons ──────────────────────────────────────────────────────────────
const ExpandIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
  </svg>
);
const MicOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
    <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3 3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73l-9-9-7.73-7.73z"/>
  </svg>
);

// ── Small preview video component ─────────────────────────────────────────────
function PipVideo({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      className="w-full h-full object-cover"
    />
  );
}

// ── Main PiP widget ───────────────────────────────────────────────────────────
export default function LivePipWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const ctx = useLiveSession();

  // Only show when there is an active minimized session
  if (!ctx.session || !ctx.isMinimized) return null;

  const { session, participants, remoteVideos, localStream, selfAvatar, selfEmail,
          isCamOff, isMicMuted, isEnding } = ctx;

  // What to show in preview
  const isTeacher = session.isTeacher;
  const previewStream = isTeacher ? (isCamOff ? null : localStream) : (remoteVideos[0]?.stream ?? null);
  const avatarLetter = (selfEmail?.[0] ?? "T").toUpperCase();
  const avatarColor = ["#1a73e8","#34a853","#fbbc04","#ea4335","#9c27b0","#00bcd4"][
    (selfEmail?.charCodeAt(0) ?? 0) % 6
  ];

  const classroomPath = `/${session.instituteId}/${isTeacher ? "teacher" : "student"}/live-classes/${session.sessionId}`;
  const dashboardPath = `/${session.instituteId}/${isTeacher ? "teacher" : "student"}`;
  const onClassroomPage = pathname === classroomPath;

  const handleExpand = () => {
    ctx.expand();
    if (!onClassroomPage) router.push(classroomPath);
  };

  const handleEnd = isTeacher
    ? () => { if (confirm("End class for everyone?")) ctx.endSession(); }
    : () => ctx.leaveSession();

  return (
    <div className="fixed bottom-5 right-5 z-999999 w-72 rounded-2xl overflow-hidden bg-[#202124] shadow-2xl border border-white/20 select-none">
      {/* Preview */}
      <div className="relative aspect-video bg-[#3c4043]">
        {previewStream ? (
          <PipVideo stream={previewStream} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isTeacher && selfAvatar ? (
              <img src={selfAvatar} alt={selfEmail}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-white/20" />
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: avatarColor }}>
                {isTeacher ? avatarLetter : "T"}
              </div>
            )}
          </div>
        )}
        {/* LIVE badge */}
        <span className="absolute top-2 left-2 text-[10px] font-bold text-white bg-red-600 px-1.5 py-0.5 rounded-full animate-pulse">
          ● LIVE
        </span>
        {/* Mic muted indicator */}
        {isMicMuted && (
          <div className="absolute top-2 right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <MicOffIcon />
          </div>
        )}
        {/* Gradient */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-black/70 to-transparent" />
      </div>

      {/* Info + controls */}
      <div className="px-3 py-2.5 bg-[#2d2f31]">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{session.title}</p>
            <p className="text-white/40 text-[10px] mt-0.5">
              {isTeacher
                ? `${participants.length} participant${participants.length !== 1 ? "s" : ""}`
                : session.teacherName ?? "Live class"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Dashboard link — only show when NOT already on dashboard */}
          {pathname !== dashboardPath && (
            <button
              onClick={() => router.push(dashboardPath)}
              className="flex-1 text-xs text-white/70 hover:text-white bg-[#3c4043] hover:bg-[#4a5157] py-1.5 rounded-lg transition-colors text-center"
            >
              Dashboard
            </button>
          )}
          <button
            onClick={handleExpand}
            className="flex-1 text-xs text-white bg-[#1a73e8] hover:bg-[#1557b0] py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <ExpandIcon /> Return
          </button>
          <button
            onClick={handleEnd}
            disabled={isEnding}
            className="px-3 text-xs text-white bg-red-600 hover:bg-red-700 py-1.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {isTeacher ? "End" : "Leave"}
          </button>
        </div>
      </div>
    </div>
  );
}
