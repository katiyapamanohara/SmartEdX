"use client";

import { Course } from "@/services/instituteService";

export interface StudentContext {
  student_name?: string;
  institute_name?: string;
  course_count?: number;
  selected_course?: string;
}

interface VoiceModalProps {
  isDark: boolean;
  instituteLogo: string | null;
  context: StudentContext;
  selectedCourse: Course | null;
  isListening: boolean;
  micMuted: boolean;
  voiceTranscript: string;
  onToggleMute: () => void;
  onClose: (send?: boolean) => void;
}

export default function VoiceModal({
  isDark,
  instituteLogo,
  context,
  selectedCourse,
  isListening,
  micMuted,
  voiceTranscript,
  onToggleMute,
  onClose,
}: VoiceModalProps) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ zIndex: 300000, background: isDark ? "#000000" : "#ffffff" }}
    >
      {/* Institute + course */}
      <div className="flex flex-col items-center gap-3 mb-10">
        {instituteLogo ? (
          <img
            src={instituteLogo}
            alt="logo"
            className="w-16 h-16 rounded-2xl object-contain shadow-lg"
            style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}
          />
        ) : (
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg"
            style={{
              background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              color: isDark ? "#ffffff" : "#111827",
            }}
          >
            {context.institute_name?.charAt(0).toUpperCase() ?? "S"}
          </div>
        )}
        <p className="text-xl font-bold tracking-tight" style={{ color: isDark ? "#ffffff" : "#111827" }}>
          {context.institute_name || "SmartEdX"}
        </p>
        {selectedCourse && (
          <span
            className="text-sm font-medium px-4 py-1.5 rounded-full"
            style={{
              background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
              color: isDark ? "#d1d5db" : "#374151",
            }}
          >
            {selectedCourse.name}
          </span>
        )}
      </div>

      {/* Orb */}
      <div className="relative flex items-center justify-center mb-16">
        {isListening && !micMuted && (
          <>
            <span className="absolute w-80 h-80 rounded-full bg-blue-400/15 animate-ping" style={{ animationDuration: "2s" }} />
            <span className="absolute w-72 h-72 rounded-full bg-blue-400/20 animate-ping" style={{ animationDuration: "2.5s" }} />
            <span className="absolute w-64 h-64 rounded-full bg-blue-300/25 animate-ping" style={{ animationDuration: "1.8s" }} />
          </>
        )}
        <div
          className="w-56 h-56 rounded-full"
          style={{
            background: "radial-gradient(circle at 38% 35%, #93c5fd 0%, #3b82f6 45%, #1d4ed8 80%, #1e3a8a 100%)",
            boxShadow: "0 30px 90px rgba(59,130,246,0.5), inset 0 -12px 32px rgba(0,0,0,0.18)",
          }}
        />
      </div>

      {/* Transcript */}
      <p
        className="text-base text-center max-w-sm px-8 min-h-10 mb-12 font-medium"
        style={{ color: micMuted ? "#9ca3af" : isDark ? "#f3f4f6" : "#111827" }}
      >
        {voiceTranscript || (micMuted ? "Microphone muted" : "Listening…")}
      </p>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Mute / unmute */}
        <button
          onClick={onToggleMute}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${isDark ? "text-white" : "text-gray-900"}`}
          style={{ background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)", backdropFilter: "blur(12px)" }}
          title={micMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {micMuted ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 19L5 5M12 18.75a6 6 0 0 1-6-6v-1.5M12 18.75a6 6 0 0 0 6-6v-1.5M12 18.75v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5m3 11.25a3 3 0 0 0 3-3V4.5m0 0a3 3 0 1 0-6 0v8.25" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
          )}
        </button>

        {/* Close / send */}
        <button
          onClick={() => onClose(true)}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${isDark ? "text-white" : "text-gray-900"}`}
          style={{ background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)", backdropFilter: "blur(12px)" }}
          title="Send & close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
