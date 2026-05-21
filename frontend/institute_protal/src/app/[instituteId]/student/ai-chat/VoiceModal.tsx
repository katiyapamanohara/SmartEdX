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
  wsUrl?: string;
  label?: string;
  initMessage?: Record<string, unknown>;
  assessmentId?: string;
  onCompleted?: (result: EvalResult) => void;
  forcePip?: boolean;
  onTranscript?: (role: "user" | "assistant", text: string) => void;
  onSendTextReady?: (fn: (text: string) => void) => void;
}

// ─── PCM helpers ──────────────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

type Step        = "screenshare" | "connecting" | "session" | "error" | "autofailed";
type AvatarState = "idle" | "speaking" | "listening";

// ─── Component ────────────────────────────────────────────────────────────────

export default function VoiceModal({
  isDark, instituteLogo, context, selectedCourse, instituteId, onClose,
  wsUrl: wsUrlProp, label, initMessage, assessmentId, onCompleted, forcePip,
  onTranscript, onSendTextReady,
}: VoiceModalProps) {
  const isAssessment = !!assessmentId;
  // requiresProctoring: true by default for all assessments; set to false by teacher to skip screen-share gate
  const requiresProctoring = isAssessment && ((initMessage?.data as any)?.requireScreenShare !== false);

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep]               = useState<Step>(requiresProctoring ? "screenshare" : "connecting");
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [micMuted, setMicMuted]       = useState(false);
  const [errorMsg, setErrorMsg]       = useState("");
  const [screenSharing, setScreenSharing]   = useState(false);
  const [supportsScreenShare, setSupportsScreenShare] = useState(false);
  const [supportsDocPip, setSupportsDocPip] = useState(false);
  const instName = context.institute_name ?? "";
  const instLogo = instituteLogo ?? "";

  // PiP — disabled in assessment mode
  const [pipMode, setPipMode]   = useState(false);
  const [pipPos, setPipPos]     = useState({ x: 0, y: 0 });
  const [sysPipWindow, setSysPipWindow] = useState<Window | null>(null);
  const pipDragRef              = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const sysPipWindowRef         = useRef<Window | null>(null);
  const sysPipAutoOpenedRef     = useRef(false);

  // Screen share gate state
  const [ssError, setSsError]           = useState("");
  const [ssRequesting, setSsRequesting] = useState(false);
  // Dual-monitor detection (window.screen.isExtended — Chrome 100+)
  const [multiMonitor, setMultiMonitor] = useState(false);

  // Proctoring state
  const [leaveCountdown, setLeaveCountdown] = useState<number | null>(null);
  const [violationMsg, setViolationMsg]     = useState("");

  // ── Stable refs for proctoring (avoid stale closure issues) ───────────────
  const autoFailedRef        = useRef(false);
  const leaveViolationsRef   = useRef(0);
  const countdownTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const screenStreamRef      = useRef<MediaStream | null>(null);
  // triggerAutoFail stored in a ref so proctoring callbacks always call the latest version
  const triggerAutoFailRef   = useRef<() => void>(() => {});

  // ── Audio / WS refs ────────────────────────────────────────────────────────
  const connectGenRef    = useRef(0);
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
  const micAnalyserRef   = useRef<AnalyserNode | null>(null);
  const playAnalyserRef  = useRef<AnalyserNode | null>(null);
  const playMasterRef    = useRef<GainNode | null>(null);
  const orbRef           = useRef<HTMLDivElement>(null);
  const animFrameRef     = useRef<number>(0);
  const screenVideoRef   = useRef<HTMLVideoElement>(null);
  const screenCanvasRef  = useRef<HTMLCanvasElement>(null);
  const screenIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const outputBufRef     = useRef("");
  const inputBufRef      = useRef("");
  const onTranscriptRef  = useRef(onTranscript);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  const silentOscRef     = useRef<OscillatorNode | null>(null);
  const wsKeepaliveRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Disconnect all media/ws ────────────────────────────────────────────────
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
    isAISpeakingRef.current = false;
    micAnalyserRef.current = playAnalyserRef.current = playMasterRef.current = null;
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

  // ── Submit zero score (cheating) ───────────────────────────────────────────
  const submitZeroScore = useCallback(async () => {
    if (!assessmentId || !instituteId) return;
    const qs = (initMessage?.data as any)?.questions as
      Array<{ id: string; question: string; expected_answer: string; marks: number }> | undefined;
    const totalMarks = qs?.reduce((s, q) => s + (q.marks ?? 0), 0) ?? 0;
    try {
      await instituteService.submitVoiceAssessmentResult(instituteId, assessmentId, {
        score: 0,
        voiceResult: {
          totalScore: 0, totalMarks, grade: "F", passed: false,
          overallFeedback: "Assessment automatically failed: cheating violation detected.",
          questionResults: (qs ?? []).map((q) => ({
            questionId: q.id, question: q.question,
            studentAnswer: "", expectedAnswer: q.expected_answer,
            score: 0, marksAvailable: q.marks, percentage: 0,
            feedback: "Not evaluated — terminated due to integrity violation.",
          })),
        },
      });
    } catch { /* silent */ }
  }, [assessmentId, instituteId, initMessage]);

  // ── Trigger auto-fail (stored in ref so proctoring closures always get latest) ──
  const triggerAutoFail = useCallback(() => {
    if (autoFailedRef.current) return;
    autoFailedRef.current = true;
    if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; }
    // Stop everything
    playVersionRef.current += 1;
    for (const src of activeSourcesRef.current) { try { src.stop(0); } catch { /* ignore */ } }
    activeSourcesRef.current = [];
    isAISpeakingRef.current = false;
    cancelAnimationFrame(animFrameRef.current);
    processorRef.current?.disconnect(); processorRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null;
    micCtxRef.current?.close().catch(() => {}); micCtxRef.current = null;
    playCtxRef.current?.close().catch(() => {}); playCtxRef.current = null;
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) wsRef.current.close();
    wsRef.current = null;
    if (screenIntervalRef.current) { clearInterval(screenIntervalRef.current); screenIntervalRef.current = null; }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setStep("autofailed");
    setLeaveCountdown(null);
    setViolationMsg("");
    submitZeroScore();
  }, [submitZeroScore]);

  // Keep ref always pointing to latest version — proctoring event handlers call the ref
  triggerAutoFailRef.current = triggerAutoFail;

  // ── PROCTORING — runs whenever step === "session" and proctoring is on ──────
  useEffect(() => {
    if (!requiresProctoring || step !== "session") return;

    // 1. Screen-share liveness poll every 5 s
    const livenessTimer = setInterval(() => {
      const s = screenStreamRef.current;
      if (!s || s.getTracks().every((t) => t.readyState === "ended")) {
        triggerAutoFailRef.current();
      }
    }, 5_000);

    // 2. Tab / window switch — 10-second countdown then auto-fail
    const SECS = 10;

    const startCountdown = () => {
      if (countdownTimerRef.current || autoFailedRef.current) return;
      setLeaveCountdown(SECS);
      countdownTimerRef.current = setInterval(() => {
        setLeaveCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownTimerRef.current!);
            countdownTimerRef.current = null;
            triggerAutoFailRef.current();   // always calls latest version via ref
            return null;
          }
          return prev - 1;
        });
      }, 1_000);
    };

    const clearCountdown = () => {
      if (!countdownTimerRef.current) return;
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
      setLeaveCountdown(null);
      leaveViolationsRef.current += 1;
      const n = leaveViolationsRef.current;
      if (n >= 2) {
        triggerAutoFailRef.current();
      } else {
        setViolationMsg(
          `⚠️ Violation #${n}: You left the assessment window. ` +
          "Leave again and your assessment will be TERMINATED with 0 marks immediately."
        );
        setTimeout(() => setViolationMsg(""), 9_000);
        playCtxRef.current?.resume().catch(() => {});
        micCtxRef.current?.resume().catch(() => {});
      }
    };

    const onVisibility = () =>
      document.visibilityState === "hidden" ? startCountdown() : clearCountdown();
    const onBlur  = () => startCountdown();
    const onFocus = () => clearCountdown();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur",  onBlur);
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(livenessTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur",  onBlur);
      window.removeEventListener("focus", onFocus);
      if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; }
    };
  // Only re-run when step changes — triggerAutoFail is accessed via ref so NOT a dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiresProctoring, step]);

  // ── Stop all AI audio ──────────────────────────────────────────────────────
  const stopAllAudio = useCallback(() => {
    const ctx = playCtxRef.current, gain = playMasterRef.current;
    const ver = playVersionRef.current + 1;
    playVersionRef.current = ver;
    const srcs = [...activeSourcesRef.current];
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = ctx ? ctx.currentTime + 0.07 : 0;
    isAISpeakingRef.current = false;
    setAvatarState((p) => (p === "speaking" ? "listening" : p));
    if (ctx && gain && srcs.length > 0) {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, 0.015);
      setTimeout(() => {
        srcs.forEach((s) => { try { s.stop(); } catch { /* ignore */ } });
        if (playVersionRef.current === ver && gain && ctx) {
          gain.gain.cancelScheduledValues(ctx.currentTime);
          gain.gain.setValueAtTime(1, ctx.currentTime);
        }
      }, 70);
    } else { srcs.forEach((s) => { try { s.stop(0); } catch { /* ignore */ } }); }
  }, []);
  stopAllAudioRef.current = stopAllAudio;

  // ── Enqueue PCM chunk ──────────────────────────────────────────────────────
  const enqueueAudio = useCallback((base64Pcm: string) => {
    const ctx = playCtxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const ver = playVersionRef.current;
    const int16 = new Int16Array(base64ToArrayBuffer(base64Pcm));
    if (!int16.length) return;
    const buf = ctx.createBuffer(1, int16.length, 24000);
    const ch  = buf.getChannelData(0);
    for (let i = 0; i < int16.length; i++) ch[i] = int16[i] / 32768;
    const FADE = Math.min(Math.floor(24000 * 0.006), Math.floor(int16.length / 2));
    for (let i = 0; i < FADE; i++) { const t = i / FADE; ch[i] *= t; ch[int16.length - 1 - i] *= t; }
    if (playVersionRef.current !== ver) return;
    const now = ctx.currentTime, LA = 0.05;
    if (nextPlayTimeRef.current < now) nextPlayTimeRef.current = now + LA;
    const startAt = Math.max(nextPlayTimeRef.current, now + LA);
    nextPlayTimeRef.current = startAt + buf.duration;
    const gain = playMasterRef.current;
    if (gain) { gain.gain.cancelScheduledValues(now); gain.gain.setValueAtTime(1, now); }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(gain ?? ctx.destination);
    activeSourcesRef.current.push(src);
    src.start(startAt);
    if (!isAISpeakingRef.current) { isAISpeakingRef.current = true; setAvatarState("speaking"); }
    src.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((x) => x !== src);
      if (!activeSourcesRef.current.length && playVersionRef.current === ver) {
        isAISpeakingRef.current = false;
        setAvatarState((p) => (p === "speaking" ? "listening" : p));
      }
    };
  }, []);

  // ── Handle WS events ──────────────────────────────────────────────────────
  const handleEvent = useCallback((ev: Record<string, unknown>) => {
    if (ev.type === "reminder") return;
    if (ev.interrupted === true) {
      if (outputBufRef.current) { onTranscriptRef.current?.("assistant", outputBufRef.current); outputBufRef.current = ""; }
      stopAllAudio(); return;
    }
    const inputText = (ev.inputTranscription as any)?.text;
    if (typeof inputText === "string" && inputText.trim()) inputBufRef.current = inputText.trim();
    const outputText = (ev.outputTranscription as any)?.text;
    if (typeof outputText === "string" && outputText.trim()) outputBufRef.current = outputText.trim();
    const parts = ((ev.content as any)?.parts as any[]) ?? [];
    const halfText: string[] = [];
    for (const p of parts) {
      if (p?.inlineData?.data) enqueueAudio(p.inlineData.data);
      if (typeof p?.text === "string" && p.text.trim() && !p.thought) halfText.push(p.text.trim());
      const fn = p?.functionResponse as Record<string, unknown> | undefined;
      if (fn?.name === "evaluate_voice_assessment") {
        const res = fn.response as EvalResult | { error: string } | undefined;
        if (res && !("error" in res)) {
          const result = res as EvalResult;
          stopAllAudio();
          if (assessmentId && instituteId) {
            instituteService.submitVoiceAssessmentResult(instituteId, assessmentId, {
              score: result.percentage,
              voiceResult: {
                totalScore: result.total_score, totalMarks: result.total_marks,
                grade: result.grade, passed: result.passed,
                overallFeedback: result.overall_feedback,
                questionResults: result.results.map((r) => ({
                  questionId: r.question_id, question: r.question,
                  studentAnswer: r.student_answer, expectedAnswer: r.expected_answer,
                  score: r.score, marksAvailable: r.marks_available,
                  percentage: r.percentage, feedback: r.feedback,
                })),
              },
            }).catch(() => {});
          }
          onCompleted?.(result);
        }
      }
    }
    if (halfText.length) outputBufRef.current = outputBufRef.current ? `${outputBufRef.current} ${halfText.join(" ")}` : halfText.join(" ");
    if (ev.turnComplete === true) {
      if (inputBufRef.current) { onTranscriptRef.current?.("user", inputBufRef.current); inputBufRef.current = ""; }
      if (outputBufRef.current) { onTranscriptRef.current?.("assistant", outputBufRef.current); outputBufRef.current = ""; }
    }
  }, [enqueueAudio, stopAllAudio, assessmentId, instituteId, onCompleted]);

  // ── Orb animation ─────────────────────────────────────────────────────────
  const startOrbAnimation = useCallback(() => {
    const md = new Uint8Array(256), pd = new Uint8Array(256);
    const rms = (d: Uint8Array) => { let s = 0; for (let i = 0; i < d.length; i++) { const v = (d[i] - 128) / 128; s += v * v; } return Math.sqrt(s / d.length); };
    const loop = () => {
      animFrameRef.current = requestAnimationFrame(loop);
      let vol = 0;
      if (isAISpeakingRef.current && playAnalyserRef.current) { playAnalyserRef.current.getByteTimeDomainData(pd); vol = rms(pd); }
      else if (micAnalyserRef.current) { micAnalyserRef.current.getByteTimeDomainData(md); vol = rms(md); }
      if (orbRef.current) {
        orbRef.current.style.transform = `scale(${(1 + vol * 0.45).toFixed(3)})`;
        orbRef.current.style.boxShadow = `0 ${30 + vol * 80}px ${90 + vol * 120}px rgba(59,130,246,${(0.35 + vol * 0.45).toFixed(3)}), inset 0 -12px 32px rgba(0,0,0,0.18)`;
      }
    };
    loop();
  }, []);

  // ── Connect to voice agent ─────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (!selectedCourse) return;
    const myGen = ++connectGenRef.current;
    setStep("connecting"); setErrorMsg("");

    const playCtx = new AudioContext();
    playCtxRef.current = playCtx;
    nextPlayTimeRef.current = playCtx.currentTime;
    const master   = playCtx.createGain();
    const analyser = playCtx.createAnalyser(); analyser.fftSize = 256;
    master.connect(analyser); analyser.connect(playCtx.destination);
    playMasterRef.current = master; playAnalyserRef.current = analyser;

    const silentG = playCtx.createGain(); silentG.gain.value = 0;
    const silentO = playCtx.createOscillator(); silentO.frequency.value = 1;
    silentO.connect(silentG); silentG.connect(playCtx.destination); silentO.start();
    silentOscRef.current = silentO;

    wsKeepaliveRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type: "ping" }));
    }, 20_000);

    const userId = authService.getUserId() ?? "student";
    const sid    = `cva-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const wsBase = process.env.NEXT_PUBLIC_VOICE_AGENT_WS_URL ?? "ws://localhost:5001/voice-agent";
    const wsUrl  = wsUrlProp ?? `${wsBase}/ws/course-qa/${instituteId}/${selectedCourse.id}/${userId}/${sid}?course_name=${encodeURIComponent(selectedCourse.name)}${initMessage ? "&greet=false" : ""}`;

    let preStream: MediaStream;
    try {
      preStream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } as any,
      });
    } catch {
      setErrorMsg("Microphone access denied. Please allow microphone and try again.");
      setStep("error"); return;
    }
    if (connectGenRef.current !== myGen) { preStream.getTracks().forEach((t) => t.stop()); return; }

    let ws: WebSocket;
    try { ws = new WebSocket(wsUrl); ws.binaryType = "arraybuffer"; wsRef.current = ws; }
    catch { preStream.getTracks().forEach((t) => t.stop()); setErrorMsg("Failed to open WebSocket."); setStep("error"); return; }

    ws.onopen = async () => {
      try {
        streamRef.current = preStream;
        const micCtx = new AudioContext({ sampleRate: 16000 }); micCtxRef.current = micCtx;
        const src     = micCtx.createMediaStreamSource(preStream);
        const ma      = micCtx.createAnalyser(); ma.fftSize = 256; micAnalyserRef.current = ma;
        const proc    = micCtx.createScriptProcessor(1024, 1, 1); processorRef.current = proc;
        const BARGE = 0.04, BARGE_F = 3, VAD = 0.01, VAD_H = 7;
        let bc = 0, vc = 0;
        proc.onaudioprocess = (e) => {
          const s = e.inputBuffer.getChannelData(0);
          let sum = 0; for (let k = 0; k < s.length; k++) sum += s[k] * s[k];
          const rms = Math.sqrt(sum / s.length);
          if (rms > VAD) vc = 0; else vc++;
          if (vc <= VAD_H && ws.readyState === WebSocket.OPEN) ws.send(float32ToInt16(s));
          if (isAISpeakingRef.current) {
            if (rms > BARGE) { if (++bc >= BARGE_F) { bc = 0; stopAllAudioRef.current(); } } else bc = 0;
          } else bc = 0;
        };
        const sil = micCtx.createGain(); sil.gain.value = 0;
        src.connect(ma); ma.connect(proc); proc.connect(sil); sil.connect(micCtx.destination);
        if (initMessage && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(initMessage));
        onSendTextReady?.((text) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "text", text })); });
        startOrbAnimation();
        setStep("session"); setAvatarState("listening");
      } catch { setErrorMsg("Audio setup failed."); setStep("error"); ws.close(); }
    };
    ws.onmessage = (e) => { if (typeof e.data === "string") { try { handleEvent(JSON.parse(e.data)); } catch { /* ignore */ } } };
    ws.onerror   = () => { if (!autoFailedRef.current) { setErrorMsg("Connection error."); setStep("error"); } };
    ws.onclose   = (e) => { if (e.code !== 1000 && !autoFailedRef.current) { setErrorMsg(`Session closed (${e.code}).`); setStep("error"); } };
  }, [selectedCourse, instituteId, handleEvent, initMessage, startOrbAnimation, onSendTextReady, wsUrlProp]);

  // ── Request screen share and then connect (assessment mode) ───────────────
  const requestScreenShareAndConnect = useCallback(async () => {
    setSsError("");
    // Re-check multi-monitor state at click time
    const isExtended = !!(window.screen as any).isExtended;
    setMultiMonitor(isExtended);
    if (isExtended) {
      setSsError(
        "An external monitor is still connected. Please disconnect it first, then click the button again."
      );
      return;
    }
    setSsRequesting(true);
    try {
      const stream: MediaStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { cursor: "always", displaySurface: "monitor" },
        audio: false,
      });

      const track   = stream.getVideoTracks()[0];
      const surface = (track?.getSettings() as any)?.displaySurface as string | undefined;

      // Reject if the browser tells us it's not the whole monitor
      if (surface === "browser" || surface === "window") {
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        const what = surface === "browser" ? "a browser tab" : "an application window";
        setSsError(
          `You shared ${what} instead of your entire screen. ` +
          `Please click "Share Entire Screen & Start" again, open the "Entire Screen" tab in the picker, and select your monitor.`
        );
        setSsRequesting(false);
        return;
      }

      // If displaySurface is undefined (Firefox/older browsers), warn but allow — we can't detect
      if (!surface) {
        console.warn("[VoiceModal] displaySurface not available — cannot verify entire screen was shared");
      }

      // Listen for the student stopping the share from the browser toolbar
      track?.addEventListener("ended", () => {
        if (!autoFailedRef.current) triggerAutoFailRef.current();
      });

      screenStreamRef.current = stream;
      setScreenSharing(true);
      setSsRequesting(false);
      connect();          // ← voice session starts only after screen share is confirmed
    } catch {
      setSsError("Screen sharing was denied or cancelled. It is required to start this assessment.");
      setSsRequesting(false);
    }
  }, [connect]);

  // ── Optional screen share for chat mode ───────────────────────────────────
  const stopScreenShare = useCallback(() => {
    if (screenIntervalRef.current) { clearInterval(screenIntervalRef.current); screenIntervalRef.current = null; }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
    setScreenSharing(false);
    wsRef.current?.readyState === WebSocket.OPEN && wsRef.current.send(JSON.stringify({ type: "screen_share_stop" }));
  }, []);

  const startScreenShareChat = useCallback(async () => {
    try {
      const stream: MediaStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: { frameRate: 1 }, audio: false });
      screenStreamRef.current = stream;
      stream.getVideoTracks()[0].onended = () => stopScreenShare();
      setScreenSharing(true); setPipMode(true);
      wsRef.current?.readyState === WebSocket.OPEN && wsRef.current.send(JSON.stringify({ type: "screen_share_start" }));
      screenIntervalRef.current = setInterval(() => {
        const v = screenVideoRef.current, c = screenCanvasRef.current, ws = wsRef.current;
        if (!v || !c || !ws || ws.readyState !== WebSocket.OPEN || !v.videoWidth) return;
        const W = Math.min(v.videoWidth, 1280), H = Math.round(v.videoHeight * (W / v.videoWidth));
        c.width = W; c.height = H;
        c.getContext("2d")!.drawImage(v, 0, 0, W, H);
        ws.send(JSON.stringify({ type: "image", data: c.toDataURL("image/jpeg", 0.7).split(",")[1], mimeType: "image/jpeg" }));
      }, 1500);
    } catch (err) {
      const e = err as Error;
      if (e.name !== "NotAllowedError" && e.name !== "NotFoundError") setErrorMsg("Screen sharing failed.");
    }
  }, [stopScreenShare]);

  // ── Mute / unmute ──────────────────────────────────────────────────────────
  async function toggleMute() {
    if (!micMuted) {
      processorRef.current?.disconnect(); processorRef.current = null; micAnalyserRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null;
      micCtxRef.current?.close().catch(() => {}); micCtxRef.current = null;
      stopAllAudio(); setMicMuted(true);
    } else {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } as any });
        streamRef.current = s;
        const mc = new AudioContext({ sampleRate: 16000 }); micCtxRef.current = mc;
        const src = mc.createMediaStreamSource(s);
        const ma  = mc.createAnalyser(); ma.fftSize = 256; micAnalyserRef.current = ma;
        const proc = mc.createScriptProcessor(1024, 1, 1); processorRef.current = proc;
        const ws = wsRef.current;
        const BARGE = 0.04, BARGE_F = 3, VAD = 0.01, VAD_H = 7; let bc = 0, vc = 0;
        proc.onaudioprocess = (e) => {
          const sa = e.inputBuffer.getChannelData(0); let sum = 0; for (let k = 0; k < sa.length; k++) sum += sa[k] * sa[k];
          const rms = Math.sqrt(sum / sa.length);
          if (rms > VAD) vc = 0; else vc++;
          if (vc <= VAD_H && ws?.readyState === WebSocket.OPEN) ws.send(float32ToInt16(sa));
          if (isAISpeakingRef.current) { if (rms > BARGE) { if (++bc >= BARGE_F) { bc = 0; stopAllAudioRef.current(); } } else bc = 0; } else bc = 0;
        };
        const sil = mc.createGain(); sil.gain.value = 0;
        src.connect(ma); ma.connect(proc); proc.connect(sil); sil.connect(mc.destination);
        setMicMuted(false);
      } catch { /* stay muted */ }
    }
  }

  // ── Mount: connect immediately for chat mode or non-proctored assessments ──
  useEffect(() => {
    setSupportsScreenShare(!!((navigator.mediaDevices as any)?.getDisplayMedia));
    setSupportsDocPip(!!(window as any).documentPictureInPicture);
    setPipPos({ x: window.innerWidth - 220, y: window.innerHeight - 308 });
    // Detect multiple monitors (Window Management API — Chrome 100+)
    setMultiMonitor(!!(window.screen as any).isExtended);
    // Chat mode and non-proctored assessments connect immediately
    if (!requiresProctoring) connect();
    return () => {
      sysPipWindowRef.current?.close();
      sysPipWindowRef.current = null;
      disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resume audio on return (chat mode only — assessment handles via proctoring)
  useEffect(() => {
    if (isAssessment) return;
    const h = () => { if (document.visibilityState === "visible") { playCtxRef.current?.resume().catch(() => {}); micCtxRef.current?.resume().catch(() => {}); } };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [isAssessment]);

  // ForcePip (chat mode)
  useEffect(() => {
    if (!forcePip || isAssessment) return;
    setPipMode(true);
    if ((window as any).documentPictureInPicture && !sysPipWindowRef.current) openSystemPip().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forcePip, isAssessment]);

  // Auto system PiP
  useEffect(() => {
    if (!pipMode || !supportsDocPip || sysPipWindowRef.current || step !== "session" || sysPipAutoOpenedRef.current || isAssessment) return;
    sysPipAutoOpenedRef.current = true;
    openSystemPip().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, pipMode, supportsDocPip, isAssessment]);

  // ── PiP helpers ────────────────────────────────────────────────────────────
  async function openSystemPip() {
    const dp = (window as any).documentPictureInPicture;
    if (!dp) return;
    try {
      const pip: Window = await dp.requestWindow({ width: 216, height: 312 });
      const st = pip.document.createElement("style");
      st.textContent = "*, *::before, *::after{box-sizing:border-box;margin:0;padding:0}body{overflow:hidden;background:transparent}@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}";
      pip.document.head.appendChild(st);
      pip.addEventListener("pagehide", () => { sysPipWindowRef.current = null; setSysPipWindow(null); sysPipAutoOpenedRef.current = false; });
      sysPipWindowRef.current = pip; setSysPipWindow(pip);
    } catch { /* user cancelled */ }
  }

  function handlePipDragStart(e: React.MouseEvent) {
    e.preventDefault();
    const o = pipPos;
    pipDragRef.current = { startX: e.clientX, startY: e.clientY, origX: o.x, origY: o.y };
    const onMove = (me: MouseEvent) => { if (!pipDragRef.current) return; setPipPos({ x: Math.max(8, Math.min(window.innerWidth - 212, pipDragRef.current.origX + me.clientX - pipDragRef.current.startX)), y: Math.max(8, Math.min(window.innerHeight - 300, pipDragRef.current.origY + me.clientY - pipDragRef.current.startY)) }); };
    const onUp   = () => { pipDragRef.current = null; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
  }

  const handleClose = () => { stopScreenShare(); disconnect(); onClose(); };

  // ── Derived ────────────────────────────────────────────────────────────────
  const assessmentData = initMessage?.type === "assessment_init"
    ? (initMessage.data as { title?: string; instructions?: string; questions?: Array<{ marks: number }> } | undefined)
    : undefined;
  const totalMarks    = assessmentData?.questions?.reduce((s, q) => s + (q.marks ?? 0), 0) ?? 0;
  const questionCount = assessmentData?.questions?.length ?? 0;
  const orbGrad = step === "error" || step === "autofailed"
    ? "radial-gradient(circle at 38% 35%, #f87171 0%, #ef4444 45%, #b91c1c 100%)"
    : avatarState === "speaking"
    ? "radial-gradient(circle at 38% 35%, #a5b4fc 0%, #6366f1 45%, #4338ca 80%, #312e81 100%)"
    : "radial-gradient(circle at 38% 35%, #93c5fd 0%, #3b82f6 45%, #1d4ed8 80%, #1e3a8a 100%)";
  const statusLabel = step === "connecting" ? "Connecting…" : step === "error" ? "Error" : step === "autofailed" ? "Terminated" : avatarState === "speaking" ? "Speaking…" : micMuted ? "Muted" : "Listening…";
  const statusColor = step === "session" ? "#4ade80" : step === "connecting" ? "#facc15" : "#f87171";

  const bg  = isDark ? "#000000" : "#ffffff";
  const c1  = isDark ? "#f9fafb" : "#111827";
  const c2  = isDark ? "#9ca3af" : "#6b7280";
  const bdr = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const hiddenMedia = (
    <>
      <video ref={screenVideoRef} autoPlay muted playsInline className="hidden" />
      <canvas ref={screenCanvasRef} className="hidden" />
    </>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // ── ASSESSMENT MODE RENDERING ────────────────────────────────────────────
  // Single full-screen overlay that switches content based on step.
  // No createPortal — renders directly as a fixed full-screen div.
  // ════════════════════════════════════════════════════════════════════════════
  if (isAssessment) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center overflow-y-auto"
        style={{ zIndex: 300000, background: bg }}
      >
        {hiddenMedia}

        {/* ── Tab-switch countdown overlay ── */}
        {leaveCountdown !== null && step === "session" && (
          <div className="fixed inset-0 flex items-center justify-center px-4" style={{ zIndex: 400000, background: "rgba(0,0,0,0.95)" }}>
            <div className="w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center" style={{ background: isDark ? "#111827" : "#ffffff" }}>
              <div className="relative w-28 h-28 mx-auto mb-5">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
                  <circle cx="56" cy="56" r="48" fill="none" stroke="#fee2e2" strokeWidth="8" />
                  <circle cx="56" cy="56" r="48" fill="none" stroke="#ef4444" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 48}`}
                    strokeDashoffset={`${2 * Math.PI * 48 * (1 - leaveCountdown / 10)}`}
                    style={{ transition: "stroke-dashoffset 0.9s linear" }} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-4xl font-black" style={{ color: "#ef4444" }}>{leaveCountdown}</span>
              </div>
              <p className="text-xl font-bold mb-2" style={{ color: "#ef4444" }}>You Left the Assessment!</p>
              <p className="text-sm leading-relaxed" style={{ color: c2 }}>
                Switching windows is <strong>not allowed</strong>. Return immediately — assessment terminates with{" "}
                <strong style={{ color: "#ef4444" }}>0 marks</strong> in{" "}
                <strong style={{ color: "#ef4444" }}>{leaveCountdown}</strong> second{leaveCountdown !== 1 ? "s" : ""}.
              </p>
            </div>
          </div>
        )}

        {/* ══ SCREEN SHARE GATE ══ */}
        {step === "screenshare" && (
          <div className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden mx-4" style={{ background: isDark ? "#111827" : "#ffffff" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: bdr }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: isDark ? "#818cf8" : "#6366f1" }}>AI Voice Assessment</p>
                <h2 className="text-sm font-bold mt-0.5" style={{ color: c1 }}>
                  {assessmentData?.title ?? selectedCourse?.name ?? "Voice Interview"}
                </h2>
              </div>
              <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ color: c2 }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {/* Body */}
            <div className="p-6 flex flex-col items-center gap-5 text-center">
              {/* Monitor icon */}
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)" }}>
                <svg width="28" height="28" fill="none" stroke="#3b82f6" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-base" style={{ color: c1 }}>Screen Share Required</p>
                <p className="text-sm mt-1" style={{ color: c2 }}>
                  Your <strong>entire screen</strong> must be shared for proctoring before the assessment can begin.
                </p>
              </div>
              {/* Steps */}
              <div className="w-full rounded-2xl p-4 text-left space-y-3" style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", border: `1px solid ${bdr}` }}>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: c2 }}>How to share correctly</p>
                {[
                  'Click "Share Entire Screen & Start" below',
                  'In the browser picker, open the "Entire Screen" or "Screen" tab',
                  'Click your monitor thumbnail, then click "Share" — do NOT select a Window or Tab',
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#3b82f6" }}>{i + 1}</span>
                    <p className="text-xs" style={{ color: isDark ? "#d1d5db" : "#374151" }}>{t}</p>
                  </div>
                ))}
                <p className="text-xs font-semibold pt-1" style={{ color: "#f59e0b" }}>
                  ⚠ Stopping the share or switching apps during the assessment will result in an automatic 0 score.
                </p>
              </div>
              {/* ── Multi-monitor warning ── */}
              {multiMonitor && (
                <div className="w-full rounded-xl px-4 py-3 text-sm text-left space-y-2" style={{ background: isDark ? "rgba(234,179,8,0.12)" : "#fefce8", border: `1px solid ${isDark ? "rgba(234,179,8,0.35)" : "#fde047"}`, color: isDark ? "#fde047" : "#713f12" }}>
                  <p className="font-bold flex items-center gap-1.5">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                    External Monitor Detected
                  </p>
                  <p className="text-xs leading-relaxed">
                    You have an additional screen connected. To ensure exam integrity,{" "}
                    <strong>disconnect your external monitor</strong> before starting. After disconnecting, click{" "}
                    <strong>Re-check</strong> to continue.
                  </p>
                  <button
                    onClick={() => setMultiMonitor(!!(window.screen as any).isExtended)}
                    className="mt-1 px-3 py-1 rounded-lg text-xs font-semibold"
                    style={{ background: isDark ? "rgba(234,179,8,0.2)" : "rgba(234,179,8,0.25)", color: isDark ? "#fde047" : "#713f12", border: `1px solid ${isDark ? "rgba(234,179,8,0.4)" : "#fde047"}` }}
                  >
                    Re-check Monitors
                  </button>
                </div>
              )}

              {ssError && (
                <div className="w-full rounded-xl px-4 py-3 text-sm text-left" style={{ background: isDark ? "rgba(239,68,68,0.12)" : "#fef2f2", border: `1px solid ${isDark ? "rgba(239,68,68,0.3)" : "#fecaca"}`, color: isDark ? "#fca5a5" : "#b91c1c" }}>
                  {ssError}
                </div>
              )}
              <div className="flex gap-3 w-full">
                <button onClick={handleClose} className="flex-1 py-2.5 rounded-2xl text-sm font-medium" style={{ border: `1px solid ${bdr}`, color: c2, background: "transparent" }}>
                  Cancel
                </button>
                <button onClick={requestScreenShareAndConnect} disabled={ssRequesting || multiMonitor} className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white disabled:opacity-50" style={{ background: multiMonitor ? "#9ca3af" : "#3b82f6" }}>
                  {ssRequesting ? "Requesting…" : multiMonitor ? "Disconnect External Monitor First" : "Share Entire Screen & Start"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ AUTO-FAILED ══ */}
        {step === "autofailed" && (
          <div className="w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center mx-4" style={{ background: isDark ? "#111827" : "#ffffff" }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: isDark ? "rgba(239,68,68,0.15)" : "#fef2f2" }}>
              <svg width="36" height="36" fill="none" stroke="#ef4444" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <p className="text-2xl font-bold mb-2" style={{ color: "#ef4444" }}>Assessment Terminated</p>
            <p className="text-sm leading-relaxed mb-6" style={{ color: c2 }}>
              A cheating violation was detected — screen share was stopped or you switched away from this window.
              Your assessment has been automatically scored <strong style={{ color: "#ef4444" }}>0 marks</strong>.
            </p>
            <button onClick={handleClose} className="w-full py-2.5 rounded-2xl text-white font-semibold text-sm" style={{ background: "#ef4444" }}>
              Close
            </button>
          </div>
        )}

        {/* ══ CONNECTING ══ */}
        {step === "connecting" && (
          <div className="flex flex-col items-center gap-5 text-center px-6">
            <div className="w-56 h-56 rounded-full flex items-center justify-center"
              style={{ background: orbGrad, boxShadow: "0 30px 90px rgba(59,130,246,0.35), inset 0 -12px 32px rgba(0,0,0,0.18)" }}>
              <div className="w-10 h-10 border-4 border-white/40 border-t-white rounded-full animate-spin" />
            </div>
            <p className="text-sm font-semibold" style={{ color: c1 }}>Connecting to AI assessor…</p>
            <p className="text-xs" style={{ color: c2 }}>This may take a few seconds</p>
          </div>
        )}

        {/* ══ LIVE SESSION ══ */}
        {step === "session" && (
          <div className="flex flex-col items-center gap-6 text-center px-6 py-8">
            {/* Proctoring badges */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: isDark ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.1)", color: isDark ? "#4ade80" : "#166534" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Connected
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: isDark ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.1)", color: isDark ? "#60a5fa" : "#1d4ed8" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />Screen Monitored
              </span>
            </div>

            {/* Orb */}
            <div ref={orbRef} className="w-56 h-56 rounded-full flex items-center justify-center"
              style={{ background: orbGrad, boxShadow: "0 30px 90px rgba(59,130,246,0.35), inset 0 -12px 32px rgba(0,0,0,0.18)", transition: "background 0.4s ease" }} />

            {/* Violation warning */}
            {violationMsg && (
              <div className="w-full max-w-sm rounded-xl px-4 py-3 text-sm font-medium" style={{ background: isDark ? "rgba(245,158,11,0.12)" : "#fffbeb", border: `1px solid ${isDark ? "rgba(245,158,11,0.3)" : "#fcd34d"}`, color: isDark ? "#fcd34d" : "#92400e" }}>
                {violationMsg}
              </div>
            )}

            <div>
              <p className="text-sm font-semibold" style={{ color: c1 }}>
                {avatarState === "speaking" ? "AI assessor is speaking…" : avatarState === "listening" ? "Listening to your answer…" : "Waiting…"}
              </p>
              <p className="text-xs mt-1" style={{ color: c2 }}>Speak naturally — the AI will guide you through each question</p>
            </div>

            {/* Assessment info */}
            {assessmentData && (
              <div className="flex items-center gap-2">
                {questionCount > 0 && <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.1)", color: isDark ? "#a5b4fc" : "#4338ca" }}>{questionCount} question{questionCount !== 1 ? "s" : ""}</span>}
                {totalMarks > 0 && <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.1)", color: isDark ? "#6ee7b7" : "#065f46" }}>{totalMarks} marks</span>}
              </div>
            )}

            {/* Controls: mute + end only (no PiP in assessment) */}
            <div className="flex items-center gap-4 mt-2">
              <button onClick={toggleMute} title={micMuted ? "Unmute" : "Mute"}
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                style={{ background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)" }}>
                {micMuted
                  ? <svg className="w-6 h-6" style={{ color: "#ef4444" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 19L5 5M12 18.75a6 6 0 0 1-6-6v-1.5M12 18.75a6 6 0 0 0 6-6v-1.5M12 18.75v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5m3 11.25a3 3 0 0 0 3-3V4.5m0 0a3 3 0 1 0-6 0v8.25" /></svg>
                  : <svg className="w-6 h-6" style={{ color: c1 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>}
              </button>
              <button onClick={handleClose} title="End session"
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ══ ERROR ══ */}
        {step === "error" && (
          <div className="flex flex-col items-center gap-5 text-center px-6 max-w-sm">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: isDark ? "rgba(239,68,68,0.15)" : "#fef2f2" }}>
              <svg width="28" height="28" fill="none" stroke="#ef4444" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <p className="font-bold" style={{ color: c1 }}>Connection Error</p>
              <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{errorMsg}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { disconnect(); setStep(requiresProctoring ? "screenshare" : "connecting"); setSsError(""); autoFailedRef.current = false; leaveViolationsRef.current = 0; if (!requiresProctoring) connect(); }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: "#6366f1" }}>
                Try Again
              </button>
              <button onClick={handleClose} className="px-5 py-2.5 rounded-xl text-sm font-medium border" style={{ borderColor: bdr, color: c2 }}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ── CHAT MODE (no assessment) — original PiP + full-screen behavior ──────
  // ════════════════════════════════════════════════════════════════════════════
  const sharedPipBody = (inSys = false) => (
    <>
      <div style={{ display: "flex", justifyContent: "center", paddingTop: inSys ? 24 : 20, paddingBottom: 10 }}>
        <div ref={orbRef} style={{ width: 88, height: 88, borderRadius: "50%", background: orbGrad, boxShadow: "0 20px 50px rgba(59,130,246,0.3), inset 0 -6px 16px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.4s ease" }}>
          {step === "connecting" && <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.35)", borderTopColor: "white", animation: "spin 0.8s linear infinite" }} />}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, paddingBottom: 12 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
        <span style={{ fontSize: 11, fontWeight: 500, color: c2 }}>{statusLabel}</span>
      </div>
      {screenSharing && (
        <div style={{ margin: "0 12px 10px", padding: "5px 10px", borderRadius: 10, background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 10, color: isDark ? "#93c5fd" : "#2563eb", fontWeight: 600 }}>Screen sharing</span>
          <button onClick={stopScreenShare} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: c2, padding: 2 }}>
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, paddingBottom: 16 }}>
        {step === "session" && (
          <button onClick={toggleMute} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: micMuted ? "rgba(239,68,68,0.15)" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)", color: micMuted ? "#ef4444" : isDark ? "#fff" : "#374151" }}>
            {micMuted ? <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 19L5 5M12 18.75a6 6 0 0 1-6-6v-1.5M12 18.75a6 6 0 0 0 6-6v-1.5M12 18.75v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5m3 11.25a3 3 0 0 0 3-3V4.5m0 0a3 3 0 1 0-6 0v8.25" /></svg>
              : <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>}
          </button>
        )}
        {step === "session" && supportsScreenShare && (
          <button onClick={screenSharing ? stopScreenShare : startScreenShareChat} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: screenSharing ? "rgba(59,130,246,0.2)" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)", color: screenSharing ? "#60a5fa" : isDark ? "#fff" : "#374151", boxShadow: screenSharing ? "0 0 0 2px rgba(59,130,246,0.4)" : "none" }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" /></svg>
          </button>
        )}
        <button onClick={handleClose} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </>
  );

  if (pipMode) {
    return (
      <>
        {hiddenMedia}
        {sysPipWindow && createPortal(
          <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100vh", background: isDark ? "#1f2937" : "#fff", fontFamily: "system-ui,-apple-system,sans-serif", overflow: "hidden" }}>
            <div style={{ padding: "9px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${bdr}`, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
              <svg width="12" height="12" fill="none" stroke={c2} strokeWidth={2} viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>
              <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: c2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedCourse?.name ?? "Voice Agent"}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: statusColor, fontWeight: 600, flexShrink: 0 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: statusColor }} />{statusLabel}</span>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>{sharedPipBody(true)}</div>
          </div>,
          sysPipWindow.document.body
        )}
        {!sysPipWindow && (
          <div style={{ position: "fixed", left: pipPos.x, top: pipPos.y, zIndex: 300000, width: 204, background: isDark ? "#1f2937" : "#fff", borderRadius: 20, boxShadow: "0 25px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)", overflow: "hidden", userSelect: "none" }}>
            <div onMouseDown={handlePipDragStart} style={{ cursor: "grab", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", padding: "9px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${bdr}` }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginRight: 8, opacity: 0.4 }}>{[0,1,2].map((i)=><div key={i} style={{ display:"flex",gap:3 }}><div style={{ width:3,height:3,borderRadius:"50%",background:isDark?"#fff":"#000" }}/><div style={{ width:3,height:3,borderRadius:"50%",background:isDark?"#fff":"#000" }}/></div>)}</div>
              <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: c2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedCourse?.name ?? "Voice Agent"}</span>
              {supportsDocPip && step === "session" && <button onClick={openSystemPip} title="Float" style={{ marginLeft: 4, padding: 4, borderRadius: 6, border: "none", background: "rgba(59,130,246,0.15)", cursor: "pointer", color: isDark ? "#93c5fd" : "#2563eb", display: "flex", alignItems: "center" }}><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><rect x="12.5" y="9.5" width="7.5" height="5" rx="1" fill="currentColor" opacity="0.3"/><rect x="12.5" y="9.5" width="7.5" height="5" rx="1"/></svg></button>}
              <button onClick={() => setPipMode(false)} title="Expand" style={{ marginLeft: 4, padding: 4, borderRadius: 6, border: "none", background: "none", cursor: "pointer", color: c2, display: "flex", alignItems: "center" }}><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"/></svg></button>
            </div>
            {sharedPipBody(false)}
          </div>
        )}
      </>
    );
  }

  // Full-screen chat mode
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-y-auto py-8" style={{ zIndex: 300000, background: bg }}>
      {hiddenMedia}
      <div className="flex flex-col items-center gap-3 mb-8 px-6 w-full max-w-sm">
        {instLogo ? <img src={instLogo} alt="logo" className="w-16 h-16 rounded-2xl object-contain shadow-lg" style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }} />
          : <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg" style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", color: c1 }}>{instName?.charAt(0).toUpperCase() ?? "S"}</div>}
        <p className="text-xl font-bold tracking-tight text-center" style={{ color: c1 }}>{instName || "SmartEdX"}</p>
        {selectedCourse && <span className="text-sm font-medium px-4 py-1.5 rounded-full" style={{ background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)", color: isDark ? "#d1d5db" : "#374151" }}>{selectedCourse.name}</span>}
        {label && <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: c2 }}>{label}</span>}
      </div>
      <div ref={orbRef} className="w-56 h-56 rounded-full flex items-center justify-center mb-6"
        style={{ background: orbGrad, boxShadow: "0 30px 90px rgba(59,130,246,0.35), inset 0 -12px 32px rgba(0,0,0,0.18)", transition: "background 0.4s ease" }}>
        {step === "connecting" && <div className="w-10 h-10 border-4 border-white/40 border-t-white rounded-full animate-spin" />}
      </div>
      <div className="mb-12 flex items-center gap-2 px-4 py-1.5 rounded-full" style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${step === "session" ? "bg-green-400 animate-pulse" : step === "connecting" ? "bg-yellow-400 animate-pulse" : "bg-red-400"}`} />
        <span className="text-xs font-medium" style={{ color: isDark ? "#d1d5db" : "#374151" }}>{step === "connecting" ? "Connecting…" : step === "session" ? "Connected" : "Error"}</span>
      </div>
      {step === "error" && errorMsg && (
        <div className="mb-6 w-full max-w-sm px-6">
          <div className="rounded-xl px-4 py-3 text-sm text-center" style={{ background: isDark ? "rgba(239,68,68,0.12)" : "#fef2f2", border: `1px solid ${isDark ? "rgba(239,68,68,0.3)" : "#fecaca"}`, color: isDark ? "#fca5a5" : "#b91c1c" }}>{errorMsg}</div>
        </div>
      )}
      <div className="flex items-center gap-4">
        {step === "session" && (
          <button onClick={toggleMute} className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95" style={{ background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)", backdropFilter: "blur(12px)" }}>
            {micMuted ? <svg className="w-6 h-6" style={{ color: "#ef4444" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 19L5 5M12 18.75a6 6 0 0 1-6-6v-1.5M12 18.75a6 6 0 0 0 6-6v-1.5M12 18.75v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5m3 11.25a3 3 0 0 0 3-3V4.5m0 0a3 3 0 1 0-6 0v8.25" /></svg>
              : <svg className="w-6 h-6" style={{ color: c1 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>}
          </button>
        )}
        {step === "session" && supportsScreenShare && (
          <button onClick={screenSharing ? stopScreenShare : startScreenShareChat} className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95" style={{ background: screenSharing ? "rgba(59,130,246,0.25)" : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)", backdropFilter: "blur(12px)", color: screenSharing ? "#60a5fa" : c1, boxShadow: screenSharing ? "0 0 0 2px rgba(59,130,246,0.5)" : "none" }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" /></svg>
          </button>
        )}
        {step === "session" && (
          <button onClick={() => { setPipMode(true); if ((window as any).documentPictureInPicture && !sysPipWindowRef.current) openSystemPip().catch(() => {}); }}
            className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95" style={{ background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)", backdropFilter: "blur(12px)" }}>
            <svg className="w-6 h-6" style={{ color: c1 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="12.5" y="10" width="7" height="4.5" rx="1" fill="currentColor" opacity="0.25"/><rect x="12.5" y="10" width="7" height="4.5" rx="1"/></svg>
          </button>
        )}
        {step === "error" && (
          <button onClick={connect} className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95" style={{ background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)", backdropFilter: "blur(12px)" }}>
            <svg className="w-6 h-6" style={{ color: c1 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
          </button>
        )}
        <button onClick={handleClose} className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95" style={{ background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)", backdropFilter: "blur(12px)" }}>
          <svg className="w-6 h-6" style={{ color: c1 }} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
}
