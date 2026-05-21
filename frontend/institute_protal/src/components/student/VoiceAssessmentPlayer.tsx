"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createPortal } from "react-dom";
import { instituteService } from "@/services/instituteService";
import {
  FiMic, FiMicOff, FiX, FiAward, FiAlertCircle,
  FiVolume2, FiLoader, FiWifi, FiWifiOff, FiMonitor,
} from "react-icons/fi";
import { authService } from "@/services/authService";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VoiceQuestion {
  id: string;
  question: string;
  expected_answer: string;
  marks: number;
  hints: string[];
}

interface QuestionResult {
  question_id: string;
  question: string;
  student_answer: string;
  expected_answer: string;
  score: number;
  marks_available: number;
  percentage: number;
  feedback: string;
}

interface EvalResult {
  results: QuestionResult[];
  total_score: number;
  total_marks: number;
  percentage: number;
  grade: string;
  passed: boolean;
  overall_feedback: string;
}

export interface VoiceAssessmentPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  assessmentData?: {
    id: string;       // contentId — used to submit results
    title: string;
    instructions?: string;
    questions: VoiceQuestion[];
  };
  onCompleted?: (result: EvalResult) => void;
}

// ─── PCM audio helpers ────────────────────────────────────────────────────────

function float32ToInt16(buffer: Float32Array): ArrayBuffer {
  const out = new Int16Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out.buffer;
}

/** Decode base64 (standard or URL-safe) into an ArrayBuffer. */
function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const std = b64.replace(/-/g, "+").replace(/_/g, "/");
  const padded = std + "=".repeat((4 - (std.length % 4)) % 4);
  const binary = atob(padded);
  const buf = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buf;
}

/** Wrap raw Int16 LE PCM bytes in a minimal WAV container for decodeAudioData. */
function pcmToWav(pcmBuf: ArrayBuffer, sampleRate: number): ArrayBuffer {
  const dataLen = pcmBuf.byteLength;
  const wav = new ArrayBuffer(44 + dataLen);
  const v = new DataView(wav);
  const write = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  write(0, "RIFF"); v.setUint32(4, 36 + dataLen, true);
  write(8, "WAVE"); write(12, "fmt "); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  write(36, "data"); v.setUint32(40, dataLen, true);
  new Uint8Array(wav, 44).set(new Uint8Array(pcmBuf));
  return wav;
}

// ─── Waveform visualizer ──────────────────────────────────────────────────────

