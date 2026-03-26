"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createPortal } from "react-dom";
import { instituteService } from "@/services/instituteService";
import {
  FiMic, FiMicOff, FiX, FiAward, FiAlertCircle,
  FiVolume2, FiLoader, FiWifi, FiWifiOff,
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
  // Normalize URL-safe base64 → standard, then fix padding
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

type Step = "intro" | "connecting" | "session" | "evaluating" | "results" | "error";

export default function VoiceAssessmentPlayer({
  isOpen, onClose, assessmentData, onCompleted,
}: VoiceAssessmentPlayerProps) {
  const params = useParams();
  const instituteId = (params?.instituteId as string) ?? "";

  const [step, setStep] = useState<Step>("intro");
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [micActive, setMicActive] = useState(false);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [statusText, setStatusText] = useState("");
  const [audioChunks, setAudioChunks] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // WebSocket + WebAudio refs
  // playCtxRef:       dedicated playback context (created on button click, always running)
  // micCtxRef:        mic capture context (16 kHz, created after getUserMedia)
  // activeSourcesRef: all scheduled AudioBufferSourceNodes — stopped on barge-in
  // isAISpeakingRef:  true while AI audio is queued/playing — gates local VAD barge-in
  // playVersionRef:   incremented on interruption to discard in-flight decodeAudioData
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
  // Stable ref so onaudioprocess closure can call stopAllAudio without stale capture
  const stopAllAudioRef   = useRef<() => void>(() => {});

  // ── Stop all queued/playing AI audio (barge-in or interruption) ─────────────
  const stopAllAudio = useCallback(() => {
    playVersionRef.current += 1;                       // invalidate in-flight decodes
    for (const src of activeSourcesRef.current) {
      try { src.stop(0); } catch (_) {}                // safe even if already ended
    }
    activeSourcesRef.current = [];
    const ctx = playCtxRef.current;
    nextPlayTimeRef.current = ctx ? ctx.currentTime : 0;
    isAISpeakingRef.current = false;
    setAvatarState((prev) => (prev === "speaking" ? "listening" : prev));
  }, []);

  // Keep stopAllAudioRef current so onaudioprocess closure can call it without
  // capturing a stale reference (onaudioprocess is created once in ws.onopen).
  stopAllAudioRef.current = stopAllAudio;

  // ── Reset on open/close ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && assessmentData) {
      setStep("intro");
      setAvatarState("idle");
      setMicActive(false);
      setEvalResult(null);
      setErrorMsg("");
      setStatusText("");
    }
    if (!isOpen) {
      disconnect();
    }
  }, [isOpen, assessmentData?.id]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => () => { disconnect(); }, []);

  // ── Disconnect helper ────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    // Stop any buffered AI audio first
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
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
    nextPlayTimeRef.current = 0;
    setAudioChunks(0);
    setMicActive(false);
  }, []);

  // ── Playback PCM audio from model ────────────────────────────────────────────
  const enqueueAudio = useCallback((base64Pcm: string) => {
    const ctx = playCtxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    isAISpeakingRef.current = true;
    setAvatarState("speaking");

    // Snapshot the current play-version so we can discard this chunk if a
    // barge-in/interruption happens before decodeAudioData finishes.
    const version = playVersionRef.current;

    const pcmBuf = base64ToArrayBuffer(base64Pcm);
    const wavBuf = pcmToWav(pcmBuf, 24000);

    ctx.decodeAudioData(wavBuf, (audioBuffer) => {
      // Stale — an interruption occurred while we were decoding; discard.
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
        // Only switch to listening once all buffered audio has drained
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
    // Server-side interruption: Gemini detected the student speaking and cut the
    // model output — stop any locally-buffered AI audio immediately.
    if (event.interrupted === true) {
      stopAllAudio();
      return;
    }

    const content = event?.content as Record<string, unknown> | undefined;
    const parts = (content?.parts as unknown[]) ?? [];

    for (const part of parts) {
      const p = part as Record<string, unknown>;

      // PCM audio from model
      const inlineData = p?.inlineData as Record<string, unknown> | undefined;
      if (inlineData?.data && typeof inlineData.data === "string") {
        console.log("[VAP] audio chunk received, size:", inlineData.data.length);
        enqueueAudio(inlineData.data);
      }

      // Evaluation tool result — sent back when voice agent calls evaluate_voice_assessment
      const fnResp = p?.functionResponse as Record<string, unknown> | undefined;
      if (fnResp?.name === "evaluate_voice_assessment") {
        const response = fnResp.response as EvalResult | { error: string } | undefined;
        if (response && !("error" in response)) {
          const result = response as EvalResult;
          setEvalResult(result);
          setStep("results");
          setAvatarState("idle");
          setMicActive(false);

          // Persist result to backend
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

  }, [enqueueAudio, stopAllAudio]);

  // ── Connect to voice agent ───────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (!assessmentData || !instituteId) return;
    setStep("connecting");
    setStatusText("Connecting to AI assessor…");

    // Create the PLAYBACK AudioContext synchronously inside the user-gesture
    // handler so the browser never auto-suspends it before audio arrives.
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

      // Request microphone
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
        streamRef.current = stream;
      } catch {
        setErrorMsg("Microphone access denied. Please allow microphone access and try again.");
        setStep("error");
        ws.close();
        return;
      }

      // Dedicated mic context at 16 kHz — separate from the playback context
      // so mic capture never echoes through the speakers.
      const micCtx = new AudioContext({ sampleRate: 16000 });
      micCtxRef.current = micCtx;

      const source = micCtx.createMediaStreamSource(stream);
      const processor = micCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      // Frames of consecutive speech above threshold required to trigger barge-in.
      // At 2048 samples / 16kHz = 128 ms per frame; 2 frames ≈ 256 ms.
      const BARGE_IN_THRESHOLD = 0.022;
      const BARGE_IN_FRAMES    = 2;
      let bargeInCount = 0;

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        const samples = e.inputBuffer.getChannelData(0);

        // Stream PCM to the voice agent
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(float32ToInt16(samples));
        }

        // ── Local barge-in VAD ─────────────────────────────────────────────
        // When the AI is playing audio and the student starts speaking loudly
        // enough, immediately stop all queued AI audio without waiting for the
        // server round-trip. The server's own VAD will also interrupt the model
        // and send an `interrupted` event to clean up any remaining buffers.
        if (isAISpeakingRef.current) {
          let sum = 0;
          for (let k = 0; k < samples.length; k++) sum += samples[k] * samples[k];
          if (Math.sqrt(sum / samples.length) > BARGE_IN_THRESHOLD) {
            bargeInCount++;
            if (bargeInCount >= BARGE_IN_FRAMES) {
              bargeInCount = 0;
              stopAllAudioRef.current();   // stop via stable ref — closure-safe
            }
          } else {
            bargeInCount = 0;
          }
        } else {
          bargeInCount = 0;
        }
      };

      // Connect to a silent gain node (not destination) so onaudioprocess fires
      // without routing mic audio to the speakers.
      const silence = micCtx.createGain();
      silence.gain.value = 0;
      source.connect(processor);
      processor.connect(silence);
      silence.connect(micCtx.destination);
      setMicActive(true);

      // Send assessment context to voice agent
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
          console.log("[VAP] WS message received, type:", typeof evt.data, "keys:", Object.keys(parsed));
          handleEvent(parsed);
        } catch { /* ignore malformed */ }
      } else {
        console.log("[VAP] WS binary message, size:", (evt.data as ArrayBuffer).byteLength);
      }
    };

    ws.onerror = () => {
      setErrorMsg("Connection error. Check that the voice agent is running.");
      setStep("error");
    };

    ws.onclose = (e) => {
      setMicActive(false);
      if (step !== "results" && e.code !== 1000) {
        setErrorMsg(`Connection closed (${e.code}). The session may have ended.`);
        setStep("error");
      }
    };
  }, [assessmentData, instituteId, handleEvent, step]);

  if (!isOpen || !assessmentData) return null;

  const totalMarks = assessmentData.questions.reduce((s, q) => s + q.marks, 0);

  // ─── Render ──────────────────────────────────────────────────────────────────
  const modal = (
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
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

          {/* Connection status */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            {step === "session" ? (
              <><FiWifi className="w-3.5 h-3.5 text-green-500" /><span className="text-green-600 dark:text-green-400">Live</span></>
            ) : step === "connecting" ? (
              <><FiLoader className="w-3.5 h-3.5 animate-spin" /><span>Connecting</span></>
            ) : step === "error" ? (
              <><FiWifiOff className="w-3.5 h-3.5 text-red-500" /><span className="text-red-500">Error</span></>
            ) : null}
          </div>

          <button
            onClick={() => { disconnect(); onClose(); }}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

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
              onClick={() => { disconnect(); setStep("intro"); }}
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
            {/* Save status */}
            {saveStatus === "saving" && (
              <p className="text-xs text-center text-gray-400 animate-pulse">Saving results…</p>
            )}
            {saveStatus === "saved" && (
              <p className="text-xs text-center text-green-600 dark:text-green-400">✓ Results saved</p>
            )}
            {saveStatus === "error" && (
              <p className="text-xs text-center text-amber-600 dark:text-amber-400">Results could not be saved (already attempted or network error)</p>
            )}

            {/* Score banner */}
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

            {/* Per-question breakdown */}
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
                      Your answer: "{r.student_answer}"
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
                onClick={() => { disconnect(); setStep("intro"); setErrorMsg(""); }}
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
