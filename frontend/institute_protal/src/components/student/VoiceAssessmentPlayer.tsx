"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FiMic, FiMicOff, FiX, FiCheck, FiAlertCircle,
  FiVolume2, FiVolumeX, FiRotateCcw, FiAward,
  FiLoader, FiSkipForward,
} from "react-icons/fi";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VoiceQuestion {
  id: string;
  question: string;
  expected_answer: string;
  marks: number;
  hints: string[];
}

interface VoiceAssessment {
  id: string;
  title: string;
  instructions: string;
  questions: VoiceQuestion[];
  createdAt: string;
  instituteId: string;
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
    id: string;
    title: string;
    instructions?: string;
    questions: VoiceQuestion[];
  };
}

// ─── Interview phases ─────────────────────────────────────────────────────────
type InterviewPhase = "speaking" | "listening" | "confirming";
type SessionStep = "lookup" | "intro" | "interview" | "evaluating" | "results";

// ─── Speech helpers ───────────────────────────────────────────────────────────

function speak(text: string, onEnd?: () => void): void {
  if (typeof window === "undefined" || !window.speechSynthesis) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.92;
  utt.pitch = 1.05;
  utt.volume = 1;
  if (onEnd) utt.onend = onEnd;
  window.speechSynthesis.speak(utt);
}

function stopSpeaking() {
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}

// ─── Waveform bars ────────────────────────────────────────────────────────────

