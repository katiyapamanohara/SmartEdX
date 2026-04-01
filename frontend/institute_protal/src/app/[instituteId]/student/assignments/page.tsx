"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TaskIcon } from "@/icons";
import { FiMic } from "react-icons/fi";
import { instituteService, StudentAssessmentGroup } from "@/services/instituteService";
import { authService } from "@/services/authService";
import { studentService } from "@/services/studentService";
import VoiceAssessmentPlayer from "@/components/student/VoiceAssessmentPlayer";

// ─── Face Verification Modal ──────────────────────────────────────────────────

type VerifyStatus = "idle" | "ready" | "capturing" | "verifying" | "success" | "failed" | "error";

function FaceVerificationModal({
  onVerified,
  onClose,
}: {
  onVerified: () => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<VerifyStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setCameraReady(true);
      setStatus("ready");
    } catch {
      setErrorMsg("Camera access denied. Please allow camera permissions.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (cameraReady && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraReady]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && status !== "capturing" && status !== "verifying") {
        stopCamera();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  useEffect(() => () => stopCamera(), [stopCamera]);

  const captureAndVerify = async () => {
    if (!videoRef.current) return;
    setStatus("capturing");
    setErrorMsg("");

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageB64 = canvas.toDataURL("image/jpeg", 0.92);

    stopCamera();
    setStatus("verifying");

    try {
      const result = await studentService.verifyFace(imageB64);
      if (result.verified) {
        setStatus("success");
        setTimeout(() => {
          onVerified();
        }, 1000);
      } else {
        setStatus("failed");
        setErrorMsg(`Face did not match. Please try again. (distance: ${result.distance.toFixed(3)})`);
      }
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e.message || "Verification failed. Please try again.");
    }
  };

  const isBusy = status === "capturing" || status === "verifying";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !isBusy) { stopCamera(); onClose(); } }}
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-brand-600 dark:text-brand-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0 1 19.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 0 0 4.5 10.5a7.464 7.464 0 0 1-1.15 3.993m1.989 3.559A11.209 11.209 0 0 0 8.25 10.5a3.75 3.75 0 1 1 7.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 0 1-3.6 9.75m6.633-4.596a18.666 18.666 0 0 1-2.485 5.33" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Identity Verification</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Required before starting</p>
            </div>
          </div>
          {!isBusy && (
            <button onClick={() => { stopCamera(); onClose(); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Camera area */}
        <div className="p-5 space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${cameraReady && status === "ready" ? "opacity-100" : "opacity-0"}`}
            />

            {cameraReady && status === "ready" && (
              <>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-36 h-44 border-2 border-dashed border-white/60 rounded-full opacity-70" />
                </div>
                <div className="absolute top-3 left-3">
                  <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500 text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>
                </div>
              </>
            )}

            {isBusy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 gap-3">
                <svg className="animate-spin w-8 h-8 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <p className="text-sm text-gray-300 font-medium">
                  {status === "capturing" ? "Capturing…" : "Verifying identity…"}
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-900/80 gap-3">
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-green-300 font-semibold text-sm">Identity Verified!</p>
              </div>
            )}

            {(status === "idle" || status === "failed" || status === "error") && !cameraReady && (
              <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                {(status === "failed" || status === "error") ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-red-400">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <p className="text-sm text-red-400">{errorMsg}</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-gray-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-400">Click &ldquo;Start Camera&rdquo; to verify</p>
                  </>
                )}
              </div>
            )}
          </div>

          {status === "ready" && (
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 px-3 py-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-blue-500 shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
              </svg>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Centre your face in the oval guide and click <strong>Verify</strong>.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            {status === "idle" && (
              <button onClick={startCamera} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors text-sm font-semibold">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                </svg>
                Start Camera
              </button>
            )}
            {status === "ready" && (
              <button onClick={captureAndVerify} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors text-sm font-semibold">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
                Verify Identity
              </button>
            )}
            {(status === "failed" || status === "error") && (
              <button onClick={startCamera} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors text-sm font-semibold">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            )}
            {!isBusy && status !== "success" && (
              <button onClick={() => { stopCamera(); onClose(); }} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-sm">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface VoiceQuestion {
  id: string;
  question: string;
  expected_answer: string;
  marks: number;
  hints: string[];
}

type AssessmentItem = {
  id: string;
  type: "exam" | "quiz" | "voice";
  courseName: string;
  moduleTitle: string;
  title: string;
  description?: string;
  questionCount: number;
  passingScore: number;
  timeLimit: number;
  totalMarks?: number;
  voiceQuestions?: VoiceQuestion[];
  createdAt?: string;
};

export default function StudentAssignmentsPage() {
  const params = useParams();
  const router = useRouter();
  const instituteId = params?.instituteId as string;

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<StudentAssessmentGroup[]>([]);
  const [attemptedIds, setAttemptedIds] = useState<Set<string>>(new Set());
  const [attemptScores, setAttemptScores] = useState<Record<string, number>>({});
  const [voicePlayerOpen, setVoicePlayerOpen] = useState(false);
  const [activeVoiceItem, setActiveVoiceItem] = useState<AssessmentItem | null>(null);

  // Face verification gate
  const [verifyOpen, setVerifyOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const openWithVerification = useCallback((action: () => void) => {
    pendingActionRef.current = action;
    setVerifyOpen(true);
  }, []);

  const handleVerified = useCallback(() => {
    setVerifyOpen(false);
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  }, []);

  useEffect(() => {
    if (!instituteId) return;
    (async () => {
      setLoading(true);
      try {
        const data = await instituteService.getMyStudentAssessments(instituteId);
        setGroups(data);
        
        // Track which quizzes have been attempted by current user
        const userId = authService.getUserId();
        if (userId) {
          const attempted = new Set<string>();
          const scores: Record<string, number> = {};
          for (const g of data) {
            for (const q of g.quizzes) {
              const attempts = q.content.studentAttempts || {};
              if (attempts[userId]) {
                attempted.add(q.content.id);
                scores[q.content.id] = attempts[userId].score ?? 0;
              }
            }
          }
          setAttemptedIds(attempted);
          setAttemptScores(scores);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [instituteId]);

  const items = useMemo<AssessmentItem[]>(() => {
    return groups.flatMap((g) =>
      g.quizzes.map(({ content, module }) => {
        const isVoice = (content.quizData as any)?.assessmentType === "voice";
        const t = `${content.title} ${module.title}`.toLowerCase();
        const type: "exam" | "quiz" | "voice" = isVoice
          ? "voice"
          : t.includes("exam")
          ? "exam"
          : "quiz";
        return {
          id: content.id,
          type,
          courseName: g.course.name,
          moduleTitle: module.title,
          title: content.title,
          description: content.description,
          questionCount: isVoice
            ? ((content.quizData as any)?.voiceQuestions?.length ?? 0)
            : (content.quizData?.questions?.length ?? 0),
          passingScore: content.quizData?.passingScore ?? 70,
          timeLimit: content.quizData?.timeLimit ?? 0,
          totalMarks: (content.quizData as any)?.totalMarks,
          voiceQuestions: isVoice ? (content.quizData as any)?.voiceQuestions : undefined,
          createdAt: content.createdAt,
        };
      }),
    );
  }, [groups]);

  const stats = useMemo(() => {
    const exams = items.filter((i) => i.type === "exam").length;
    const quizzes = items.filter((i) => i.type === "quiz").length;
    const voice = items.filter((i) => i.type === "voice").length;
    const completed = items.filter((i) => attemptedIds.has(i.id)).length;
    return { total: items.length, exams, quizzes, voice, completed };
  }, [items, attemptedIds]);

  return (
    <div className="flex flex-col gap-6">
      <div className="py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assessments</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          View quizzes and exams assigned from your enrolled courses
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: "Total", value: loading ? "-" : String(stats.total) },
          { label: "Exams", value: loading ? "-" : String(stats.exams) },
          { label: "Quizzes", value: loading ? "-" : String(stats.quizzes) },
          { label: "Voice", value: loading ? "-" : String(stats.voice) },
          { label: "Completed", value: loading ? "-" : String(stats.completed) },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3"
          >
            <span className="text-sm text-gray-500 dark:text-gray-400">{s.label}</span>
            <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-white/3"
            >
              <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-3 h-3 w-1/3 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-200 bg-white py-24 text-center dark:border-gray-700 dark:bg-white/3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <TaskIcon className="h-8 w-8 text-gray-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">No assessments yet</p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              Quizzes and exams will appear here once your teacher creates them.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-white/3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="line-clamp-2 text-base font-semibold text-gray-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {item.courseName} • {item.moduleTitle}
                  </p>
                  {item.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                      {item.description}
                    </p>
                  )}
                </div>

                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    item.type === "exam"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                      : item.type === "voice"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400"
                  }`}
                >
                  {item.type === "exam" ? "Exam" : item.type === "voice" ? "Voice" : "Quiz"}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>
                  {item.questionCount} question{item.questionCount !== 1 ? "s" : ""}
                  {item.type === "voice" && item.totalMarks ? ` • ${item.totalMarks} marks` : ""}
                  {item.type !== "voice" && item.timeLimit > 0 ? ` • ${item.timeLimit} min` : ""}
                  {item.type !== "voice" ? ` • Pass ${item.passingScore}%` : ""}
                </span>

                {item.type === "voice" ? (
                  attemptedIds.has(item.id) ? (
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      (attemptScores[item.id] ?? 0) >= (item.passingScore || 50)
                        ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                    }`}>
                      {(attemptScores[item.id] ?? 0) >= (item.passingScore || 50) ? "Passed" : "Failed"} · {attemptScores[item.id] ?? 0}%
                    </span>
                  ) : (
                    <button
                      onClick={() => openWithVerification(() => {
                        setActiveVoiceItem(item);
                        setVoicePlayerOpen(true);
                      })}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-linear-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 transition-all shadow-sm shadow-purple-500/20"
                    >
                      <FiMic className="w-3 h-3" /> Start Interview
                    </button>
                  )
                ) : attemptedIds.has(item.id) ? (
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                      (attemptScores[item.id] ?? 0) >= item.passingScore
                        ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                    }`}>
                      {(attemptScores[item.id] ?? 0) >= item.passingScore ? "Passed" : "Failed"} · {attemptScores[item.id] ?? 0}%
                    </span>
                    <Link
                      href={`/${instituteId}/student/assignments/${item.id}`}
                      className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      View Review
                    </Link>
                  </div>
                ) : (
                  <button
                    onClick={() => openWithVerification(() => router.push(`/${instituteId}/student/assignments/${item.id}`))}
                    className="font-medium text-brand-500 hover:underline text-sm"
                  >
                    Start
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <VoiceAssessmentPlayer
        isOpen={voicePlayerOpen}
        onClose={() => { setVoicePlayerOpen(false); setActiveVoiceItem(null); }}
        assessmentData={activeVoiceItem ? {
          id: activeVoiceItem.id,
          title: activeVoiceItem.title,
          instructions: activeVoiceItem.description,
          questions: activeVoiceItem.voiceQuestions ?? [],
        } : undefined}
        onCompleted={(result) => {
          if (!activeVoiceItem) return;
          setAttemptedIds((prev) => new Set([...prev, activeVoiceItem.id]));
          setAttemptScores((prev) => ({ ...prev, [activeVoiceItem.id]: result.percentage }));
        }}
      />

      {verifyOpen && (
        <FaceVerificationModal
          onVerified={handleVerified}
          onClose={() => {
            setVerifyOpen(false);
            pendingActionRef.current = null;
          }}
        />
      )}
    </div>
  );
}
