"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Course, instituteService } from "@/services/instituteService";
import { authService } from "@/services/authService";

export interface StudentContext {
  student_name?: string;
  institute_name?: string;
  course_count?: number;
  selected_course?: string;
}

export interface QuestionResult {
  question_id: string;
  question: string;
  student_answer: string;
  expected_answer: string;
  score: number;
  marks_available: number;
  percentage: number;
  feedback: string;
}

export interface EvalResult {
  results: QuestionResult[];
  total_score: number;
  total_marks: number;
  percentage: number;
  grade: string;
  passed: boolean;
  overall_feedback: string;
}

export interface VoiceModalProps {
  isDark: boolean;
  instituteLogo: string | null;
  context: StudentContext;
  selectedCourse: Course | null;
  instituteId: string;
  onClose: () => void;
  /** Override the WebSocket URL — if omitted, uses the default course-qa endpoint */
  wsUrl?: string;
  /** Label shown under the course pill (e.g. "Interview") */
  label?: string;
  /** JSON message sent over WebSocket immediately after connection (e.g. assessment_init) */
  initMessage?: Record<string, unknown>;
  /** Content ID used to submit evaluation results to the backend */
  assessmentId?: string;
  /** Called with the evaluation result when the voice agent finishes scoring */
  onCompleted?: (result: EvalResult) => void;
}

// ─── PCM / WAV helpers ────────────────────────────────────────────────────────

function float32ToInt16(buffer: Float32Array): ArrayBuffer {
  const out = new Int16Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out.buffer;
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const std    = b64.replace(/-/g, "+").replace(/_/g, "/");
  const padded = std + "=".repeat((4 - (std.length % 4)) % 4);
  const binary = atob(padded);
  const buf    = new ArrayBuffer(binary.length);
  const view   = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buf;
}



// ─── Component ────────────────────────────────────────────────────────────────

type Step        = "connecting" | "session" | "error";
type AvatarState = "idle" | "speaking" | "listening";

