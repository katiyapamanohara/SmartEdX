"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  /** Override the WebSocket URL */
  wsUrl?: string;
  /** Label shown under the course pill (e.g. "Teacher Assistant") */
  label?: string;
  /** JSON message sent over WebSocket immediately after connection */
  initMessage?: Record<string, unknown>;
  /** Content ID used to submit evaluation results to the backend */
  assessmentId?: string;
  /** Called with the evaluation result when the voice agent finishes scoring */
  onCompleted?: (result: EvalResult) => void;
  /** When true, force-switch to PiP (e.g. user navigated away from the ai-tools page) */
  forcePip?: boolean;
  /** Called with text transcripts extracted from voice WS messages */
  onTranscript?: (role: "user" | "assistant", text: string) => void;
  /** Called once the WS is open and ready to accept text messages */
  onSendTextReady?: (fn: (text: string) => void) => void;
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
  wsUrl: wsUrlProp, label, initMessage, assessmentId, onCompleted, forcePip,
  onTranscript, onSendTextReady,
}: VoiceModalProps) {
  const [step, setStep]               = useState<Step>("connecting");
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [micMuted, setMicMuted]       = useState(false);
  const [errorMsg, setErrorMsg]       = useState("");
  const instName = context.institute_name ?? "";
  const instLogo = instituteLogo ?? "";
  const [screenSharing, setScreenSharing] = useState(false);
  const [supportsScreenShare, setSupportsScreenShare] = useState(false);

  // ── PiP state ─────────────────────────────────────────────────────────────
  const [pipMode, setPipMode]         = useState(false);
  const [pipPos, setPipPos]           = useState({ x: 0, y: 0 });
  const pipDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  // System (OS-level) Document PiP
  const [sysPipWindow, setSysPipWindow] = useState<Window | null>(null);
  const sysPipWindowRef                 = useRef<Window | null>(null);
  const sysPipAutoOpenedRef             = useRef(false);
  const [supportsDocPip, setSupportsDocPip] = useState(false);

  // Generation counter
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
  // Background-tab keepalive refs
  const silentOscRef     = useRef<OscillatorNode | null>(null);
  const wsKeepaliveRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  // Transcript accumulation buffers (flushed on turnComplete)
  const outputTranscriptBufRef = useRef<string>("");
  const inputTranscriptBufRef  = useRef<string>("");
  // Stable ref to onTranscript so the WS closure never goes stale
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  // ── Init PiP position bottom-right ────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPipPos({ x: window.innerWidth - 220, y: window.innerHeight - 308 });
    }
  }, []);

  // ── Activate PiP on forcePip (also attempts OS-level float) ─────────────
  useEffect(() => {
    if (!forcePip) return;
    setPipMode(true);
    if ((window as any).documentPictureInPicture && !sysPipWindowRef.current) {
      openSystemPip().catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forcePip]);

  // ── Auto-open system PiP when session connects (catches cases where the
  //    initial attempt above fires without a valid user-activation context) ──
  useEffect(() => {
    if (!pipMode || !supportsDocPip || sysPipWindowRef.current || step !== "session" || sysPipAutoOpenedRef.current) return;
    sysPipAutoOpenedRef.current = true;
    openSystemPip().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, pipMode, supportsDocPip]);

  // ── Resume audio contexts when user returns to this tab ───────────────────
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        playCtxRef.current?.resume().catch(() => {});
        micCtxRef.current?.resume().catch(() => {});
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // ── Detect system PiP window closing (e.g. on SPA navigation) ────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (sysPipWindowRef.current?.closed) {
        sysPipWindowRef.current = null;
        setSysPipWindow(null);
      }
    }, 400);
    return () => clearInterval(id);
  }, []);

  // ── PiP drag handlers ─────────────────────────────────────────────────────
  function handlePipDragStart(e: React.MouseEvent) {
    e.preventDefault();
    const orig = pipPos;
    pipDragRef.current = { startX: e.clientX, startY: e.clientY, origX: orig.x, origY: orig.y };

    function onMove(me: MouseEvent) {
      if (!pipDragRef.current) return;
      setPipPos({
        x: Math.max(8, Math.min(window.innerWidth  - 212, pipDragRef.current.origX + me.clientX - pipDragRef.current.startX)),
        y: Math.max(8, Math.min(window.innerHeight - 300, pipDragRef.current.origY + me.clientY - pipDragRef.current.startY)),
      });
    }
    function onUp() {
      pipDragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  }

  // ── Document Picture-in-Picture (OS-level float) ─────────────────────────
  async function openSystemPip() {
    const docPip = (window as any).documentPictureInPicture;
    if (!docPip) return;
    try {
      const pip: Window = await docPip.requestWindow({ width: 216, height: 312 });

      const style = pip.document.createElement("style");
      style.textContent = [
        "*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }",
        "body { overflow: hidden; background: transparent; }",
        "@keyframes spin { to { transform: rotate(360deg); } }",
        "@keyframes pulse { 0%,100%{ opacity:1; } 50%{ opacity:.4; } }",
      ].join("\n");
      pip.document.head.appendChild(style);

      pip.addEventListener("pagehide", () => {
        sysPipWindowRef.current = null;
        setSysPipWindow(null);
        sysPipAutoOpenedRef.current = false;
      });

      sysPipWindowRef.current = pip;
      setSysPipWindow(pip);
    } catch {
      // User cancelled or browser blocked
    }
  }

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

  // ── Audio: stop all playback ──────────────────────────────────────────────
  const stopAllAudio = useCallback(() => {
    const ctx  = playCtxRef.current;
    const gain = playMasterRef.current;
    const nextVersion = playVersionRef.current + 1;
    playVersionRef.current = nextVersion;

    const srcsToStop = [...activeSourcesRef.current];
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = ctx ? ctx.currentTime + 0.07 : 0;
    isAISpeakingRef.current = false;
    setAvatarState((prev) => (prev === "speaking" ? "listening" : prev));

    if (ctx && gain && srcsToStop.length > 0) {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, 0.015);
      setTimeout(() => {
        srcsToStop.forEach((s) => { try { s.stop(); } catch { /* ignore */ } });
        if (playVersionRef.current === nextVersion && gain && ctx) {
          gain.gain.cancelScheduledValues(ctx.currentTime);
          gain.gain.setValueAtTime(1, ctx.currentTime);
        }
      }, 70);
    } else {
      srcsToStop.forEach((s) => { try { s.stop(0); } catch { /* ignore */ } });
    }
  }, []);
  stopAllAudioRef.current = stopAllAudio;

  // ── Audio: enqueue PCM chunk ──────────────────────────────────────────────
  const enqueueAudio = useCallback((base64Pcm: string) => {
    const ctx = playCtxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const version = playVersionRef.current;
    const rawBuf     = base64ToArrayBuffer(base64Pcm);
    const int16Array = new Int16Array(rawBuf);
    const numSamples = int16Array.length;
    if (numSamples === 0) return;

    const audioBuffer = ctx.createBuffer(1, numSamples, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < numSamples; i++) channelData[i] = int16Array[i] / 32768.0;

    const FADE = Math.min(Math.floor(24000 * 0.006), Math.floor(numSamples / 2));
    for (let i = 0; i < FADE; i++) {
      const t = i / FADE;
      channelData[i]                  *= t;
      channelData[numSamples - 1 - i] *= t;
    }

    if (playVersionRef.current !== version) return;

    const now = ctx.currentTime;
    const LOOKAHEAD = 0.05;
    if (nextPlayTimeRef.current < now) nextPlayTimeRef.current = now + LOOKAHEAD;
    const startAt = Math.max(nextPlayTimeRef.current, now + LOOKAHEAD);
    nextPlayTimeRef.current = startAt + audioBuffer.duration;

    const gain = playMasterRef.current;
    if (gain) { gain.gain.cancelScheduledValues(now); gain.gain.setValueAtTime(1, now); }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(gain ?? ctx.destination);
    activeSourcesRef.current.push(source);
    source.start(startAt);

    if (!isAISpeakingRef.current) { isAISpeakingRef.current = true; setAvatarState("speaking"); }

    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
      if (activeSourcesRef.current.length === 0 && playVersionRef.current === version) {
        isAISpeakingRef.current = false;
        setAvatarState((prev) => (prev === "speaking" ? "listening" : prev));
      }
    };
  }, []);

  // ── Parse WebSocket events ────────────────────────────────────────────────
  const handleEvent = useCallback((event: Record<string, unknown>) => {
    if (event.type === "reminder") return;

    // Interrupted: flush buffered transcript then stop audio
    if (event.interrupted === true) {
      if (outputTranscriptBufRef.current) {
        onTranscriptRef.current?.("assistant", outputTranscriptBufRef.current);
        outputTranscriptBufRef.current = "";
      }
      stopAllAudio();
      return;
    }

    // Accumulate inputTranscription (user voice → text)
    const inputText = (event.inputTranscription as any)?.text;
    if (typeof inputText === "string" && inputText.trim()) {
      inputTranscriptBufRef.current = inputText.trim();
    }

    // Accumulate outputTranscription (AI voice → text)
    const outputText = (event.outputTranscription as any)?.text;
    if (typeof outputText === "string" && outputText.trim()) {
      outputTranscriptBufRef.current = outputText.trim();
    }

    const parts = ((event.content as any)?.parts as any[]) ?? [];
    const halfCascadeText: string[] = [];

    for (const p of parts) {
      if (p?.inlineData?.data) enqueueAudio(p.inlineData.data);

      if (typeof p?.text === "string" && p.text.trim() && !p.thought) {
        halfCascadeText.push(p.text.trim());
      }

      const fnResp = p?.functionResponse as Record<string, unknown> | undefined;
      if (fnResp?.name === "evaluate_voice_assessment") {
        const response = fnResp.response as EvalResult | { error: string } | undefined;
        if (response && !("error" in response)) {
          const result = response as EvalResult;
          stopAllAudio();
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
            }).catch(() => {});
          }
          onCompleted?.(result);
        }
      }
    }

    if (halfCascadeText.length > 0) {
      const chunk = halfCascadeText.join(" ");
      outputTranscriptBufRef.current = outputTranscriptBufRef.current
        ? `${outputTranscriptBufRef.current} ${chunk}`
        : chunk;
    }

    // turnComplete: flush both buffers as chat messages
    if (event.turnComplete === true) {
      if (inputTranscriptBufRef.current) {
        onTranscriptRef.current?.("user", inputTranscriptBufRef.current);
        inputTranscriptBufRef.current = "";
      }
      if (outputTranscriptBufRef.current) {
        onTranscriptRef.current?.("assistant", outputTranscriptBufRef.current);
        outputTranscriptBufRef.current = "";
      }
    }
  }, [enqueueAudio, stopAllAudio, assessmentId, instituteId, onCompleted]);

  // ── Disconnect everything ──────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (wsKeepaliveRef.current) { clearInterval(wsKeepaliveRef.current); wsKeepaliveRef.current = null; }
    try { silentOscRef.current?.stop(); } catch { /* already stopped */ }
    silentOscRef.current = null;
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
    connectGenRef.current++;
  }, []);

  // ── Connect to voice agent ────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (!selectedCourse) return;
    const myGen = ++connectGenRef.current;
    setStep("connecting");
    setErrorMsg("");

    const playCtx      = new AudioContext();
    playCtxRef.current = playCtx;
    nextPlayTimeRef.current = playCtx.currentTime;
    const playMaster   = playCtx.createGain();
    const playAnalyser = playCtx.createAnalyser();
    playAnalyser.fftSize = 256;
    playMaster.connect(playAnalyser);
    playAnalyser.connect(playCtx.destination);
    playMasterRef.current  = playMaster;
    playAnalyserRef.current = playAnalyser;

    // Silent oscillator — keeps AudioContext running in background tabs
    const silentGain = playCtx.createGain();
    silentGain.gain.value = 0;
    const silentOsc = playCtx.createOscillator();
    silentOsc.frequency.value = 1;
    silentOsc.connect(silentGain);
    silentGain.connect(playCtx.destination);
    silentOsc.start();
    silentOscRef.current = silentOsc;

    // WS keepalive ping every 20 s — prevents proxy/firewall idle timeout
    wsKeepaliveRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 20000);

    const userId    = authService.getUserId() ?? "teacher";
    const sessionId = `tva-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const wsBase    = process.env.NEXT_PUBLIC_VOICE_AGENT_WS_URL ?? "ws://localhost:5001/voice-agent";
    const greetParam = initMessage ? "&greet=false" : "";
    const wsUrl     = wsUrlProp ?? `${wsBase}/ws/course-qa/${instituteId}/${selectedCourse.id}/${userId}/${sessionId}?course_name=${encodeURIComponent(selectedCourse.name)}${greetParam}`;

    let preStream: MediaStream;
    try {
      preStream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } as any,
      });
    } catch {
      setErrorMsg("Microphone access denied. Please allow microphone and try again.");
      setStep("error");
      return;
    }

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

        const BARGE_IN_THRESHOLD = 0.04;
        const BARGE_IN_FRAMES    = 3;
        let bargeInCount = 0;
        const VAD_THRESHOLD   = 0.01;
        const VAD_HANG_FRAMES = 7;
        let vadSilenceCount = 0;

        processor.onaudioprocess = (e: AudioProcessingEvent) => {
          const samples = e.inputBuffer.getChannelData(0);
          let sum = 0;
          for (let k = 0; k < samples.length; k++) sum += samples[k] * samples[k];
          const rms = Math.sqrt(sum / samples.length);

          if (rms > VAD_THRESHOLD) vadSilenceCount = 0;
          else vadSilenceCount++;

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

        if (initMessage && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(initMessage));

        // Expose text-to-voice send function to the parent
        onSendTextReady?.((text: string) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "text", text }));
          }
        });

        startOrbAnimation();
        setStep("session");
        setAvatarState("listening");
      } catch {
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
      if (e.code !== 1000) { setErrorMsg(`Session closed (${e.code}).`); setStep("error"); }
    };
  }, [selectedCourse, instituteId, handleEvent, initMessage, wsUrlProp]);

  // ── Connect on mount, disconnect on unmount ───────────────────────────────
  useEffect(() => {
    const hasScreenCapture = !!((navigator.mediaDevices as any)?.getDisplayMedia || (navigator as any)?.getDisplayMedia);
    setSupportsScreenShare(hasScreenCapture);
    setSupportsDocPip(!!(window as any).documentPictureInPicture);
    connect();
    return () => {
      sysPipWindowRef.current?.close();
      sysPipWindowRef.current = null;
      disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mute / unmute mic ─────────────────────────────────────────────────────
  async function toggleMute() {
    if (!micMuted) {
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
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } as any,
        });
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
        const BARGE_IN_THRESHOLD = 0.04;
        const BARGE_IN_FRAMES    = 3;
        let bargeInCount = 0;
        const VAD_THRESHOLD   = 0.01;
        const VAD_HANG_FRAMES = 7;
        let vadSilenceCount = 0;

        processor.onaudioprocess = (e: AudioProcessingEvent) => {
          const samples = e.inputBuffer.getChannelData(0);
          let sum = 0;
          for (let k = 0; k < samples.length; k++) sum += samples[k] * samples[k];
          const rms = Math.sqrt(sum / samples.length);

          if (rms > VAD_THRESHOLD) vadSilenceCount = 0;
          else vadSilenceCount++;

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
        // stay muted
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
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "screen_share_stop" }));
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: { frameRate: 1 }, audio: false });
      screenStreamRef.current = stream;
      stream.getVideoTracks()[0].onended = () => stopScreenShare();

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
        await screenVideoRef.current.play().catch(() => {});
      }

      setScreenSharing(true);
      setPipMode(true);  // auto-minimize to PiP so the screen is visible
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "screen_share_start" }));

      screenIntervalRef.current = setInterval(() => {
        const video  = screenVideoRef.current;
        const canvas = screenCanvasRef.current;
        const wsCurr = wsRef.current;
        if (!video || !canvas || !wsCurr || wsCurr.readyState !== WebSocket.OPEN) return;
        if (video.videoWidth === 0 || video.videoHeight === 0) return;

        const W = Math.min(video.videoWidth, 1280);
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
    } catch (err) {
      const error = err as Error;
      if (error.name !== "NotAllowedError" && error.name !== "NotFoundError") {
        setErrorMsg("Screen sharing failed. Please try again or use a desktop browser.");
      }
    }
  }, [stopScreenShare]);

  const disconnectWithScreen = useCallback(() => {
    stopScreenShare();
    disconnect();
  }, [stopScreenShare, disconnect]);

  const handleClose = () => { disconnectWithScreen(); onClose(); };

  const assessmentData = initMessage?.type === "assessment_init"
    ? (initMessage.data as { title?: string; instructions?: string; questions?: Array<{ marks: number }> } | undefined)
    : undefined;
  const totalMarks    = assessmentData?.questions?.reduce((s, q) => s + (q.marks ?? 0), 0) ?? 0;
  const questionCount = assessmentData?.questions?.length ?? 0;

  // ── Shared orb gradient ───────────────────────────────────────────────────
  const orbGradient =
    step === "error"
      ? "radial-gradient(circle at 38% 35%, #f87171 0%, #ef4444 45%, #b91c1c 100%)"
      : avatarState === "speaking"
      ? "radial-gradient(circle at 38% 35%, #a5b4fc 0%, #6366f1 45%, #4338ca 80%, #312e81 100%)"
      : "radial-gradient(circle at 38% 35%, #93c5fd 0%, #3b82f6 45%, #1d4ed8 80%, #1e3a8a 100%)";

  // ── Hidden media elements (always mounted so refs are stable) ─────────────
  const hiddenMedia = (
    <>
      <video ref={screenVideoRef} autoPlay muted playsInline className="hidden" />
      <canvas ref={screenCanvasRef} className="hidden" />
    </>
  );

  // ── Status label ──────────────────────────────────────────────────────────
  const statusLabel =
    step === "connecting" ? "Connecting…" :
    step === "error"      ? "Error" :
    avatarState === "speaking" ? "Speaking…" :
    micMuted ? "Muted" : "Listening…";

  const statusColor =
    step === "session"    ? "#4ade80" :
    step === "connecting" ? "#facc15" : "#f87171";

  // ─────────────────────────────────────────────────────────────────────────
  // PiP MODE — compact floating draggable widget
  // ─────────────────────────────────────────────────────────────────────────
  const sharedPipBody = (inSystemPip = false) => (
    <>
      {/* Orb */}
      <div style={{ display: "flex", justifyContent: "center", paddingTop: inSystemPip ? 24 : 20, paddingBottom: 10 }}>
        <div
          ref={orbRef}
          style={{
            width: 88, height: 88, borderRadius: "50%",
            background: orbGradient,
            boxShadow: "0 20px 50px rgba(59,130,246,0.3), inset 0 -6px 16px rgba(0,0,0,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.4s ease",
          }}
        >
          {step === "connecting" && (
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.35)", borderTopColor: "white", animation: "spin 0.8s linear infinite" }} />
          )}
        </div>
      </div>

      {/* Status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, paddingBottom: 12 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
        <span style={{ fontSize: 11, fontWeight: 500, color: isDark ? "#9ca3af" : "#6b7280" }}>{statusLabel}</span>
      </div>

      {/* Screen share badge */}
      {screenSharing && (
        <div style={{ margin: "0 12px 10px", padding: "5px 10px", borderRadius: 10, background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 10, color: isDark ? "#93c5fd" : "#2563eb", fontWeight: 600 }}>Screen sharing</span>
          <button onClick={stopScreenShare} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: isDark ? "#6b7280" : "#9ca3af", padding: 2 }}>
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, paddingBottom: 16 }}>
        {step === "session" && (
          <button onClick={toggleMute} title={micMuted ? "Unmute" : "Mute"}
            style={{ width: 38, height: 38, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
              background: micMuted ? "rgba(239,68,68,0.15)" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)",
              color: micMuted ? "#ef4444" : isDark ? "#ffffff" : "#374151" }}>
            {micMuted ? (
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 19L5 5M12 18.75a6 6 0 0 1-6-6v-1.5M12 18.75a6 6 0 0 0 6-6v-1.5M12 18.75v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5m3 11.25a3 3 0 0 0 3-3V4.5m0 0a3 3 0 1 0-6 0v8.25" /></svg>
            ) : (
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>
            )}
          </button>
        )}
        {step === "session" && supportsScreenShare && (
          <button onClick={screenSharing ? stopScreenShare : startScreenShare} title={screenSharing ? "Stop screen share" : "Share screen"}
            style={{ width: 38, height: 38, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
              background: screenSharing ? "rgba(59,130,246,0.2)" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)",
              color: screenSharing ? "#60a5fa" : isDark ? "#ffffff" : "#374151",
              boxShadow: screenSharing ? "0 0 0 2px rgba(59,130,246,0.4)" : "none" }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" /></svg>
          </button>
        )}
        <button onClick={handleClose} title="End session"
          style={{ width: 38, height: 38, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </>
  );

  if (pipMode) {
    return (
      <>
        {hiddenMedia}

        {/* ── System (OS-level) PiP portal ──────────────────────────────── */}
        {sysPipWindow && createPortal(
          <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100vh", background: isDark ? "#1f2937" : "#ffffff", fontFamily: "system-ui,-apple-system,sans-serif", overflow: "hidden" }}>
            <div style={{ padding: "9px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}`, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
              <svg width="12" height="12" fill="none" stroke={isDark ? "#6b7280" : "#9ca3af"} strokeWidth={2} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
              <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: isDark ? "#9ca3af" : "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedCourse?.name ?? "Voice Agent"}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: statusColor, fontWeight: 600, flexShrink: 0 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: statusColor, display: "inline-block" }} />
                {statusLabel}
              </span>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {sharedPipBody(true)}
            </div>
          </div>,
          sysPipWindow.document.body
        )}

        {/* ── In-browser floating widget (hidden when system PiP is open) ── */}
        {!sysPipWindow && (
        <div
          style={{
            position: "fixed",
            left: pipPos.x,
            top: pipPos.y,
            zIndex: 300000,
            width: 204,
            background: isDark ? "#1f2937" : "#ffffff",
            borderRadius: 20,
            boxShadow: "0 25px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)",
            overflow: "hidden",
            userSelect: "none",
          }}
        >
          {/* Drag handle */}
          <div
            onMouseDown={handlePipDragStart}
            style={{
              cursor: "grab",
              background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
              padding: "9px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginRight: 8, opacity: 0.4 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ display: "flex", gap: 3 }}>
                  <div style={{ width: 3, height: 3, borderRadius: "50%", background: isDark ? "#fff" : "#000" }} />
                  <div style={{ width: 3, height: 3, borderRadius: "50%", background: isDark ? "#fff" : "#000" }} />
                </div>
              ))}
            </div>
            <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: isDark ? "#9ca3af" : "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedCourse?.name ?? "Voice Agent"}
            </span>
            {supportsDocPip && step === "session" && (
              <button
                onClick={openSystemPip}
                title="Float above other apps"
                style={{ marginLeft: 4, padding: 4, borderRadius: 6, border: "none", background: "rgba(59,130,246,0.15)", cursor: "pointer", color: isDark ? "#93c5fd" : "#2563eb", display: "flex", alignItems: "center" }}
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <rect x="12.5" y="9.5" width="7.5" height="5" rx="1" fill="currentColor" opacity="0.3" />
                  <rect x="12.5" y="9.5" width="7.5" height="5" rx="1" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setPipMode(false)}
              title="Expand"
              style={{ marginLeft: 4, padding: 4, borderRadius: 6, border: "none", background: "none", cursor: "pointer", color: isDark ? "#6b7280" : "#9ca3af", display: "flex", alignItems: "center" }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            </button>
          </div>

          {sharedPipBody(false)}
        </div>
        )}
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FULL-SCREEN MODE
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-y-auto py-8"
      style={{ zIndex: 300000, background: isDark ? "#000000" : "#ffffff" }}
    >
      {hiddenMedia}

      {/* Header */}
      <div className="flex flex-col items-center gap-3 mb-8 px-6 w-full max-w-sm">
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
            {instName?.charAt(0).toUpperCase() ?? "T"}
          </div>
        )}
        <p className="text-xl font-bold tracking-tight text-center" style={{ color: isDark ? "#ffffff" : "#111827" }}>
          {instName || "SmartEdX"}
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
            background: orbGradient,
            boxShadow: "0 30px 90px rgba(59,130,246,0.35), inset 0 -12px 32px rgba(0,0,0,0.18)",
            transition: "background 0.4s ease",
          }}
        >
          {step === "connecting" && (
            <div className="w-10 h-10 border-4 border-white/40 border-t-white rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* Assessment info */}
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
              <span className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.1)", color: isDark ? "#a5b4fc" : "#4338ca" }}>
                {questionCount} question{questionCount !== 1 ? "s" : ""}
              </span>
            )}
            {totalMarks > 0 && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.1)", color: isDark ? "#6ee7b7" : "#065f46" }}>
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
          step === "connecting" ? "bg-yellow-400 animate-pulse" : "bg-red-400"
        }`} />
        <span className="text-xs font-medium" style={{ color: isDark ? "#d1d5db" : "#374151" }}>
          {step === "connecting" ? "Connecting…" : step === "session" ? "Connected" : "Error"}
        </span>
      </div>

      {/* Screen share preview */}
      {screenSharing && (
        <div className="mb-6 w-full max-w-sm px-6">
          <div className="relative rounded-2xl overflow-hidden border-2 border-blue-400/60 shadow-lg shadow-blue-500/20">
            <video
              autoPlay muted playsInline
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

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Mute */}
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

        {/* Screen share */}
        {step === "session" && supportsScreenShare && (
          <button
            onClick={screenSharing ? stopScreenShare : startScreenShare}
            className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{
              background: screenSharing ? "rgba(59,130,246,0.25)" : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
              backdropFilter: "blur(12px)",
              color: screenSharing ? "#60a5fa" : isDark ? "#ffffff" : "#111827",
              boxShadow: screenSharing ? "0 0 0 2px rgba(59,130,246,0.5)" : "none",
            }}
            title={screenSharing ? "Stop screen share" : "Share screen"}
          >
            {screenSharing ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3M12 12.75l3-3m0 0-3-3m3 3H9" />
              </svg>
            )}
          </button>
        )}

        {/* Minimize to PiP */}
        {step === "session" && (
          <button
            onClick={() => setPipMode(true)}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${isDark ? "text-white" : "text-gray-900"}`}
            style={{ background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)", backdropFilter: "blur(12px)" }}
            title="Minimize to picture-in-picture"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <rect x="2" y="3" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="12.5" y="10" width="7" height="4.5" rx="1" fill="currentColor" opacity="0.25" />
              <rect x="12.5" y="10" width="7" height="4.5" rx="1" />
            </svg>
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
