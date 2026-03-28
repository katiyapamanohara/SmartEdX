"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createPortal } from "react-dom";
import {
  FiMic, FiMicOff, FiX, FiVolume2, FiLoader,
  FiBookOpen, FiChevronRight, FiMessageCircle,
} from "react-icons/fi";
import { authService } from "@/services/authService";
import { instituteService, Course } from "@/services/instituteService";

// ─── PCM audio helpers (same as VoiceAssessmentPlayer) ───────────────────────

function float32ToInt16(buffer: Float32Array): ArrayBuffer {
  const out = new Int16Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out.buffer;
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const std = b64.replace(/-/g, "+").replace(/_/g, "/");
  const padded = std + "=".repeat((4 - (std.length % 4)) % 4);
  const binary = atob(padded);
  const buf = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buf;
}

function pcmToWav(pcmBuf: ArrayBuffer, sampleRate: number): ArrayBuffer {
  const dataLen = pcmBuf.byteLength;
  const wav = new ArrayBuffer(44 + dataLen);
  const v = new DataView(wav);
  const write = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  write(0, "RIFF"); v.setUint32(4, 36 + dataLen, true);
  write(8, "WAVE"); write(12, "fmt "); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  write(36, "data"); v.setUint32(40, dataLen, true);
  new Uint8Array(wav, 44).set(new Uint8Array(pcmBuf));
  return wav;
}

// ─── Waveform ─────────────────────────────────────────────────────────────────