function Waveform({ active, color = "green" }: { active: boolean; color?: "green" | "purple" }) {
  const bars = [35, 60, 80, 55, 90, 65, 40, 75, 50, 85, 45, 70];
  const colorClass = color === "purple" ? "bg-purple-400" : "bg-green-400";
  return (
    <div className="flex items-center justify-center gap-0.5 h-8">
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
    state === "speaking"  ? "ring-purple-400 shadow-purple-400/40" :
    state === "listening" ? "ring-green-400 shadow-green-400/40"   :
                            "ring-gray-200 dark:ring-gray-700 shadow-transparent";
  return (
    <div className="relative flex items-center justify-center">
      {state !== "idle" && (
        <span className={`absolute inset-0 rounded-full ${
          state === "speaking" ? "bg-purple-400/20" : "bg-green-400/20"
        } animate-ping`} style={{ borderRadius: "50%" }} />
      )}
      <div className={`relative w-24 h-24 rounded-full ring-4 shadow-lg transition-all duration-500 ${ring}
        bg-linear-to-br from-indigo-600 via-purple-600 to-violet-700 flex items-center justify-center`}>
        {state === "speaking" ? (
          <FiVolume2 className="w-10 h-10 text-white" />
        ) : state === "listening" ? (
          <FiMic className="w-10 h-10 text-white" />
        ) : (
          <svg viewBox="0 0 48 48" className="w-10 h-10 text-white/80 fill-current">
            <circle cx="24" cy="18" r="9" />
            <path d="M6 42c0-9.94 8.06-18 18-18s18 8.06 18 18" />
          </svg>
        )}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

type Step = "screenshare" | "intro" | "connecting" | "session" | "evaluating" | "results" | "error" | "autofailed";

export default function VoiceAssessmentPlayer({
  isOpen, onClose, assessmentData, onCompleted,
}: VoiceAssessmentPlayerProps) {
  const params = useParams();
  const instituteId = (params?.instituteId as string) ?? "";

  const [step, setStep] = useState<Step>("screenshare");
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [micActive, setMicActive] = useState(false);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [statusText, setStatusText] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Screen share
  const [screenShareError, setScreenShareError] = useState("");
  const [screenShareStatus, setScreenShareStatus] = useState<"idle" | "sharing" | "error">("idle");
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Proctoring state
  const [violationWarning, setViolationWarning] = useState("");
  const [leaveCountdown, setLeaveCountdown] = useState<number | null>(null);
  const leaveViolationsRef = useRef(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoFailedRef = useRef(false);

  // WebSocket + WebAudio refs
  const wsRef             = useRef<WebSocket | null>(null);
  const playCtxRef        = useRef<AudioContext | null>(null);
  const micCtxRef         = useRef<AudioContext | null>(null);
  const processorRef      = useRef<ScriptProcessorNode | null>(null);
  const streamRef         = useRef<MediaStream | null>(null);
  const nextPlayTimeRef   = useRef(0);
  const sessionIdRef      = useRef<string>("");
  const activeSourcesRef  = useRef<AudioBufferSourceNode[]>([]);
  const isAISpeakingRef   = useRef(false);
  const playVersionRef    = useRef(0);
  const stopAllAudioRef   = useRef<() => void>(() => {});
  const hasResultRef      = useRef(false);

  // ── Submit zero score on cheating ────────────────────────────────────────────
  const submitZeroScore = useCallback(async () => {
    if (!assessmentData?.id || !instituteId) return;
    const totalMarks = assessmentData.questions.reduce((s, q) => s + q.marks, 0);
    try {
      await instituteService.submitVoiceAssessmentResult(instituteId, assessmentData.id, {
        score: 0,
        voiceResult: {
          totalScore: 0,
          totalMarks,
          grade: "F",
          passed: false,
          overallFeedback: "Assessment automatically failed: cheating violation detected during the session.",
          questionResults: assessmentData.questions.map((q) => ({
            questionId: q.id,
            question: q.question,
            studentAnswer: "",
            expectedAnswer: q.expected_answer,
            score: 0,
            marksAvailable: q.marks,
            percentage: 0,
            feedback: "Not evaluated — session terminated due to integrity violation.",
          })),
        },
      });
    } catch { /* silent — already shown auto-fail UI */ }
  }, [assessmentData, instituteId]);

  // ── Trigger auto-fail ────────────────────────────────────────────────────────
  const triggerAutoFail = useCallback(async () => {
    if (autoFailedRef.current) return;
    autoFailedRef.current = true;

    // Stop mic & WS
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    micCtxRef.current?.close().catch(() => {});
    micCtxRef.current = null;
    playVersionRef.current += 1;
    for (const src of activeSourcesRef.current) { try { src.stop(0); } catch (_) {} }
    activeSourcesRef.current = [];
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) wsRef.current.close();
    wsRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());

    setStep("autofailed");
    setAvatarState("idle");
    setMicActive(false);

    await submitZeroScore();
  }, [submitZeroScore]);

  // ── Stop all queued/playing AI audio ────────────────────────────────────────
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

  // ── Stop mic only ────────────────────────────────────────────────────────────
  const stopMic = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    micCtxRef.current?.close().catch(() => {});
    micCtxRef.current = null;
    setMicActive(false);
  }, []);

  // ── Reset on open/close ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && assessmentData) {
      setStep("screenshare");
      setAvatarState("idle");
      setMicActive(false);
      setEvalResult(null);
      setErrorMsg("");
      setStatusText("");
      setScreenShareError("");
      setScreenShareStatus("idle");
      setViolationWarning("");
      setLeaveCountdown(null);
      leaveViolationsRef.current = 0;
      autoFailedRef.current = false;
      hasResultRef.current = false;
    }
    if (!isOpen) {
      disconnect();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, assessmentData?.id]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => () => { disconnect(); }, []);

  // ── Disconnect helper ────────────────────────────────────────────────────────
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
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
  }, []);

  // ── Screen share liveness + tab-switch proctoring (active during session) ────
  useEffect(() => {
    if (step !== "session") return;

    // 1. Screen share liveness — check every 5 s
    const livenessCheck = setInterval(() => {
      const stream = screenStreamRef.current;
      if (!stream) {
        triggerAutoFail();
        return;
      }
      const allEnded = stream.getTracks().every((t) => t.readyState === "ended");
      if (allEnded) {
        triggerAutoFail();
      }
    }, 5_000);

    // 2. Tab / window switch — countdown + auto-fail
    const COUNTDOWN_SECS = 10;

    const startCountdown = () => {
      if (countdownRef.current || autoFailedRef.current) return;
      setLeaveCountdown(COUNTDOWN_SECS);
      countdownRef.current = setInterval(() => {
        setLeaveCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownRef.current!);
            countdownRef.current = null;
            if (!autoFailedRef.current) triggerAutoFail();
            return null;
          }
          return prev - 1;
        });
      }, 1_000);
    };

    const clearCountdown = () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
        setLeaveCountdown(null);
        leaveViolationsRef.current += 1;
        const n = leaveViolationsRef.current;
        if (n >= 2 && !autoFailedRef.current) {
          triggerAutoFail();
        } else {
          setViolationWarning(
            `⚠️ Violation #${n}: You left the assessment window. ${
              n >= 1
                ? "Leave again and your assessment will be TERMINATED immediately."
                : "FINAL WARNING."
            }`
          );
          setTimeout(() => setViolationWarning(""), 9_000);
        }
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") startCountdown();
      else clearCountdown();
    };

    const onBlur = () => startCountdown();
    const onFocus = () => clearCountdown();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(livenessCheck);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [step, triggerAutoFail]);

  // ── Request screen share ─────────────────────────────────────────────────────
  const requestScreenShare = useCallback(async () => {
    setScreenShareError("");
    setScreenShareStatus("idle");
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { cursor: "always", displaySurface: "monitor" },
        audio: false,
      });

      const track = stream.getVideoTracks()[0];
      const surface = (track?.getSettings() as MediaTrackSettings & { displaySurface?: string })?.displaySurface;

      if (surface && surface !== "monitor") {
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        const what = surface === "browser" ? "a browser tab" : "an application window";
        setScreenShareError(
          `You shared ${what} instead of your entire screen. ` +
          "Please click 'Share Screen & Continue', open the 'Entire Screen' tab in the picker, and select your monitor."
        );
        setScreenShareStatus("error");
        return;
      }

      // Watch for the student stopping the share externally (clicking browser stop button)
      track?.addEventListener("ended", () => {
        if (step === "session" && !autoFailedRef.current) {
          triggerAutoFail();
        }
      });

      screenStreamRef.current = stream;
      setScreenShareStatus("sharing");
      setStep("intro");
    } catch {
      setScreenShareError("Screen sharing was denied or cancelled. It is required to take this assessment.");
      setScreenShareStatus("error");
    }
  }, [step, triggerAutoFail]);

  // ── Playback PCM audio from model ────────────────────────────────────────────
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
    }, (err) => {
      console.error("[VAP] decodeAudioData failed:", err);
    });
  }, []);

  // ── Parse incoming events from voice agent ───────────────────────────────────
  const handleEvent = useCallback((event: Record<string, unknown>) => {
    if (event.interrupted === true) {
      stopAllAudio();
      return;
    }

    const content = event?.content as Record<string, unknown> | undefined;
    const parts = (content?.parts as unknown[]) ?? [];

    for (const part of parts) {
      const p = part as Record<string, unknown>;

      const inlineData = p?.inlineData as Record<string, unknown> | undefined;
      if (inlineData?.data && typeof inlineData.data === "string") {
        enqueueAudio(inlineData.data);
      }

      const fnResp = p?.functionResponse as Record<string, unknown> | undefined;
      if (fnResp?.name === "evaluate_voice_assessment") {
        const response = fnResp.response as EvalResult | { error: string } | undefined;
        if (response && !("error" in response)) {
          const result = response as EvalResult;
          hasResultRef.current = true;
          setEvalResult(result);
          setStep("results");
          setAvatarState("idle");
          setMicActive(false);

          if (assessmentData?.id && instituteId) {
            setSaveStatus("saving");
            instituteService.submitVoiceAssessmentResult(instituteId, assessmentData.id, {
              score: result.percentage,
              voiceResult: {
                totalScore: result.total_score,
                totalMarks: result.total_marks,
                grade: result.grade,
                passed: result.passed,
                overallFeedback: result.overall_feedback,
                questionResults: result.results.map((r) => ({
                  questionId: r.question_id,
                  question: r.question,
                  studentAnswer: r.student_answer,
                  expectedAnswer: r.expected_answer,
                  score: r.score,
                  marksAvailable: r.marks_available,
                  percentage: r.percentage,
                  feedback: r.feedback,
                })),
              },
            })
              .then(() => { setSaveStatus("saved"); onCompleted?.(result); })
              .catch(() => setSaveStatus("error"));
          } else {
            onCompleted?.(result);
          }
        } else if (response && "error" in response) {
          setErrorMsg((response as { error: string }).error);
          setStep("error");
        }
      }
    }
  }, [enqueueAudio, stopAllAudio, assessmentData, instituteId, onCompleted]);

  // ── Connect to voice agent ───────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (!assessmentData || !instituteId) return;

    // Guard: screen share must still be active
    const stream = screenStreamRef.current;
    if (!stream || stream.getTracks().every((t) => t.readyState === "ended")) {
      setScreenShareError("Screen share was stopped. Please restart the assessment and share your screen.");
      setStep("screenshare");
      return;
    }

    setStep("connecting");
    setStatusText("Connecting to AI assessor…");

    const playCtx = new AudioContext();
    playCtxRef.current = playCtx;
    nextPlayTimeRef.current = playCtx.currentTime;

    const userId = authService.getUserId() ?? "student";
    const sessionId = `va-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionIdRef.current = sessionId;

    const voiceAgentWs = process.env.NEXT_PUBLIC_VOICE_AGENT_WS_URL ?? "ws://localhost:5001/voice-agent";
    const wsUrl = `${voiceAgentWs}/ws/${instituteId}/${userId}/${sessionId}`;

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
      setStatusText("Setting up audio…");

      let micStream: MediaStream;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
        streamRef.current = micStream;
      } catch {
        setErrorMsg("Microphone access denied. Please allow microphone access and try again.");
        setStep("error");
        ws.close();
        return;
      }

      const micCtx = new AudioContext({ sampleRate: 16000 });
      micCtxRef.current = micCtx;

      const source = micCtx.createMediaStreamSource(micStream);
      const processor = micCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      const BARGE_IN_THRESHOLD = 0.022;
      const BARGE_IN_FRAMES    = 2;
      let bargeInCount = 0;

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        const samples = e.inputBuffer.getChannelData(0);

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(float32ToInt16(samples));
        }

        if (isAISpeakingRef.current) {
          let sum = 0;
          for (let k = 0; k < samples.length; k++) sum += samples[k] * samples[k];
          if (Math.sqrt(sum / samples.length) > BARGE_IN_THRESHOLD) {
            bargeInCount++;
            if (bargeInCount >= BARGE_IN_FRAMES) {
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

      ws.send(JSON.stringify({
        type: "assessment_init",
        data: {
          title: assessmentData.title,
          instructions: assessmentData.instructions ?? "",
          questions: assessmentData.questions,
        },
      }));

      setStep("session");
      setAvatarState("listening");
      setStatusText("Assessment started — listen for the AI assessor");
    };

    ws.onmessage = (evt) => {
      if (typeof evt.data === "string") {
        try {
          const parsed = JSON.parse(evt.data);
          handleEvent(parsed);
        } catch { /* ignore malformed */ }
      }
    };

    ws.onerror = () => {
      setErrorMsg("Connection error. Check that the voice agent is running.");
      setStep("error");
    };

    ws.onclose = (e) => {
      setMicActive(false);
      if (!hasResultRef.current && e.code !== 1000 && !autoFailedRef.current) {
        setErrorMsg(`Connection closed (${e.code}). The session may have ended.`);
        setStep("error");
      }
    };
  }, [assessmentData, instituteId, handleEvent]);

  if (!isOpen || !assessmentData) return null;

  const totalMarks = assessmentData.questions.reduce((s, q) => s + q.marks, 0);

  // ─── Render ──────────────────────────────────────────────────────────────────
  const modal = (
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">

      {/* ── Leave countdown overlay ── */}
      {leaveCountdown !== null && step === "session" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/95 px-4" style={{ zIndex: 10000000 }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center">
            <div className="relative w-28 h-28 mx-auto mb-5">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
                <circle cx="56" cy="56" r="48" fill="none" stroke="#fee2e2" strokeWidth="8" />
                <circle
                  cx="56" cy="56" r="48" fill="none"
                  stroke="#ef4444" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 48}`}
                  strokeDashoffset={`${2 * Math.PI * 48 * (1 - leaveCountdown / 10)}`}
                  style={{ transition: "stroke-dashoffset 0.9s linear" }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-4xl font-black text-red-600 dark:text-red-400">
                {leaveCountdown}
              </span>
            </div>
            <p className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">You Left the Assessment!</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Switching windows is <strong>not allowed</strong> during a voice assessment.<br />
              Return immediately — your assessment will be{" "}
              <span className="font-semibold text-red-500">automatically terminated and scored 0</span> in{" "}
              <span className="font-black text-red-600">{leaveCountdown}</span> second{leaveCountdown !== 1 ? "s" : ""}.
            </p>
          </div>
        </div>
      )}

      <div
        className="bg-white dark:bg-gray-950 rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ maxHeight: "92vh" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-widest">
              AI Voice Assessment
            </p>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {assessmentData.title}
            </h2>
          </div>

          {/* Connection / proctoring status */}
          <div className="flex items-center gap-2 text-xs">
            {step === "session" && (
              <>
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  Live
                </span>
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />
                  Screen Shared
                </span>
              </>
            )}
            {step === "connecting" && (
              <><FiLoader className="w-3.5 h-3.5 animate-spin text-gray-400" /><span className="text-gray-500">Connecting</span></>
            )}
            {step === "error" && (
              <><FiWifiOff className="w-3.5 h-3.5 text-red-500" /><span className="text-red-500">Error</span></>
            )}
          </div>

          <button
            onClick={() => { disconnect(); onClose(); }}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* ── Screen Share Gate ── */}
        {step === "screenshare" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <FiMonitor className="w-8 h-8 text-blue-500" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Screen Share Required</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                This voice assessment requires full-screen sharing for proctoring.
              </p>
            </div>

            <div className="w-full max-w-sm text-left rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-5 space-y-3">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Steps</p>
              {[
                { n: 1, text: 'Click "Share Screen & Continue" below' },
                { n: 2, text: 'In the browser picker, select the "Entire Screen" or "Screen" tab — NOT a Window or Tab' },
                { n: 3, text: "Click your monitor thumbnail, then click \"Share\"" },
              ].map(({ n, text }) => (
                <div key={n} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {n}
                  </span>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{text}</p>
                </div>
              ))}
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium pt-1">
                ⚠ Stopping the share or switching apps during the assessment will result in an immediate 0 score.
              </p>
            </div>

            {screenShareError && (
              <div className="w-full max-w-sm rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 text-left">
                {screenShareError}
              </div>
            )}

            <div className="flex gap-3 w-full max-w-sm">
              <button
                onClick={() => { disconnect(); onClose(); }}
                className="flex-1 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={requestScreenShare}
                disabled={screenShareStatus === "sharing"}
                className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {screenShareStatus === "sharing" ? "Sharing…" : "Share Screen & Continue"}
              </button>
            </div>
          </div>
        )}

        {/* ── Intro ── */}
        {step === "intro" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center overflow-y-auto">
            <Avatar state="idle" />
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{assessmentData.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {assessmentData.questions.length} question{assessmentData.questions.length !== 1 ? "s" : ""} · {totalMarks} total marks
              </p>
            </div>

            {/* Screen share confirmed badge */}
            <div className="flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />
              Screen sharing active — proctoring enabled
            </div>

            <div className="w-full max-w-sm text-left rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-5 space-y-2.5">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">How it works</p>
              {[
                { icon: <FiVolume2 className="w-3.5 h-3.5 text-purple-500 mt-0.5 shrink-0" />, text: "AI assessor will ask each question aloud via voice" },
                { icon: <FiMic className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />, text: "Your microphone streams directly — speak clearly" },
                { icon: <FiAward className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />, text: "AI grades all answers and gives detailed feedback at the end" },
              ].map(({ icon, text }, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  {icon}
                  <p className="text-xs text-gray-600 dark:text-gray-400">{text}</p>
                </div>
              ))}
              <p className="text-xs text-red-600 dark:text-red-400 font-medium pt-1">
                🚫 Switching tabs/apps or stopping screen share triggers an automatic 0 score.
              </p>
            </div>

            <button
              onClick={connect}
              className="w-full max-w-sm py-3 rounded-2xl text-sm font-bold text-white bg-linear-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/25"
            >
              Start Voice Assessment
            </button>
          </div>
        )}

        {/* ── Connecting ── */}
        {step === "connecting" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-5 text-center">
            <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <FiLoader className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{statusText}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This may take a few seconds</p>
            </div>
          </div>
        )}

        {/* ── Live session ── */}
        {step === "session" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center">
            <Avatar state={avatarState} />

            {/* Violation warning banner */}
            {violationWarning && (
              <div className="w-full rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-300 font-medium">
                {violationWarning}
              </div>
            )}

            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {avatarState === "speaking" ? "AI assessor is speaking…" :
                 avatarState === "listening" ? "Listening to your answer…" : "Waiting…"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Speak naturally — the AI will guide you through each question
              </p>
            </div>

            <div className="w-full max-w-xs space-y-3">
              <Waveform active={avatarState === "speaking"} color="purple" />
              <Waveform active={micActive && avatarState === "listening"} color="green" />
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {micActive ? (
                  <><FiMic className="w-3.5 h-3.5 text-green-500" /><span>Microphone active</span></>
                ) : (
                  <><FiMicOff className="w-3.5 h-3.5 text-red-400" /><span>Microphone off</span></>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  stopMic();
                  stopAllAudio();
                  wsRef.current.send(JSON.stringify({ type: "end_assessment" }));
                  setStep("evaluating");
                  setAvatarState("idle");
                  setStatusText("Evaluating your answers…");
                } else {
                  disconnect();
                  setStep("intro");
                }
              }}
              className="text-xs text-gray-400 hover:text-red-500 underline transition-colors"
            >
              End session
            </button>
          </div>
        )}

        {/* ── Evaluating ── */}
        {step === "evaluating" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-5 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <FiLoader className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Evaluating your answers…</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">AI is reviewing your responses</p>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {step === "results" && evalResult && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {saveStatus === "saving" && (
              <p className="text-xs text-center text-gray-400 animate-pulse">Saving results…</p>
            )}
            {saveStatus === "saved" && (
              <p className="text-xs text-center text-green-600 dark:text-green-400">✓ Results saved</p>
            )}
            {saveStatus === "error" && (
              <p className="text-xs text-center text-amber-600 dark:text-amber-400">Results could not be saved (already attempted or network error)</p>
            )}

            <div className={`rounded-2xl border p-5 ${
              evalResult.passed
                ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                : "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-2xl font-bold ${evalResult.passed ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                    {evalResult.total_score} / {evalResult.total_marks}
                    <span className="text-base font-semibold ml-2">({evalResult.percentage}%)</span>
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{evalResult.overall_feedback}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${
                  evalResult.passed
                    ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                }`}>
                  {evalResult.grade}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {evalResult.results.map((r, i) => (
                <div key={r.question_id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {i + 1}. {r.question}
                    </p>
                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                      r.percentage >= 70
                        ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                        : r.percentage >= 40
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300"
                        : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                    }`}>
                      {r.score}/{r.marks_available}
                    </span>
                  </div>
                  {r.student_answer && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-1.5">
                      Your answer: &quot;{r.student_answer}&quot;
                    </p>
                  )}
                  {r.feedback && (
                    <p className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                      {r.feedback}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => { disconnect(); onClose(); }}
              className="w-full py-3 rounded-2xl text-sm font-bold text-white bg-linear-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 transition-all"
            >
              Close
            </button>
          </div>
        )}

        {/* ── Auto-failed (cheating detected) ── */}
        {step === "autofailed" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-red-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">Assessment Terminated</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
                A cheating violation was detected (screen share stopped or you switched away from this window).
                Your assessment has been automatically scored <strong className="text-red-500">0 marks</strong>.
              </p>
            </div>
            <button
              onClick={() => { disconnect(); onClose(); }}
              className="w-full max-w-xs py-2.5 rounded-2xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* ── Error ── */}
        {step === "error" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-5 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <FiAlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Something went wrong</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 max-w-xs">{errorMsg}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { disconnect(); setStep("screenshare"); setErrorMsg(""); autoFailedRef.current = false; }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-purple-500 hover:bg-purple-600 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => { disconnect(); onClose(); }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
