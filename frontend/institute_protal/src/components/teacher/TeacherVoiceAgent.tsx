"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FiMic, FiMicOff, FiX, FiVolume2, FiLoader, FiMessageCircle,
} from "react-icons/fi";
import { authService } from "@/services/authService";

// ─── PCM audio helpers ────────────────────────────────────────────────────────

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

function Waveform({ active }: { active: boolean }) {
  const bars = [30, 55, 80, 50, 90, 65, 40, 75, 45, 85, 50, 70];
  return (
    <div className="flex items-center justify-center gap-0.5 h-7">
      {bars.map((h, i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-all ${active ? "bg-violet-400" : "bg-gray-300 dark:bg-gray-600"}`}
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
    state === "speaking"  ? "ring-violet-400 shadow-violet-400/40"  :
    state === "listening" ? "ring-emerald-400 shadow-emerald-400/40" :
                            "ring-gray-200 dark:ring-gray-700 shadow-transparent";
  return (
    <div className="relative flex items-center justify-center">
      {state !== "idle" && (
        <span
          className={`absolute inset-0 rounded-full ${
            state === "speaking" ? "bg-violet-400/20" : "bg-emerald-400/20"
          } animate-ping`}
          style={{ borderRadius: "50%" }}
        />
      )}
      <div
        className={`relative w-20 h-20 rounded-full ring-4 shadow-lg transition-all duration-500 ${ring}
          bg-linear-to-br from-violet-500 via-violet-600 to-purple-700 flex items-center justify-center`}
      >
        {state === "speaking"  ? <FiVolume2 className="w-9 h-9 text-white" /> :
         state === "listening" ? <FiMic     className="w-9 h-9 text-white" /> :
                                 <FiMessageCircle className="w-9 h-9 text-white/80" />}
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TeacherVoiceAgentProps {
  isOpen: boolean;
  onClose: () => void;
  instituteId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TeacherVoiceAgent({ isOpen, onClose, instituteId }: TeacherVoiceAgentProps) {
  type Step = "connecting" | "session" | "error";

  const [step, setStep]               = useState<Step>("connecting");
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [micActive, setMicActive]     = useState(false);
  const [errorMsg, setErrorMsg]       = useState("");
  const [captionText, setCaptionText] = useState("");

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

  // ── Audio ─────────────────────────────────────────────────────────────────

  const stopAllAudio = useCallback(() => {
    playVersionRef.current += 1;
    for (const src of activeSourcesRef.current) { try { src.stop(0); } catch (_) {} }
    activeSourcesRef.current = [];
    const ctx = playCtxRef.current;
    nextPlayTimeRef.current = ctx ? ctx.currentTime : 0;
    isAISpeakingRef.current = false;
    setAvatarState((prev) => prev === "speaking" ? "listening" : prev);
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
    const pcmBuf  = base64ToArrayBuffer(base64Pcm);
    const wavBuf  = pcmToWav(pcmBuf, 24000);

    ctx.decodeAudioData(wavBuf, (audioBuffer) => {
      if (playVersionRef.current !== version) return;
      const now     = ctx.currentTime;
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
          setAvatarState((prev) => prev === "speaking" ? "listening" : prev);
        }
      };
    }, (err) => console.error("[TVA] decodeAudioData:", err));
  }, []);

  // ── Event handler ──────────────────────────────────────────────────────────

  const handleEvent = useCallback((event: Record<string, unknown>) => {
    if (event.interrupted === true) { stopAllAudio(); return; }

    if ((event as Record<string, unknown>).type === "reminder") {
      const parts = ((event?.content as Record<string, unknown>)?.parts as Array<Record<string, unknown>>) ?? [];
      for (const p of parts) if (typeof p.text === "string") setCaptionText(p.text);
      return;
    }

    const parts = (((event?.content as Record<string, unknown>)?.parts) as unknown[]) ?? [];
    for (const part of parts) {
      const p = part as Record<string, unknown>;
      const inlineData = p?.inlineData as Record<string, unknown> | undefined;
      if (inlineData?.data && typeof inlineData.data === "string") enqueueAudio(inlineData.data);
      if (typeof p?.text === "string" && p.text.trim()) setCaptionText(p.text.trim());
    }
  }, [enqueueAudio, stopAllAudio]);

  // ── Connect ────────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    setStep("connecting");
    setErrorMsg("");

    const playCtx = new AudioContext();
    playCtxRef.current   = playCtx;
    nextPlayTimeRef.current = playCtx.currentTime;

    const teacherId = authService.getUserId() ?? "teacher";
    const sessionId = `tva-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const voiceWsBase = process.env.NEXT_PUBLIC_VOICE_AGENT_WS_URL ?? "ws://localhost:5001/voice-agent";
    const wsUrl = `${voiceWsBase}/ws/teacher/${instituteId}/${teacherId}/${sessionId}`;

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

      const micCtx    = new AudioContext({ sampleRate: 16000 });
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
      setCaptionText("Connected! Ask me about your course materials.");
    };

    ws.onmessage = (evt) => {
      if (typeof evt.data !== "string") return;
      try { handleEvent(JSON.parse(evt.data)); } catch { /* ignore */ }
    };

    ws.onerror = () => {
      setErrorMsg("Connection error. Make sure the voice agent server is running.");
      setStep("error");
    };

    ws.onclose = (e) => {
      setMicActive(false);
      if (e.code !== 1000 && step === "session") {
        setErrorMsg(`Session closed (${e.code}).`);
        setStep("error");
      }
    };
  }, [instituteId, handleEvent, step]);

  useEffect(() => {
    if (isOpen) connect();
    else disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => () => { disconnect(); }, [disconnect]);

  const handleClose = useCallback(() => { disconnect(); onClose(); }, [disconnect, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-1000000 flex items-end justify-end sm:items-center sm:justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Panel */}
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-gray-900 flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-linear-to-r from-violet-500 to-purple-600">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/20">
            <FiMessageCircle className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">AI Teaching Assistant</p>
            <p className="text-white/70 text-xs mt-0.5">
              {step === "connecting" ? "Connecting…"               :
               step === "session"   ? "Voice · Course Materials"   :
               step === "error"     ? "Connection error"           : ""}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/20 text-white transition-colors"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Connecting */}
        {step === "connecting" && (
          <div className="flex flex-col items-center justify-center gap-4 py-14 px-5">
            <FiLoader className="w-10 h-10 text-violet-500 animate-spin" />
            <p className="text-sm font-medium text-gray-700 dark:text-white">Connecting to AI assistant…</p>
          </div>
        )}

        {/* Active session */}
        {step === "session" && (
          <div className="flex flex-col items-center gap-5 py-8 px-6">
            <Avatar state={avatarState} />

            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${
                avatarState === "speaking"  ? "bg-violet-500 animate-pulse"   :
                avatarState === "listening" ? "bg-emerald-500 animate-pulse"  :
                "bg-gray-300"
              }`} />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {avatarState === "speaking"  ? "AI is speaking"  :
                 avatarState === "listening" ? "Listening…"      :
                 "Idle"}
              </span>
            </div>

            <div className="w-full px-4">
              <Waveform active={avatarState === "speaking"} />
            </div>

            {captionText && (
              <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm text-gray-700 dark:text-gray-200 text-center leading-relaxed min-h-[52px] max-h-28 overflow-y-auto">
                {captionText}
              </div>
            )}

            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              micActive
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500"
            }`}>
              {micActive ? <FiMic className="w-3.5 h-3.5" /> : <FiMicOff className="w-3.5 h-3.5" />}
              {micActive ? "Microphone on" : "Microphone off"}
            </div>

            <button
              onClick={handleClose}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-all py-2.5 text-sm font-medium"
            >
              <FiX className="w-4 h-4" /> End Conversation
            </button>
          </div>
        )}

        {/* Error */}
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
                onClick={connect}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition-colors"
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