function Waveform({ active, color = "blue" }: { active: boolean; color?: "blue" | "green" }) {
  const bars = [30, 55, 80, 50, 90, 65, 40, 75, 45, 85, 50, 70];
  const colorClass = color === "green" ? "bg-emerald-400" : "bg-brand-500";
  return (
    <div className="flex items-center justify-center gap-0.5 h-7">
      {bars.map((h, i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-all ${active ? colorClass : "bg-gray-300 dark:bg-gray-600"}`}
          style={{
            height: active ? `${h}%` : "20%",
            animationName: active ? "waveBar" : "none",
            animationDuration: "0.8s",
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
            animationDirection: "alternate",
            animationDelay: `${i * 60}ms`,
          }}
        />
      ))}
      <style>{`@keyframes waveBar { from { transform:scaleY(0.3) } to { transform:scaleY(1) } }`}</style>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

type AvatarState = "idle" | "speaking" | "listening";

function Avatar({ state }: { state: AvatarState }) {
  const ring =
    state === "speaking"  ? "ring-brand-400 shadow-brand-400/40"  :
    state === "listening" ? "ring-emerald-400 shadow-emerald-400/40" :
                            "ring-gray-200 dark:ring-gray-700 shadow-transparent";
  return (
    <div className="relative flex items-center justify-center">
      {state !== "idle" && (
        <span
          className={`absolute inset-0 rounded-full ${state === "speaking" ? "bg-brand-400/20" : "bg-emerald-400/20"} animate-ping`}
          style={{ borderRadius: "50%" }}
        />
      )}
      <div
        className={`relative w-20 h-20 rounded-full ring-4 shadow-lg transition-all duration-500 ${ring}
          bg-linear-to-br from-brand-500 via-indigo-600 to-violet-700 flex items-center justify-center`}
      >
        {state === "speaking" ? (
          <FiVolume2 className="w-9 h-9 text-white" />
        ) : state === "listening" ? (
          <FiMic className="w-9 h-9 text-white" />
        ) : (
          <FiBookOpen className="w-9 h-9 text-white/80" />
        )}
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "select" | "connecting" | "session" | "error";

export interface CourseVoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  /** If provided, skip the course-selection step and start immediately. */
  initialCourse?: Course;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CourseVoiceAssistant({
  isOpen, onClose, initialCourse,
}: CourseVoiceAssistantProps) {
  const params = useParams();
  const instituteId = (params?.instituteId as string) ?? "";

  const [step, setStep]               = useState<Step>("select");
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [micActive, setMicActive]     = useState(false);
  const [errorMsg, setErrorMsg]       = useState("");
  const [captionText, setCaptionText] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(initialCourse ?? null);

  // Course list (for selection step)
  const [courses, setCourses]         = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Audio / WebSocket refs
  const wsRef            = useRef<WebSocket | null>(null);
  const playCtxRef       = useRef<AudioContext | null>(null);
  const micCtxRef        = useRef<AudioContext | null>(null);
  const processorRef     = useRef<ScriptProcessorNode | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);
  const nextPlayTimeRef  = useRef(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const isAISpeakingRef  = useRef(false);
  const playVersionRef   = useRef(0);
  const stopAllAudioRef  = useRef<() => void>(() => {});

  // ── Fetch enrolled courses for selection step ─────────────────────────────
  useEffect(() => {
    if (!isOpen || initialCourse || !instituteId) return;
    setLoadingCourses(true);
    instituteService.getMyEnrolledCourses(instituteId)
      .then(setCourses)
      .catch(() => setCourses([]))
      .finally(() => setLoadingCourses(false));
  }, [isOpen, instituteId, initialCourse]);

  // ── Reset on open/close ───────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setAvatarState("idle");
      setMicActive(false);
      setErrorMsg("");
      setCaptionText("");
      if (initialCourse) {
        // Skip selection — connect immediately to the provided course
        setSelectedCourse(initialCourse);
        connect(initialCourse);
      } else {
        setStep("select");
        setSelectedCourse(null);
      }
    } else {
      disconnect();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => () => { disconnect(); }, []);

  // ── Audio helpers ─────────────────────────────────────────────────────────

  const stopAllAudio = useCallback(() => {
    playVersionRef.current += 1;
    for (const src of activeSourcesRef.current) {
      try { src.stop(0); } catch (_) {}
    }
    activeSourcesRef.current = [];
    const ctx = playCtxRef.current;
    nextPlayTimeRef.current = ctx ? ctx.currentTime : 0;
    isAISpeakingRef.current = false;
    setAvatarState((prev) => (prev === "speaking" ? "listening" : prev));
  }, []);

  stopAllAudioRef.current = stopAllAudio;

  const disconnect = useCallback(() => {
    playVersionRef.current += 1;
    for (const src of activeSourcesRef.current) { try { src.stop(0); } catch (_) {} }
    activeSourcesRef.current = [];
    isAISpeakingRef.current = false;
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    micCtxRef.current?.close().catch(() => {});
    micCtxRef.current = null;
    playCtxRef.current?.close().catch(() => {});
    playCtxRef.current = null;
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) wsRef.current.close();
    wsRef.current = null;
    nextPlayTimeRef.current = 0;
    setMicActive(false);
  }, []);

  const enqueueAudio = useCallback((base64Pcm: string) => {
    const ctx = playCtxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    isAISpeakingRef.current = true;
    setAvatarState("speaking");

    const version = playVersionRef.current;
    const pcmBuf = base64ToArrayBuffer(base64Pcm);
    const wavBuf = pcmToWav(pcmBuf, 24000);

    ctx.decodeAudioData(wavBuf, (audioBuffer) => {
      if (playVersionRef.current !== version) return;
      const now = ctx.currentTime;
      const startAt = Math.max(nextPlayTimeRef.current, now + 0.05);
      nextPlayTimeRef.current = startAt + audioBuffer.duration;
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      activeSourcesRef.current.push(source);
      source.start(startAt);
      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
        if (activeSourcesRef.current.length === 0 && playVersionRef.current === version) {
          isAISpeakingRef.current = false;
          setAvatarState((prev) => (prev === "speaking" ? "listening" : prev));
        }
      };
    }, (err) => console.error("[CVA] decodeAudioData error:", err));
  }, []);

  // ── Parse events from voice agent ────────────────────────────────────────

  const handleEvent = useCallback((event: Record<string, unknown>) => {
    if (event.interrupted === true) {
      stopAllAudio();
      return;
    }

    // Reminder ping from server
    if ((event as Record<string, unknown>).type === "reminder") {
      const content = event?.content as Record<string, unknown> | undefined;
      const parts = (content?.parts as Array<Record<string, unknown>>) ?? [];
      for (const p of parts) {
        if (typeof p.text === "string") setCaptionText(p.text);
      }
      return;
    }

    const content = event?.content as Record<string, unknown> | undefined;
    const parts = (content?.parts as unknown[]) ?? [];

    for (const part of parts) {
      const p = part as Record<string, unknown>;

      // PCM audio
      const inlineData = p?.inlineData as Record<string, unknown> | undefined;
      if (inlineData?.data && typeof inlineData.data === "string") {
        enqueueAudio(inlineData.data);
      }

      // Text transcript from agent
      if (typeof p?.text === "string" && p.text.trim()) {
        setCaptionText(p.text.trim());
      }
    }
  }, [enqueueAudio, stopAllAudio]);

  // ── Connect ───────────────────────────────────────────────────────────────

  const connect = useCallback(async (course: Course) => {
    setStep("connecting");

    const playCtx = new AudioContext();
    playCtxRef.current = playCtx;
    nextPlayTimeRef.current = playCtx.currentTime;

    const userId    = authService.getUserId() ?? "student";
    const sessionId = `cqa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const voiceAgentWs = process.env.NEXT_PUBLIC_VOICE_AGENT_WS_URL ?? "ws://localhost:5001/voice-agent";
    const wsUrl = `${voiceAgentWs}/ws/course-qa/${instituteId}/${course.id}/${userId}/${sessionId}?course_name=${encodeURIComponent(course.name)}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;
    } catch {
      setErrorMsg("Failed to open WebSocket connection.");
      setStep("error");
      return;
    }

    ws.onopen = async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
        streamRef.current = stream;
      } catch {
        setErrorMsg("Microphone access denied. Please allow microphone and try again.");
        setStep("error");
        ws.close();
        return;
      }

      const micCtx = new AudioContext({ sampleRate: 16000 });
      micCtxRef.current = micCtx;
      const source    = micCtx.createMediaStreamSource(stream);
      const processor = micCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      const BARGE_IN_THRESHOLD = 0.022;
      const BARGE_IN_FRAMES    = 2;
      let bargeInCount = 0;

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        const samples = e.inputBuffer.getChannelData(0);
        if (ws.readyState === WebSocket.OPEN) ws.send(float32ToInt16(samples));

        if (isAISpeakingRef.current) {
          let sum = 0;
          for (let k = 0; k < samples.length; k++) sum += samples[k] * samples[k];
          if (Math.sqrt(sum / samples.length) > BARGE_IN_THRESHOLD) {
            if (++bargeInCount >= BARGE_IN_FRAMES) {
              bargeInCount = 0;
              stopAllAudioRef.current();
            }
          } else {
            bargeInCount = 0;
          }
        } else {
          bargeInCount = 0;
        }
      };

      const silence = micCtx.createGain();
      silence.gain.value = 0;
      source.connect(processor);
      processor.connect(silence);
      silence.connect(micCtx.destination);

      setMicActive(true);
      setStep("session");
      setAvatarState("listening");
      setCaptionText("Connected! Ask me anything about the course.");
    };

    ws.onmessage = (evt) => {
      if (typeof evt.data !== "string") return;
      try {
        handleEvent(JSON.parse(evt.data));
      } catch { /* ignore */ }
    };

    ws.onerror = () => {
      setErrorMsg("Connection error. Make sure the voice agent is running.");
      setStep("error");
    };

    ws.onclose = (e) => {
      setMicActive(false);
      if (step !== "session") return; // already handled
      if (e.code !== 1000) {
        setErrorMsg(`Session closed (${e.code}).`);
        setStep("error");
      }
    };
  }, [instituteId, handleEvent]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectCourse = useCallback((course: Course) => {
    setSelectedCourse(course);
    connect(course);
  }, [connect]);

  const handleClose = useCallback(() => {
    disconnect();
    onClose();
  }, [disconnect, onClose]);

  if (!isOpen) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-end justify-end sm:items-center sm:justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={step === "select" ? handleClose : undefined}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-gray-900 flex flex-col">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-linear-to-r from-brand-500 to-indigo-600">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/20">
            <FiMessageCircle className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">
              {step === "select" ? "AI Course Tutor" : selectedCourse?.name ?? "AI Course Tutor"}
            </p>
            <p className="text-white/70 text-xs mt-0.5">
              {step === "select"    ? "Select a course to start"      :
               step === "connecting" ? "Connecting…"                   :
               step === "session"   ? "Ask anything about this course" :
               step === "error"     ? "Connection error"              : ""}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/20 text-white transition-colors"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}

        {/* STEP: Course selection */}
        {step === "select" && (
          <div className="flex flex-col gap-3 p-5 max-h-[70vh] overflow-y-auto">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select a course to talk to your AI tutor about.
            </p>

            {loadingCourses ? (
              <div className="flex items-center justify-center py-12">
                <FiLoader className="w-6 h-6 text-brand-500 animate-spin" />
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                No enrolled courses found.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {courses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => handleSelectCourse(course)}
                    className="flex items-center gap-3 w-full text-left rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors p-3 group"
                  >
                    {/* Cover thumbnail */}
                    <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden">
                      {course.coverImage ? (
                        <img src={course.coverImage} alt={course.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-linear-to-br from-brand-500 to-indigo-500 flex items-center justify-center">
                          <FiBookOpen className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-white text-sm truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {course.name}
                      </p>
                      {course.code && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{course.code}</p>
                      )}
                      {course.assignedTeacher && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {course.assignedTeacher.firstName} {course.assignedTeacher.lastName}
                        </p>
                      )}
                    </div>

                    <FiChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP: Connecting */}
        {step === "connecting" && (
          <div className="flex flex-col items-center justify-center gap-4 py-14 px-5">
            <FiLoader className="w-10 h-10 text-brand-500 animate-spin" />
            <div className="text-center">
              <p className="font-semibold text-gray-800 dark:text-white text-sm">Connecting to AI Tutor…</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Preparing your tutor for <span className="font-medium text-brand-500">{selectedCourse?.name}</span>
              </p>
            </div>
          </div>
        )}

        {/* STEP: Active session */}
        {step === "session" && (
          <div className="flex flex-col items-center gap-5 py-8 px-6">
            {/* Avatar */}
            <Avatar state={avatarState} />

            {/* Status label */}
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${
                avatarState === "speaking"  ? "bg-brand-500 animate-pulse"   :
                avatarState === "listening" ? "bg-emerald-500 animate-pulse"  :
                "bg-gray-300"
              }`} />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {avatarState === "speaking"  ? "AI Tutor is speaking" :
                 avatarState === "listening" ? "Listening…"           :
                 "Idle"}
              </span>
            </div>

            {/* Waveform */}
            <div className="w-full px-4">
              <Waveform active={avatarState === "speaking"} color="blue" />
            </div>

            {/* Caption / last transcript */}
            {captionText && (
              <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm text-gray-700 dark:text-gray-200 text-center leading-relaxed min-h-[52px] max-h-28 overflow-y-auto">
                {captionText}
              </div>
            )}

            {/* Mic indicator */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                micActive
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500"
              }`}>
                {micActive ? <FiMic className="w-3.5 h-3.5" /> : <FiMicOff className="w-3.5 h-3.5" />}
                {micActive ? "Microphone on" : "Microphone off"}
              </div>
            </div>

            {/* End conversation button */}
            <button
              onClick={handleClose}
              className="w-full mt-1 flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-all py-2.5 text-sm font-medium"
            >
              <FiX className="w-4 h-4" />
              End Conversation
            </button>
          </div>
        )}

        {/* STEP: Error */}
        {step === "error" && (
          <div className="flex flex-col items-center gap-4 py-10 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <FiX className="w-7 h-7 text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 dark:text-white text-sm">Something went wrong</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs">{errorMsg}</p>
            </div>
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => { setStep("select"); setErrorMsg(""); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