function WaveformBars({ active }: { active: boolean }) {
  const heights = [35, 60, 80, 55, 90, 65, 40, 75, 50, 85, 45, 70];
  return (
    <div className="flex items-center justify-center gap-0.5 h-10">
      {heights.map((h, i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-all ${active ? "bg-green-400" : "bg-gray-300 dark:bg-gray-600"}`}
          style={{
            height: active ? `${h}%` : "20%",
            animation: active ? `waveBar 0.8s ease-in-out infinite alternate` : "none",
            animationDelay: `${i * 60}ms`,
          }}
        />
      ))}
      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function InterviewerAvatar({ phase }: { phase: InterviewPhase | "idle" }) {
  const ringColor =
    phase === "speaking"   ? "ring-purple-400 shadow-purple-400/40" :
    phase === "listening"  ? "ring-green-400 shadow-green-400/40"   :
    phase === "confirming" ? "ring-gray-300 dark:ring-gray-600 shadow-transparent" :
                             "ring-gray-200 dark:ring-gray-700 shadow-transparent";
  const pulse = phase === "speaking" || phase === "listening";

  return (
    <div className="relative flex items-center justify-center">
      {pulse && (
        <span className={`absolute inset-0 rounded-full ${
          phase === "speaking" ? "bg-purple-400/30" : "bg-green-400/30"
        } animate-ping`} style={{ borderRadius: "50%" }} />
      )}
      <div className={`relative w-24 h-24 rounded-full ring-4 shadow-lg transition-all duration-500 ${ringColor}
        bg-linear-to-br from-indigo-600 via-purple-600 to-violet-700 flex items-center justify-center`}>
        {phase === "speaking" ? (
          <FiVolume2 className="w-10 h-10 text-white" />
        ) : phase === "listening" ? (
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

export default function VoiceAssessmentPlayer({ isOpen, onClose, assessmentData }: VoiceAssessmentPlayerProps) {
  const [assessment, setAssessment]     = useState<VoiceAssessment | null>(null);
  const [code, setCode]                 = useState("");
  const [lookupError, setLookupError]   = useState("");

  const [step, setStep]                 = useState<SessionStep>(assessmentData ? "intro" : "lookup");
  const [phase, setPhase]               = useState<InterviewPhase>("speaking");
  const [qIndex, setQIndex]             = useState(0);
  const [answers, setAnswers]           = useState<Record<string, string>>({});
  const [liveTranscript, setLiveTranscript] = useState("");
  const [confirmedAnswer, setConfirmedAnswer] = useState("");
  const [ttsEnabled, setTtsEnabled]     = useState(true);
  const [hintShown, setHintShown]       = useState(false);
  const [evalResult, setEvalResult]     = useState<EvalResult | null>(null);
  const [evalError, setEvalError]       = useState("");
  const [transitioning, setTransitioning] = useState(false);

  const recognitionRef  = useRef<SpeechRecognition | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const currentQ = assessment?.questions[qIndex];
  const totalQ   = assessment?.questions.length ?? 0;
  const totalMarks = assessment?.questions.reduce((s, q) => s + q.marks, 0) ?? 0;

  // ── Seed from prop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (assessmentData && isOpen) {
      setAssessment({
        id: assessmentData.id,
        title: assessmentData.title,
        instructions: assessmentData.instructions ?? "",
        questions: assessmentData.questions,
        createdAt: new Date().toISOString(),
        instituteId: "",
      });
      setStep("intro");
      setQIndex(0);
      setAnswers({});
      setLiveTranscript("");
      setConfirmedAnswer("");
      setEvalResult(null);
      setEvalError("");
    }
  }, [assessmentData, isOpen]);

  // ── Cleanup on close ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      stopSpeaking();
      recognitionRef.current?.abort();
    }
  }, [isOpen]);

  // ── Start recording helper ────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition as (typeof globalThis.SpeechRecognition) | undefined;

    if (!SR) {
      setPhase("confirming");
      return;
    }
    const rec = new SR();
    rec.continuous       = true;
    rec.interimResults   = true;
    rec.lang             = "en-US";
    rec.maxAlternatives  = 1;

    let finalText = "";

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " ";
        else interim = t;
      }
      setLiveTranscript((finalText + interim).trim());
    };

    rec.onerror = () => {
      setPhase("confirming");
      setConfirmedAnswer(finalText.trim() || liveTranscript);
    };

    rec.onend = () => {
      const captured = (finalText || liveTranscript).trim();
      setConfirmedAnswer(captured);
      setPhase("confirming");
    };

    recognitionRef.current = rec;
    rec.start();
    setPhase("listening");
    setLiveTranscript("");
  }, [liveTranscript]);

  // ── Ask question ──────────────────────────────────────────────────────────
  const askQuestion = useCallback((q: VoiceQuestion, idx: number) => {
    setPhase("speaking");
    setLiveTranscript("");
    setConfirmedAnswer("");
    setHintShown(false);

    const text = `Question ${idx + 1}. ${q.question}`;
    if (ttsEnabled) {
      speak(text, () => startListening());
    } else {
      // Short delay so UI renders before mic opens
      setTimeout(() => startListening(), 600);
    }
  }, [ttsEnabled, startListening]);

  // ── Start session ─────────────────────────────────────────────────────────
  function startSession() {
    setQIndex(0);
    setAnswers({});
    setLiveTranscript("");
    setConfirmedAnswer("");
    setEvalResult(null);
    setEvalError("");
    setStep("interview");
    if (assessment) askQuestion(assessment.questions[0], 0);
  }

  // ── Trigger askQuestion when qIndex/step changes during interview ─────────
  useEffect(() => {
    if (step === "interview" && assessment && !transitioning) {
      askQuestion(assessment.questions[qIndex], qIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, qIndex, assessment]);

  // ── Stop listening manually ───────────────────────────────────────────────
  function stopListening() {
    recognitionRef.current?.stop();
    // onend fires → confirming
  }

  // ── Re-record ─────────────────────────────────────────────────────────────
  function reRecord() {
    setLiveTranscript("");
    setConfirmedAnswer("");
    if (ttsEnabled && currentQ) {
      speak(`Question ${qIndex + 1}. ${currentQ.question}`, () => startListening());
    } else {
      startListening();
    }
    setPhase("speaking");
  }

  // ── Confirm answer and advance ────────────────────────────────────────────
  function confirmAnswer() {
    if (!currentQ) return;
    stopSpeaking();
    recognitionRef.current?.abort();

    const ans = confirmedAnswer || liveTranscript;
    const updated = { ...answers, [currentQ.id]: ans };
    setAnswers(updated);

    if (qIndex + 1 < totalQ) {
      // Transition message
      setTransitioning(true);
      if (ttsEnabled) {
        const phrases = ["Got it. Moving on.", "Thank you. Next question.", "Noted. Let's continue."];
        speak(phrases[qIndex % phrases.length], () => {
          setTransitioning(false);
          setQIndex((i) => i + 1);
        });
      } else {
        setTimeout(() => {
          setTransitioning(false);
          setQIndex((i) => i + 1);
        }, 400);
      }
    } else {
      submitForEvaluation(updated);
    }
  }

  // ── Skip question ─────────────────────────────────────────────────────────
  function skipQuestion() {
    if (!currentQ) return;
    stopSpeaking();
    recognitionRef.current?.abort();
    const updated = { ...answers, [currentQ.id]: "" };
    setAnswers(updated);
    if (qIndex + 1 < totalQ) {
      setQIndex((i) => i + 1);
    } else {
      submitForEvaluation(updated);
    }
  }

  // ── Evaluate ──────────────────────────────────────────────────────────────
  async function submitForEvaluation(finalAnswers: Record<string, string>) {
    setStep("evaluating");
    stopSpeaking();
    if (ttsEnabled) speak("Interview complete. I am now evaluating your performance. Please wait.");

    try {
      const studentAnswers = (assessment?.questions ?? []).map((q) => ({
        question_id: q.id,
        answer: finalAnswers[q.id] ?? "",
      }));

      const res = await fetch(`${apiUrl}/api/ai/voice-assessment/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: assessment?.questions, student_answers: studentAnswers }),
      });
      if (!res.ok) throw new Error(res.statusText);
      const data: EvalResult = await res.json();
      setEvalResult(data);
      setStep("results");

      if (ttsEnabled) {
        speak(
          `Interview complete! You scored ${data.total_score} out of ${data.total_marks} marks. ` +
          `Grade ${data.grade}. ` +
          (data.passed ? "Congratulations, you passed!" : "Keep practising and try again!") +
          ` ${data.overall_feedback}`
        );
      }
    } catch {
      setEvalError("Evaluation failed. Please check your connection.");
      setStep("interview");
      if (assessment) askQuestion(assessment.questions[qIndex], qIndex);
    }
  }

  // ── Lookup (code-based, fallback) ─────────────────────────────────────────
  function handleLookup() {
    const trimmed = code.trim();
    if (!trimmed) { setLookupError("Enter an assessment code."); return; }
    const all: VoiceAssessment[] = JSON.parse(localStorage.getItem("voiceAssessments") || "[]");
    const found = all.find((a) => a.id === trimmed);
    if (!found) { setLookupError("No assessment found. Ask your teacher for the correct code."); return; }
    setAssessment(found);
    setLookupError("");
    setStep("intro");
  }

  if (!isOpen) return null;

  // ─── Render ───────────────────────────────────────────────────────────────
  const modal = (
    <div className="fixed inset-0 z-999999 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-950 rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ maxHeight: "92vh" }}>

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-widest">AI Interview</p>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {assessment?.title ?? "Voice Assessment"}
            </h2>
          </div>

          {/* Progress dots */}
          {step === "interview" && (
            <div className="flex items-center gap-1">
              {Array.from({ length: totalQ }).map((_, i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i < qIndex ? "bg-purple-400" :
                  i === qIndex ? "bg-purple-600 w-4" :
                  "bg-gray-200 dark:bg-gray-700"
                }`} />
              ))}
            </div>
          )}

          <button
            onClick={() => { setTtsEnabled((v) => !v); stopSpeaking(); }}
            title={ttsEnabled ? "Mute AI voice" : "Enable AI voice"}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {ttsEnabled ? <FiVolume2 className="w-4 h-4" /> : <FiVolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { stopSpeaking(); recognitionRef.current?.abort(); onClose(); }}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* ── Lookup ── */}
        {step === "lookup" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-5">
            <InterviewerAvatar phase="idle" />
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Enter Assessment Code</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Get the code from your teacher</p>
            </div>
            <div className="w-full max-w-xs space-y-3">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                placeholder="e.g. va_1234567890"
                className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 text-center font-mono tracking-wide"
              />
              {lookupError && (
                <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                  <FiAlertCircle className="w-3.5 h-3.5 shrink-0" /> {lookupError}
                </p>
              )}
              <button
                onClick={handleLookup}
                className="w-full py-3 rounded-xl text-sm font-bold text-white bg-linear-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 transition-all shadow-md shadow-purple-500/25"
              >
                Find Assessment
              </button>
            </div>
          </div>
        )}

        {/* ── Intro ── */}
        {step === "intro" && assessment && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center overflow-y-auto">
            <InterviewerAvatar phase="idle" />
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{assessment.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {totalQ} question{totalQ !== 1 ? "s" : ""} · {totalMarks} total marks
              </p>
            </div>

            <div className="w-full max-w-sm text-left rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-5 space-y-3">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">How this works</p>
              <div className="space-y-2.5">
                {[
                  { icon: <FiVolume2 className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />, text: "The AI interviewer will read each question aloud" },
                  { icon: <FiMic className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />, text: "Your microphone activates automatically — speak your answer clearly" },
                  { icon: <FiCheck className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />, text: "Review your answer, then confirm or re-record before moving on" },
                  { icon: <FiAward className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />, text: "AI grades your responses and gives detailed feedback at the end" },
                ].map(({ icon, text }, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    {icon}
                    <p className="text-xs text-gray-600 dark:text-gray-400">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={startSession}
              className="px-8 py-3.5 rounded-2xl text-sm font-bold text-white bg-linear-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/30 flex items-center gap-2.5"
            >
              <FiMic className="w-4 h-4" /> Begin Interview
            </button>
          </div>
        )}

        {/* ── Interview ── */}
        {step === "interview" && currentQ && (
          <div className="flex-1 flex flex-col items-center gap-5 px-6 py-7 overflow-y-auto">

            {/* Interviewer */}
            <div className="flex flex-col items-center gap-3">
              <InterviewerAvatar phase={transitioning ? "idle" : phase} />
              <p className={`text-xs font-semibold tracking-wide transition-colors ${
                phase === "speaking"   ? "text-purple-500 dark:text-purple-400" :
                phase === "listening"  ? "text-green-500 dark:text-green-400"   :
                phase === "confirming" ? "text-gray-500 dark:text-gray-400"     :
                                        "text-gray-400"
              }`}>
                {transitioning                ? "Moving to next question…" :
                 phase === "speaking"         ? "AI is asking the question…" :
                 phase === "listening"        ? "Listening — speak your answer" :
                 phase === "confirming"       ? "Review your answer" : ""}
              </p>
            </div>

            {/* Question bubble */}
            <div className="w-full rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{qIndex + 1}</span>
                <span className="text-[10px] font-bold text-purple-500 dark:text-purple-400 uppercase tracking-widest">Question · {currentQ.marks} mark{currentQ.marks !== 1 ? "s" : ""}</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-relaxed">{currentQ.question}</p>

              {/* Hint */}
              {!hintShown ? (
                <button
                  onClick={() => setHintShown(true)}
                  className="mt-2.5 text-[11px] text-purple-400 hover:text-purple-600 underline underline-offset-2"
                >
                  Need a hint?
                </button>
              ) : (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {currentQ.hints.map((h, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-[11px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">{h}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Listening state */}
            {(phase === "listening" || phase === "speaking") && !transitioning && (
              <div className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-5 flex flex-col items-center gap-4">
                <WaveformBars active={phase === "listening"} />

                {phase === "listening" && (
                  <>
                    {liveTranscript ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300 text-center italic leading-relaxed min-h-10">
                        &ldquo;{liveTranscript}&rdquo;
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Waiting for your voice…</p>
                    )}
                    <button
                      onClick={stopListening}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-md shadow-red-500/25"
                    >
                      <FiMicOff className="w-4 h-4" /> Stop Recording
                    </button>
                  </>
                )}

                {phase === "speaking" && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">Microphone will activate after the question…</p>
                )}
              </div>
            )}

            {/* Confirming state */}
            {phase === "confirming" && !transitioning && (
              <div className="w-full space-y-3">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                  <p className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-2">Your Answer</p>
                  {confirmedAnswer ? (
                    <p className="text-sm text-gray-800 dark:text-white italic leading-relaxed">
                      &ldquo;{confirmedAnswer}&rdquo;
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">No answer captured</p>
                  )}
                </div>

                {evalError && (
                  <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                    <FiAlertCircle className="w-3.5 h-3.5 shrink-0" /> {evalError}
                  </p>
                )}

                <div className="flex gap-2.5">
                  <button
                    onClick={reRecord}
                    className="flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <FiRotateCcw className="w-3.5 h-3.5" /> Re-record
                  </button>
                  <button
                    onClick={confirmAnswer}
                    className="flex items-center justify-center gap-1.5 flex-2 py-2.5 rounded-xl text-sm font-bold text-white bg-linear-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 transition-all shadow-md shadow-green-500/25"
                  >
                    <FiCheck className="w-4 h-4" />
                    {qIndex + 1 < totalQ ? "Confirm & Next" : "Submit Interview"}
                  </button>
                </div>

                <button
                  onClick={skipQuestion}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <FiSkipForward className="w-3.5 h-3.5" />
                  Skip this question
                </button>
              </div>
            )}

            {/* Transition overlay */}
            {transitioning && (
              <div className="w-full rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-5 flex flex-col items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Evaluating ── */}
        {step === "evaluating" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-5 text-center">
            <InterviewerAvatar phase="idle" />
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Evaluating your interview…</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI is reviewing all your answers</p>
            </div>
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {step === "results" && evalResult && (
          <div className="flex-1 overflow-y-auto">
            {/* Score hero */}
            <div className={`px-6 py-8 text-center border-b border-gray-100 dark:border-gray-800 ${
              evalResult.passed
                ? "bg-linear-to-b from-green-50 to-white dark:from-green-950/30 dark:to-transparent"
                : "bg-linear-to-b from-orange-50 to-white dark:from-orange-950/20 dark:to-transparent"
            }`}>
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-4xl font-black mb-4 ${
                evalResult.passed
                  ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400"
                  : "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400"
              }`}>
                {evalResult.grade}
              </div>
              <p className="text-3xl font-black text-gray-900 dark:text-white">
                {evalResult.total_score} <span className="text-gray-400 font-normal text-xl">/ {evalResult.total_marks}</span>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{evalResult.percentage}% · {evalResult.passed ? "Passed ✓" : "Keep practising"}</p>
              <p className="mt-4 text-xs text-gray-600 dark:text-gray-400 max-w-xs mx-auto leading-relaxed italic">
                &quot;{evalResult.overall_feedback}&quot;
              </p>
            </div>

            {/* Per-question */}
            <div className="p-5 space-y-3">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Question Breakdown</p>
              {evalResult.results.map((r, i) => (
                <div key={r.question_id} className={`rounded-2xl border overflow-hidden ${
                  r.percentage >= 70 ? "border-green-200 dark:border-green-800" :
                  r.percentage >= 40 ? "border-yellow-200 dark:border-yellow-800" :
                                       "border-red-200 dark:border-red-800"
                }`}>
                  <div className={`flex items-start gap-3 px-4 py-3 ${
                    r.percentage >= 70 ? "bg-green-50 dark:bg-green-950/30" :
                    r.percentage >= 40 ? "bg-yellow-50 dark:bg-yellow-950/20" :
                                         "bg-red-50 dark:bg-red-950/20"
                  }`}>
                    <span className="shrink-0 w-5 h-5 rounded-full bg-white dark:bg-gray-900 text-xs font-bold flex items-center justify-center text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{i + 1}</span>
                    <p className="flex-1 text-xs font-medium text-gray-800 dark:text-white leading-snug">{r.question}</p>
                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                      r.percentage >= 70 ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300" :
                      r.percentage >= 40 ? "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300" :
                                           "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"
                    }`}>{r.score}/{r.marks_available}</span>
                  </div>
                  <div className="px-4 py-3 space-y-2 bg-white dark:bg-gray-950">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Your answer</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 italic leading-snug">
                        &ldquo;{r.student_answer || "No answer given"}&rdquo;
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">AI Feedback</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 leading-snug">{r.feedback}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Results footer ── */}
        {step === "results" && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 shrink-0">
            <button
              onClick={() => { stopSpeaking(); setStep("intro"); setEvalResult(null); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => { stopSpeaking(); onClose(); }}
              className="flex-2 py-2.5 rounded-xl text-sm font-bold text-white bg-linear-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 transition-all shadow-md shadow-purple-500/20"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
}
