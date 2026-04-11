"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { examService, Exam, ExamQuestion, ExamStatus } from "@/services/examService";
import { useFeatures } from "@/context/InstituteFeatureContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: ExamStatus) {
  const map: Record<ExamStatus, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" },
    scheduled: { label: "Upcoming", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
    active: { label: "Live Now", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 animate-pulse" },
    completed: { label: "Ended", cls: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" },
  };
  const { label, cls } = map[status];
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>;
}

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

// ─── Countdown timer ──────────────────────────────────────────────────────────

function Countdown({ endsAt }: { endsAt: Date }) {
  const [secs, setSecs] = useState(Math.max(0, Math.floor((endsAt.getTime() - Date.now()) / 1000)));
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const urgent = secs < 300;
  return (
    <span className={`font-mono text-sm font-semibold ${urgent ? "text-red-500" : "text-gray-700 dark:text-gray-200"}`}>
      {h > 0 && `${h}h `}{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

// ─── Face Verify Modal ────────────────────────────────────────────────────────

function FaceVerifyModal({
  exam,
  instituteId,
  onVerified,
  onClose,
}: {
  exam: Exam;
  instituteId: string;
  onVerified: () => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "verifying" | "success" | "failed">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("ready");
      } catch {
        setStatus("failed");
        setErrorMsg("Cannot access camera. Please enable camera permissions and try again.");
      }
    })();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const stopCamera = () => streamRef.current?.getTracks().forEach((t) => t.stop());

  const handleVerify = async () => {
    if (!videoRef.current) return;
    setStatus("verifying");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      canvas.getContext("2d")!.drawImage(videoRef.current, 0, 0);
      const imageB64 = canvas.toDataURL("image/jpeg", 0.92);

      const result = await examService.verifyFace(imageB64);
      if (result?.verified) {
        setStatus("success");
        stopCamera();
        setTimeout(onVerified, 900);
      } else {
        setStatus("failed");
        setErrorMsg(
          result
            ? `Face not recognized (distance ${result.distance.toFixed(3)} > threshold ${result.threshold}). Ensure you are enrolled and well-lit.`
            : "Verification failed. Make sure your face is enrolled in Account Settings."
        );
      }
    } catch {
      setStatus("failed");
      setErrorMsg("An error occurred during verification. Please try again.");
    }
  };

  const handleClose = () => { stopCamera(); onClose(); };
  const retry = () => { setStatus("ready"); setErrorMsg(""); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">Face Verification Required</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{exam.title}</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">✕</button>
        </div>

        <div className="p-6 flex flex-col items-center gap-5">
          {/* Camera feed */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            {/* Oval guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-36 h-44 rounded-full border-4 border-white/60" style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }} />
            </div>
            {status === "success" && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-500/80">
                <span className="text-white text-5xl">✓</span>
              </div>
            )}
          </div>

          {/* Status / error */}
          {status === "loading" && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Starting camera…</p>
          )}
          {status === "ready" && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Position your face within the oval and click <strong>Verify</strong>.
            </p>
          )}
          {status === "verifying" && (
            <p className="text-sm text-blue-600 dark:text-blue-400 text-center animate-pulse">Verifying identity…</p>
          )}
          {status === "success" && (
            <p className="text-sm font-semibold text-green-600 dark:text-green-400 text-center">Identity verified! Starting exam…</p>
          )}
          {status === "failed" && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 text-center w-full">
              {errorMsg || "Verification failed."}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <button onClick={handleClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5">
              Cancel
            </button>
            {status === "failed" ? (
              <button onClick={retry} className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600">
                Try Again
              </button>
            ) : (
              <button
                onClick={handleVerify}
                disabled={status !== "ready"}
                className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-40"
              >
                {status === "verifying" ? "Verifying…" : "Verify Identity"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Take Exam Modal (with proctoring) ────────────────────────────────────────

function TakeExamModal({
  exam,
  instituteId,
  onSubmit,
  onClose,
}: {
  exam: Exam;
  instituteId: string;
  onSubmit: (answers: Record<string, number | string>) => Promise<void>;
  onClose: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [flagWarning, setFlagWarning] = useState("");
  const endsAt = exam.scheduledAt
    ? new Date(new Date(exam.scheduledAt).getTime() + exam.durationMinutes * 60_000)
    : new Date(Date.now() + exam.durationMinutes * 60_000);

  const submitRef = useRef(false);
  const flagCooldown = useRef<Record<string, number>>({});

  // Auto-submit when time expires
  useEffect(() => {
    const check = setInterval(() => {
      if (Date.now() >= endsAt.getTime() && !submitRef.current) {
        submitRef.current = true;
        handleSubmit();
      }
    }, 5000);
    return () => clearInterval(check);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  // ── Proctoring: tab / window switch ──────────────────────────────────────
  useEffect(() => {
    const reportFlag = (type: Parameters<typeof examService.reportIntegrityFlag>[2]) => {
      const now = Date.now();
      const last = flagCooldown.current[type] ?? 0;
      if (now - last < 10_000) return; // de-bounce: once per 10 s per type
      flagCooldown.current[type] = now;
      examService.reportIntegrityFlag(instituteId, exam.id, type);
      setFlagWarning(
        type === "tab_switch"
          ? "⚠️ Tab switch detected and recorded."
          : type === "fullscreen_exit"
          ? "⚠️ Fullscreen exit recorded."
          : "⚠️ Integrity event recorded."
      );
      setTimeout(() => setFlagWarning(""), 5000);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") reportFlag("tab_switch");
    };
    const onBlur = () => reportFlag("tab_switch");
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) reportFlag("fullscreen_exit");
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    // Request fullscreen on start
    document.documentElement.requestFullscreen?.().catch(() => {});

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.exitFullscreen?.().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam.id, instituteId]);

  // ── Proctoring: camera presence check ────────────────────────────────────
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const faceCheckVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let faceapi: typeof import("@vladmandic/face-api") | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let mounted = true;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        cameraStreamRef.current = stream;

        // Silent video element for detection
        const video = document.createElement("video");
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
        faceCheckVideoRef.current = video;

        // Dynamically load face-api models
        faceapi = await import("@vladmandic/face-api");
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");

        // Check every 30 s
        intervalId = setInterval(async () => {
          if (!mounted || !faceCheckVideoRef.current || !faceapi) return;
          try {
            const detections = await faceapi.detectAllFaces(
              faceCheckVideoRef.current,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.4 })
            );
            const count = detections.length;
            const now = Date.now();

            if (count === 0) {
              const last = flagCooldown.current["face_absent"] ?? 0;
              if (now - last >= 30_000) {
                flagCooldown.current["face_absent"] = now;
                examService.reportIntegrityFlag(instituteId, exam.id, "face_absent");
                setFlagWarning("⚠️ Face not detected. Please stay in front of the camera.");
                setTimeout(() => setFlagWarning(""), 6000);
              }
            } else if (count > 1) {
              const last = flagCooldown.current["multiple_faces"] ?? 0;
              if (now - last >= 30_000) {
                flagCooldown.current["multiple_faces"] = now;
                examService.reportIntegrityFlag(instituteId, exam.id, "multiple_faces");
                setFlagWarning("⚠️ Multiple faces detected. Only one person allowed during the exam.");
                setTimeout(() => setFlagWarning(""), 6000);
              }
            }
          } catch {
            // face detection can fail silently
          }
        }, 30_000);
      } catch {
        // Camera denied → flag camera_disabled once
        examService.reportIntegrityFlag(instituteId, exam.id, "camera_disabled");
      }
    })();

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam.id, instituteId]);

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit(answers);
    setSubmitting(false);
  };

  const q: ExamQuestion = exam.questions[currentQ];
  const answered = Object.keys(answers).filter((k) => answers[k] !== "" && answers[k] !== undefined).length;
  const total = exam.questions.length;
  const progress = Math.round((answered / total) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-950 overflow-y-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-bold text-gray-900 dark:text-white truncate">{exam.title}</span>
          <span className="text-xs text-gray-400 hidden sm:block">{exam.courseName}</span>
          {/* Proctoring indicator */}
          <span className="hidden sm:flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            Monitored
          </span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span>{answered}/{total} answered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-gray-400"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <Countdown endsAt={endsAt} />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200 dark:bg-gray-800">
        <div className="h-1 bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Integrity warning toast */}
      {flagWarning && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg">
          {flagWarning}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
        {exam.instructions && (
          <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
            {exam.instructions}
          </div>
        )}

        {/* Question navigator */}
        <div className="flex flex-wrap gap-2">
          {exam.questions.map((qItem, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold border transition-colors ${
                i === currentQ
                  ? "bg-brand-500 text-white border-brand-500"
                  : answers[qItem.id] !== undefined && answers[qItem.id] !== ""
                  ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Current question */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold shrink-0 ${q.type === "essay" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"}`}>
                {(q.type ?? "mcq").toUpperCase()}
              </span>
              <p className="text-gray-900 dark:text-white font-medium leading-relaxed">{q.question}</p>
            </div>
            <span className="text-xs text-gray-400 shrink-0">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
          </div>

          {/* MCQ options */}
          {(q.type === "mcq" || !q.type) && q.options && (
            <div className="flex flex-col gap-3">
              {q.options.map((opt, oi) => {
                const selected = answers[q.id] === oi;
                return (
                  <button
                    key={oi}
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                    className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                      selected
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-400"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${selected ? "border-brand-500 bg-brand-500 text-white" : "border-gray-300 dark:border-gray-600 text-gray-500"}`}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span className={`text-sm ${selected ? "text-brand-700 dark:text-brand-300 font-medium" : "text-gray-700 dark:text-gray-300"}`}>{opt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Essay */}
          {q.type === "essay" && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Write your answer below. Your response will be reviewed by the teacher.</p>
              <textarea
                value={(answers[q.id] as string) ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                placeholder="Type your answer here…"
                rows={8}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-800 dark:text-white placeholder-gray-400 outline-none focus:border-brand-400 resize-none"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentQ((c) => Math.max(0, c - 1))}
            disabled={currentQ === 0}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40"
          >
            ← Previous
          </button>

          {currentQ < total - 1 ? (
            <button
              onClick={() => setCurrentQ((c) => Math.min(total - 1, c + 1))}
              className="px-4 py-2 text-sm rounded-lg bg-brand-500 text-white hover:bg-brand-600"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={() => setConfirmed(true)}
              disabled={submitting}
              className="px-5 py-2 text-sm rounded-lg bg-green-500 text-white hover:bg-green-600 font-semibold disabled:opacity-50"
            >
              Submit Exam
            </button>
          )}
        </div>

        {confirmed && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-xl text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white mb-2">Submit exam?</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                You have answered {answered} of {total} questions. You cannot change answers after submitting.
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setConfirmed(false)} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">Go back</button>
                <button onClick={handleSubmit} disabled={submitting} className="px-5 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold disabled:opacity-50">{submitting ? "Submitting…" : "Yes, submit"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Result Modal ─────────────────────────────────────────────────────────────

function ResultModal({
  result,
  onClose,
}: {
  result: { score: number; totalMarks: number; percentage: number; passed: boolean; passingScore: number; pendingEssayReview?: boolean };
  onClose: () => void;
}) {
  const pending = result.pendingEssayReview;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 w-full max-w-sm shadow-xl text-center">
        {pending ? (
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 bg-yellow-100 dark:bg-yellow-900/40">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-yellow-500"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
          </div>
        ) : (
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${result.passed ? "bg-green-100 dark:bg-green-900/40" : "bg-red-100 dark:bg-red-900/40"}`}>
            {result.passed ? (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-green-500"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-red-500"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            )}
          </div>
        )}
        <p className={`text-2xl font-bold mb-1 ${pending ? "text-yellow-600 dark:text-yellow-400" : result.passed ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
          {pending ? "Submitted!" : result.passed ? "Congratulations!" : "Better luck next time"}
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          {pending
            ? "Your essay answers are pending teacher review. Your final result will be available once reviewed."
            : result.passed ? "You passed the exam." : "You did not meet the passing score."}
        </p>
        <div className="flex items-center justify-center gap-6 mb-6">
          <div><p className="text-3xl font-bold text-gray-900 dark:text-white">{result.percentage}%</p><p className="text-xs text-gray-400 mt-0.5">{pending ? "MCQ score" : "Your score"}</p></div>
          <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />
          <div><p className="text-3xl font-bold text-gray-900 dark:text-white">{result.passingScore}%</p><p className="text-xs text-gray-400 mt-0.5">Passing score</p></div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{result.score} / {result.totalMarks} marks</p>
        <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600">Close</button>
      </div>
    </div>
  );
}

// ─── Exam Card ────────────────────────────────────────────────────────────────

function ExamCard({ exam, onStart }: { exam: Exam; onStart: (exam: Exam) => void }) {
  const attempt = exam.myAttempt;
  const pct = attempt ? Math.round((attempt.score / attempt.totalMarks) * 100) : null;
  const maxAttempts = exam.maxAttempts ?? 1;
  const usedAttempts = attempt?.attemptCount ?? (attempt ? 1 : 0);
  const attemptsLeft = maxAttempts - usedAttempts;
  const canRetry = !!attempt && attemptsLeft > 0 && exam.status === "active";

  return (
    <div className={`rounded-2xl border bg-white dark:bg-white/3 p-5 flex flex-col gap-3 ${exam.status === "active" ? "border-green-300 dark:border-green-700 ring-1 ring-green-200 dark:ring-green-900" : "border-gray-200 dark:border-gray-800"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white truncate">{exam.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{exam.courseName}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {statusBadge(exam.status)}
          {exam.requireFaceId && (
            <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full">
              🔒 Face ID
            </span>
          )}
        </div>
      </div>

      {exam.description && <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{exam.description}</p>}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        <span>📅 {fmtDate(exam.scheduledAt)}</span>
        <span>⏱ {exam.durationMinutes} min</span>
        <span>📝 {exam.questionCount} questions</span>
        <span>🎯 Pass: {exam.passingScore}%</span>
        {maxAttempts > 1 && <span>🔁 {usedAttempts}/{maxAttempts} attempts</span>}
      </div>

      {attempt && (
        attempt.pendingEssayReview ? (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20">
            <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{pct}%</span>
            <div>
              <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">Pending Review</p>
              <p className="text-xs text-gray-400">Essay answers awaiting teacher grading</p>
            </div>
          </div>
        ) : (
          <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${attempt.passed ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
            <span className={`text-lg font-bold ${attempt.passed ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>{pct}%</span>
            <div>
              <p className={`text-sm font-semibold ${attempt.passed ? "text-green-700 dark:text-green-300" : "text-red-600 dark:text-red-400"}`}>{attempt.passed ? "Passed" : "Failed"}</p>
              <p className="text-xs text-gray-400">{attempt.score}/{attempt.totalMarks} marks · {new Date(attempt.submittedAt).toLocaleDateString()}</p>
            </div>
          </div>
        )
      )}

      {canRetry && (
        <button
          onClick={() => onStart(exam)}
          className="w-full py-2.5 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition-colors"
        >
          Retry Exam ({attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} left)
        </button>
      )}

      {!attempt && exam.status === "active" && (
        <button
          onClick={() => onStart(exam)}
          className="mt-1 w-full py-2.5 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition-colors"
        >
          {exam.requireFaceId ? "🔒 Verify & Start Exam" : "Start Exam"}
        </button>
      )}

      {!attempt && exam.status === "scheduled" && (
        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Starts {fmtDate(exam.scheduledAt)}</p>
      )}
      {!attempt && exam.status === "completed" && (
        <p className="text-xs text-gray-400">Exam has ended · not attempted</p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StudentExamsPage() {
  const { instituteId } = useParams<{ instituteId: string }>();
  const { hasFeature } = useFeatures();
  const proctoringEnabled = hasFeature("exam_proctoring");
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingExam, setVerifyingExam] = useState<Exam | null>(null); // face-verify step
  const [takingExam, setTakingExam] = useState<Exam | null>(null);
  const [result, setResult] = useState<{ score: number; totalMarks: number; percentage: number; passed: boolean; passingScore: number; pendingEssayReview?: boolean } | null>(null);

  const load = useCallback(async () => {
    if (!instituteId) return;
    setLoading(true);
    const data = await examService.getStudentExams(instituteId);
    setExams(data);
    setLoading(false);
  }, [instituteId]);

  useEffect(() => { load(); }, [load]);

  // When student clicks "Start Exam"
  const handleStart = (exam: Exam) => {
    if (exam.requireFaceId && proctoringEnabled) {
      setVerifyingExam(exam);   // show face verify first
    } else {
      setTakingExam(exam);       // start directly (proctoring disabled or not required)
    }
  };

  const handleSubmit = async (answers: Record<string, number | string>) => {
    if (!takingExam) return;
    const res = await examService.submitExam(instituteId, takingExam.id, answers);
    if (res) {
      setResult(res);
      setTakingExam(null);
      load();
    }
  };

  const upcoming = exams.filter((e) => e.status === "scheduled").length;
  const active = exams.filter((e) => e.status === "active").length;
  const completed = exams.filter((e) => e.myAttempt).length;
  const scores = exams.filter((e) => e.myAttempt).map((e) => {
    const a = e.myAttempt!;
    return a.totalMarks > 0 ? Math.round((a.score / a.totalMarks) * 100) : 0;
  });
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const grouped = {
    active: exams.filter((e) => e.status === "active"),
    scheduled: exams.filter((e) => e.status === "scheduled"),
    completed: exams.filter((e) => e.status === "completed"),
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="py-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Exams</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Scheduled exams for your enrolled courses</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Upcoming", value: upcoming, color: "text-blue-600 dark:text-blue-400" },
          { label: "Live Now", value: active, color: "text-green-600 dark:text-green-400" },
          { label: "Completed", value: completed, color: "text-purple-600 dark:text-purple-400" },
          { label: "Avg. Score", value: avgScore !== null ? `${avgScore}%` : "—", color: "text-gray-800 dark:text-white" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-44 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
        </div>
      ) : exams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" className="text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
          </div>
          <p className="font-semibold text-gray-700 dark:text-gray-300">No exams scheduled</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Exams assigned to your courses will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {grouped.active.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-3">🟢 Live Now</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped.active.map((e) => <ExamCard key={e.id} exam={e} onStart={handleStart} />)}
              </div>
            </section>
          )}
          {grouped.scheduled.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-3">📅 Upcoming</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped.scheduled.map((e) => <ExamCard key={e.id} exam={e} onStart={handleStart} />)}
              </div>
            </section>
          )}
          {grouped.completed.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">✅ Completed</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped.completed.map((e) => <ExamCard key={e.id} exam={e} onStart={handleStart} />)}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Face verify step (for requireFaceId exams) */}
      {verifyingExam && (
        <FaceVerifyModal
          exam={verifyingExam}
          instituteId={instituteId}
          onVerified={() => {
            setTakingExam(verifyingExam);
            setVerifyingExam(null);
          }}
          onClose={() => setVerifyingExam(null)}
        />
      )}

      {takingExam && (
        <TakeExamModal
          exam={takingExam}
          instituteId={instituteId}
          onSubmit={handleSubmit}
          onClose={() => setTakingExam(null)}
        />
      )}
      {result && <ResultModal result={result} onClose={() => setResult(null)} />}
    </div>
  );
}