export default function VoiceModal({
  isDark, instituteLogo, context, selectedCourse, instituteId, onClose,
  wsUrl: wsUrlProp, label, initMessage, assessmentId, onCompleted,
}: VoiceModalProps) {
  const [step, setStep]               = useState<Step>("connecting");
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [micMuted, setMicMuted]       = useState(false);
  const [errorMsg, setErrorMsg]       = useState("");
  const instName = context.institute_name ?? "";
  const instLogo = instituteLogo ?? "";
  const [screenSharing, setScreenSharing] = useState(false);

  // Generation counter — incremented on disconnect to cancel stale in-flight connects
  const connectGenRef    = useRef(0);
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
  // Analyser + animation refs
  const micAnalyserRef   = useRef<AnalyserNode | null>(null);
  const playAnalyserRef  = useRef<AnalyserNode | null>(null);
  const playMasterRef    = useRef<GainNode | null>(null);
  const orbRef           = useRef<HTMLDivElement>(null);
  const animFrameRef     = useRef<number>(0);
  // Screen share refs
  const screenStreamRef  = useRef<MediaStream | null>(null);
  const screenVideoRef   = useRef<HTMLVideoElement>(null);
  const screenCanvasRef  = useRef<HTMLCanvasElement>(null);
  const screenIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Orb animation loop ────────────────────────────────────────────────────
  const startOrbAnimation = useCallback(() => {
    const micData  = new Uint8Array(256);
    const playData = new Uint8Array(256);

    function rms(data: Uint8Array): number {
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      return Math.sqrt(sum / data.length);
    }

    function loop() {
      animFrameRef.current = requestAnimationFrame(loop);
      let vol = 0;
      if (isAISpeakingRef.current && playAnalyserRef.current) {
        playAnalyserRef.current.getByteTimeDomainData(playData);
        vol = rms(playData);
      } else if (micAnalyserRef.current) {
        micAnalyserRef.current.getByteTimeDomainData(micData);
        vol = rms(micData);
      }
      const scale  = 1 + vol * 0.45;
      const spread = 30 + vol * 80;
      const blur   = 90 + vol * 120;
      const alpha  = 0.35 + vol * 0.45;
      if (orbRef.current) {
        orbRef.current.style.transform = `scale(${scale.toFixed(3)})`;
        orbRef.current.style.boxShadow =
          `0 ${spread}px ${blur}px rgba(59,130,246,${alpha.toFixed(3)}), inset 0 -12px 32px rgba(0,0,0,0.18)`;
      }
    }
    loop();
  }, []);

  // ── Audio: stop all playback ───────────────────────────────────────────────
  const stopAllAudio = useCallback(() => {
    playVersionRef.current += 1;
    for (const src of activeSourcesRef.current) { try { src.stop(0); } catch { /* ignore */ } }
    activeSourcesRef.current = [];
    const ctx = playCtxRef.current;
    nextPlayTimeRef.current = ctx ? ctx.currentTime : 0;
    isAISpeakingRef.current = false;
    setAvatarState((prev) => (prev === "speaking" ? "listening" : prev));
  }, []);
  stopAllAudioRef.current = stopAllAudio;

  // ── Audio: enqueue PCM chunk from agent ───────────────────────────────────
  const enqueueAudio = useCallback((base64Pcm: string) => {
    const ctx = playCtxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    isAISpeakingRef.current = true;
    setAvatarState("speaking");

    const version = playVersionRef.current;
    
    const rawBuf = base64ToArrayBuffer(base64Pcm);
    const int16Array = new Int16Array(rawBuf);
    const numSamples = int16Array.length;
    
    // Direct conversion to avoid async decoding overhead and latency
    const audioBuffer = ctx.createBuffer(1, numSamples, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < numSamples; i++) {
      channelData[i] = int16Array[i] / 32768.0;
    }

    if (playVersionRef.current !== version) return;
    const now     = ctx.currentTime;
    const startAt = Math.max(nextPlayTimeRef.current, now + 0.01);
    nextPlayTimeRef.current = startAt + audioBuffer.duration;
    const source  = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(playMasterRef.current ?? ctx.destination);
    activeSourcesRef.current.push(source);
    source.start(startAt);
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
      if (activeSourcesRef.current.length === 0 && playVersionRef.current === version) {
        isAISpeakingRef.current = false;
        setAvatarState((prev) => (prev === "speaking" ? "listening" : prev));
      }
    };
  }, []);

  // ── Parse WebSocket events ─────────────────────────────────────────────────
  const handleEvent = useCallback((event: Record<string, unknown>) => {
    if (event.interrupted === true) { stopAllAudio(); return; }

    if (event.type === "reminder") return;

    const parts = ((event.content as any)?.parts as any[]) ?? [];
    for (const p of parts) {
      if (p?.inlineData?.data) enqueueAudio(p.inlineData.data);

      // Evaluation result from voice agent
      const fnResp = p?.functionResponse as Record<string, unknown> | undefined;
      if (fnResp?.name === "evaluate_voice_assessment") {
        const response = fnResp.response as EvalResult | { error: string } | undefined;
        if (response && !("error" in response)) {
          const result = response as EvalResult;
          stopAllAudio();
          // Submit to backend if this is an assessment session
          if (assessmentId && instituteId) {
            instituteService.submitVoiceAssessmentResult(instituteId, assessmentId, {
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
            }).catch(() => {/* ignore save errors */});
          }
          onCompleted?.(result);
        }
      }
    }
  }, [enqueueAudio, stopAllAudio, assessmentId, instituteId, onCompleted]);

  // ── Disconnect everything ─────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (screenIntervalRef.current) { clearInterval(screenIntervalRef.current); screenIntervalRef.current = null; }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    cancelAnimationFrame(animFrameRef.current);
    playVersionRef.current += 1;
    for (const src of activeSourcesRef.current) { try { src.stop(0); } catch { /* ignore */ } }
    activeSourcesRef.current = [];
    isAISpeakingRef.current  = false;
    micAnalyserRef.current   = null;
    playAnalyserRef.current  = null;
    playMasterRef.current    = null;
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
    // Increment generation so any in-flight connect() bails out after its next await
    connectGenRef.current++;
  }, []);

  // ── Connect to voice agent ─────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (!selectedCourse) return;
    // Claim this generation — any previous in-flight connect with a smaller gen
    // will bail out after its next await, preventing React StrictMode double-sessions.
    const myGen = ++connectGenRef.current;
    setStep("connecting");
    setErrorMsg("");

    const playCtx      = new AudioContext();
    playCtxRef.current = playCtx;
    nextPlayTimeRef.current = playCtx.currentTime;
    // Master gain → analyser → destination for playback volume tracking
    const playMaster   = playCtx.createGain();
    const playAnalyser = playCtx.createAnalyser();
    playAnalyser.fftSize = 256;
    playMaster.connect(playAnalyser);
    playAnalyser.connect(playCtx.destination);
    playMasterRef.current  = playMaster;
    playAnalyserRef.current = playAnalyser;

    const userId    = authService.getUserId() ?? "student";
    const sessionId = `cva-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const wsBase    = process.env.NEXT_PUBLIC_VOICE_AGENT_WS_URL ?? "ws://localhost:5001/voice-agent";
    // Suppress backend greeting for assessment sessions — they send their own init prompt
    const greetParam = initMessage ? "&greet=false" : "";
    const wsUrl     = wsUrlProp ?? `${wsBase}/ws/course-qa/${instituteId}/${selectedCourse.id}/${userId}/${sessionId}?course_name=${encodeURIComponent(selectedCourse.name)}${greetParam}`;

    // Acquire mic permission before opening WS so both happen concurrently
    let preStream: MediaStream;
    try {
      preStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } as any,
      });
    } catch {
      setErrorMsg("Microphone access denied. Please allow microphone and try again.");
      setStep("error");
      return;
    }

    // Bail if disconnect() was called while getUserMedia was pending
    if (connectGenRef.current !== myGen) { preStream.getTracks().forEach((t) => t.stop()); return; }

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;
    } catch {
      preStream.getTracks().forEach((t) => t.stop());
      setErrorMsg("Failed to open WebSocket connection.");
      setStep("error");
      return;
    }

    ws.onopen = async () => {
      try {
        const stream = preStream;
        streamRef.current = stream;

        const micCtx  = new AudioContext({ sampleRate: 16000 });
        micCtxRef.current = micCtx;
        const source      = micCtx.createMediaStreamSource(stream);
        const micAnalyser = micCtx.createAnalyser();
        micAnalyser.fftSize = 256;
        micAnalyserRef.current = micAnalyser;
        const processor        = micCtx.createScriptProcessor(1024, 1, 1);
        processorRef.current = processor;

        const BARGE_IN_THRESHOLD = 0.022;
        const BARGE_IN_FRAMES    = 1;
        let bargeInCount = 0;

        const VAD_THRESHOLD = 0.01;
        const VAD_HANG_FRAMES = 7; // Half second hangover
        let vadSilenceCount = 0;

        processor.onaudioprocess = (e: AudioProcessingEvent) => {
          const samples = e.inputBuffer.getChannelData(0);
          
          let sum = 0;
          for (let k = 0; k < samples.length; k++) sum += samples[k] * samples[k];
          const rms = Math.sqrt(sum / samples.length);

          if (rms > VAD_THRESHOLD) {
            vadSilenceCount = 0;
          } else {
            vadSilenceCount++;
          }

          if (vadSilenceCount <= VAD_HANG_FRAMES) {
             if (ws.readyState === WebSocket.OPEN) ws.send(float32ToInt16(samples));
          }

          if (isAISpeakingRef.current) {
            if (rms > BARGE_IN_THRESHOLD) {
              if (++bargeInCount >= BARGE_IN_FRAMES) { bargeInCount = 0; stopAllAudioRef.current(); }
            } else { bargeInCount = 0; }
          } else { bargeInCount = 0; }
        };

        const silence = micCtx.createGain();
        silence.gain.value = 0;
        source.connect(micAnalyser);
        micAnalyser.connect(processor);
        processor.connect(silence);
        silence.connect(micCtx.destination);

        if (initMessage && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(initMessage));
        }

        startOrbAnimation();
        setStep("session");
        setAvatarState("listening");
      } catch (err) {
        setErrorMsg("Audio setup failed. Please refresh and try again.");
        setStep("error");
        ws.close();
      }
    };

    ws.onmessage = (evt) => {
      if (typeof evt.data !== "string") return;
      try { handleEvent(JSON.parse(evt.data)); } catch { /* ignore */ }
    };

    ws.onerror = () => {
      setErrorMsg("Connection error. Make sure the voice agent is running.");
      setStep("error");
    };

    ws.onclose = (e) => {
      if (e.code !== 1000) {
        setErrorMsg(`Session closed (${e.code}).`);
        setStep("error");
      }
    };
  }, [selectedCourse, instituteId, handleEvent, initMessage]);

  // ── Connect on mount, disconnect on unmount ────────────────────────────────
  useEffect(() => {
    connect();
    return () => { disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mute / unmute mic ─────────────────────────────────────────────────────
  async function toggleMute() {
    if (!micMuted) {
      // ── Mute: tear down mic pipeline fully so browser releases the mic ──
      processorRef.current?.disconnect();
      processorRef.current = null;
      micAnalyserRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      micCtxRef.current?.close().catch(() => {});
      micCtxRef.current = null;
      stopAllAudio();
      setMicMuted(true);
    } else {
      // ── Unmute: re-acquire mic and rebuild the audio pipeline ──
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } as any });
        streamRef.current = stream;

        const micCtx      = new AudioContext({ sampleRate: 16000 });
        micCtxRef.current = micCtx;
        const source      = micCtx.createMediaStreamSource(stream);
        const micAnalyser = micCtx.createAnalyser();
        micAnalyser.fftSize    = 256;
        micAnalyserRef.current = micAnalyser;
        const processor        = micCtx.createScriptProcessor(1024, 1, 1);
        processorRef.current   = processor;

        const ws = wsRef.current;
        const BARGE_IN_THRESHOLD = 0.022;
        const BARGE_IN_FRAMES    = 1;
        let bargeInCount = 0;

        const VAD_THRESHOLD = 0.01;
        const VAD_HANG_FRAMES = 7; 
        let vadSilenceCount = 0;

        processor.onaudioprocess = (e: AudioProcessingEvent) => {
          const samples = e.inputBuffer.getChannelData(0);
          
          let sum = 0;
          for (let k = 0; k < samples.length; k++) sum += samples[k] * samples[k];
          const rms = Math.sqrt(sum / samples.length);

          if (rms > VAD_THRESHOLD) {
            vadSilenceCount = 0;
          } else {
            vadSilenceCount++;
          }

          if (vadSilenceCount <= VAD_HANG_FRAMES) {
             if (ws && ws.readyState === WebSocket.OPEN) ws.send(float32ToInt16(samples));
          }

          if (isAISpeakingRef.current) {
            if (rms > BARGE_IN_THRESHOLD) {
              if (++bargeInCount >= BARGE_IN_FRAMES) { bargeInCount = 0; stopAllAudioRef.current(); }
            } else { bargeInCount = 0; }
          } else { bargeInCount = 0; }
        };

        const silence = micCtx.createGain();
        silence.gain.value = 0;
        source.connect(micAnalyser);
        micAnalyser.connect(processor);
        processor.connect(silence);
        silence.connect(micCtx.destination);

        setMicMuted(false);
      } catch {
        // mic permission denied — stay muted
      }
    }
  }

  // ── Screen share ──────────────────────────────────────────────────────────
  const stopScreenShare = useCallback(() => {
    if (screenIntervalRef.current) { clearInterval(screenIntervalRef.current); screenIntervalRef.current = null; }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
    setScreenSharing(false);
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "screen_share_stop" }));
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: { frameRate: 1 }, audio: false });
      screenStreamRef.current = stream;

      // When user stops via browser native button
      stream.getVideoTracks()[0].onended = () => stopScreenShare();

      // Attach to hidden video element
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
        await screenVideoRef.current.play().catch(() => {});
      }

      setScreenSharing(true);

      // Notify AI that screen share started
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "screen_share_start" }));
      }

      // Capture frame every 1.5s and send via WebSocket
      screenIntervalRef.current = setInterval(() => {
        const video  = screenVideoRef.current;
        const canvas = screenCanvasRef.current;
        const wsCurr = wsRef.current;
        if (!video || !canvas || !wsCurr || wsCurr.readyState !== WebSocket.OPEN) return;
        if (video.videoWidth === 0 || video.videoHeight === 0) return;

        const W = Math.min(video.videoWidth,  1280);
        const H = Math.round(video.videoHeight * (W / video.videoWidth));
        canvas.width  = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, W, H);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        const base64  = dataUrl.split(",")[1];
        wsCurr.send(JSON.stringify({ type: "image", data: base64, mimeType: "image/jpeg" }));
      }, 1500);
    } catch {
      // User cancelled or permission denied — ignore
    }
  }, [stopScreenShare]);

  // Stop screen share on disconnect
  const disconnectWithScreen = useCallback(() => {
    stopScreenShare();
    disconnect();
  }, [stopScreenShare, disconnect]);

  const handleClose = () => { disconnectWithScreen(); onClose(); };

  // Extract assessment data from initMessage for display
  const assessmentData = initMessage?.type === "assessment_init"
    ? (initMessage.data as { title?: string; instructions?: string; questions?: Array<{ marks: number }> } | undefined)
    : undefined;
  const totalMarks = assessmentData?.questions?.reduce((s, q) => s + (q.marks ?? 0), 0) ?? 0;
  const questionCount = assessmentData?.questions?.length ?? 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-y-auto py-8"
      style={{ zIndex: 300000, background: isDark ? "#000000" : "#ffffff" }}
    >
      {/* ── Header: Institute + Course + Assessment details ── */}
      <div className="flex flex-col items-center gap-3 mb-8 px-6 w-full max-w-sm">
        {/* Logo */}
        {instLogo ? (
          <img
            src={instLogo}
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
            {instName?.charAt(0).toUpperCase() ?? "S"}
          </div>
        )}

        {/* Institute name */}
        <p className="text-xl font-bold tracking-tight text-center" style={{ color: isDark ? "#ffffff" : "#111827" }}>
          {instName || "SmartEdX"}
        </p>

        {/* Course pill */}
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

        {/* Label (e.g. "Interview") */}
        {label && (
          <span className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: isDark ? "#6b7280" : "#9ca3af" }}>
            {label}
          </span>
        )}

      </div>

      {/* Orb */}
      <div className="relative flex items-center justify-center mb-6">
        <div
          ref={orbRef}
          className="w-56 h-56 rounded-full flex items-center justify-center"
          style={{
            background:
              step === "error"
                ? "radial-gradient(circle at 38% 35%, #f87171 0%, #ef4444 45%, #b91c1c 100%)"
                : avatarState === "speaking"
                ? "radial-gradient(circle at 38% 35%, #a5b4fc 0%, #6366f1 45%, #4338ca 80%, #312e81 100%)"
                : "radial-gradient(circle at 38% 35%, #93c5fd 0%, #3b82f6 45%, #1d4ed8 80%, #1e3a8a 100%)",
            boxShadow: "0 30px 90px rgba(59,130,246,0.35), inset 0 -12px 32px rgba(0,0,0,0.18)",
            transition: "background 0.4s ease",
          }}
        >
          {step === "connecting" && (
            <div className="w-10 h-10 border-4 border-white/40 border-t-white rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* Assessment info under the orb */}
      {assessmentData && (
        <div className="flex flex-col items-center gap-2 mb-5 px-6 w-full max-w-xs text-center">
          {assessmentData.title && (
            <p className="text-base font-semibold" style={{ color: isDark ? "#f3f4f6" : "#111827" }}>
              {assessmentData.title}
            </p>
          )}
          {assessmentData.instructions && (
            <p className="text-xs line-clamp-2" style={{ color: isDark ? "#9ca3af" : "#6b7280" }}>
              {assessmentData.instructions}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            {questionCount > 0 && (
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.1)", color: isDark ? "#a5b4fc" : "#4338ca" }}
              >
                {questionCount} question{questionCount !== 1 ? "s" : ""}
              </span>
            )}
            {totalMarks > 0 && (
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.1)", color: isDark ? "#6ee7b7" : "#065f46" }}
              >
                {totalMarks} marks
              </span>
            )}
          </div>
        </div>
      )}

      {/* Status pill */}
      <div className="mb-12 flex items-center gap-2 px-4 py-1.5 rounded-full"
        style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${
          step === "session"    ? "bg-green-400 animate-pulse" :
          step === "connecting" ? "bg-yellow-400 animate-pulse" :
                                  "bg-red-400"
        }`} />
        <span className="text-xs font-medium" style={{ color: isDark ? "#d1d5db" : "#374151" }}>
          {step === "connecting" ? "Connecting…" : step === "session" ? "Connected" : "Error"}
        </span>
      </div>

      {/* Screen share preview (video always mounted so ref is available; hidden when not sharing) */}
      <video ref={screenVideoRef} autoPlay muted playsInline className="hidden" />

      {screenSharing && (
        <div className="mb-6 w-full max-w-sm px-6">
          <div className="relative rounded-2xl overflow-hidden border-2 border-blue-400/60 shadow-lg shadow-blue-500/20">
            {/* Mirror of the hidden video — shows live preview */}
            <video
              autoPlay
              muted
              playsInline
              ref={(el) => { if (el && screenStreamRef.current) el.srcObject = screenStreamRef.current; }}
              className="w-full rounded-2xl object-contain bg-black max-h-40"
            />
            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </div>
            <button
              onClick={stopScreenShare}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
              title="Stop sharing"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-center mt-2" style={{ color: isDark ? "#6b7280" : "#9ca3af" }}>
            AI can see your screen — 1 frame / 1.5s
          </p>
        </div>
      )}

      {/* Hidden canvas for screen frame capture */}
      <canvas ref={screenCanvasRef} className="hidden" />

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Mute toggle — only while in session */}
        {step === "session" && (
          <button
            onClick={toggleMute}
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
        )}

        {/* Screen share toggle — only while in session */}
        {step === "session" && (
          <button
            onClick={screenSharing ? stopScreenShare : startScreenShare}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95`}
            style={{
              background: screenSharing
                ? "rgba(59,130,246,0.25)"
                : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
              backdropFilter: "blur(12px)",
              color: screenSharing ? "#60a5fa" : isDark ? "#ffffff" : "#111827",
              boxShadow: screenSharing ? "0 0 0 2px rgba(59,130,246,0.5)" : "none",
            }}
            title={screenSharing ? "Stop screen share" : "Share screen"}
          >
            {screenSharing ? (
              /* Stop share icon */
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" />
              </svg>
            ) : (
              /* Share screen icon */
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3M12 12.75l3-3m0 0-3-3m3 3H9" />
              </svg>
            )}
          </button>
        )}

        {/* Retry on error */}
        {step === "error" && (
          <button
            onClick={connect}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${isDark ? "text-white" : "text-gray-900"}`}
            style={{ background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)", backdropFilter: "blur(12px)" }}
            title="Retry"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        )}

        {/* Close */}
        <button
          onClick={handleClose}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${isDark ? "text-white" : "text-gray-900"}`}
          style={{ background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)", backdropFilter: "blur(12px)" }}
          title="End session"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
