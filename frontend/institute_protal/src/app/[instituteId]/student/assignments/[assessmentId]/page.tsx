"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  instituteService,
  ModuleContent,
  QuizQuestion,
  StudentAssessmentGroup,
} from "@/services/instituteService";
import { authService } from "@/services/authService";

type AssessmentItem = {
  id: string;
  type: "exam" | "quiz";
  courseName: string;
  moduleTitle: string;
  title: string;
  description?: string;
  questionCount: number;
  passingScore: number;
  timeLimit: number;
  createdAt?: string;
  content: ModuleContent;
};

export default function StudentAssessmentAttemptPage() {
  const params       = useParams();
  const router       = useRouter();
  const instituteId  = params?.instituteId as string;
  const assessmentId = params?.assessmentId as string;
  const backPath     = `/${instituteId}/student/assignments`;

  // ── Quiz / data state ──────────────────────────────────────────────────────
  const [loading, setLoading]               = useState(true);
  const [groups, setGroups]                 = useState<StudentAssessmentGroup[]>([]);
  const [answers, setAnswers]               = useState<Record<string, number>>({});
  const [storedAnswers, setStoredAnswers]   = useState<Record<string, number>>({});
  const [submitted, setSubmitted]           = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [alreadyAttempted, setAlreadyAttempted] = useState(false);
  const [integrityViolatedPrev, setIntegrityViolatedPrev] = useState(false); // persisted from server
  const [attemptCount, setAttemptCount]     = useState(0);
  const [score, setScore]                   = useState(0);
  const [error, setError]                   = useState<string | null>(null);

  // ── Screen-share proctoring state ──────────────────────────────────────────
  const [examStarted, setExamStarted]       = useState(false);
  const [multiMonitor, setMultiMonitor]     = useState(false);
  const [ssError, setSsError]               = useState("");
  const [ssRequesting, setSsRequesting]     = useState(false);
  const [leaveCountdown, setLeaveCountdown] = useState<number | null>(null);
  const [violationMsg, setViolationMsg]     = useState("");

  const screenStreamRef      = useRef<MediaStream | null>(null);
  const autoFailedRef        = useRef(false);
  const integrityViolatedRef = useRef(false); // tracks current session violation
  const countdownTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const leaveViolationsRef   = useRef(0);
  const triggerAutoFailRef   = useRef<(reason?: string) => void>(() => {});
  const violationsRef        = useRef<{type: string; timestamp: string; detail?: string}[]>([]);

  // ── Fetch data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!instituteId) return;
    (async () => {
      setLoading(true);
      try {
        const data = await instituteService.getMyStudentAssessments(instituteId);
        setGroups(data);
        const userId = authService.getUserId();
        if (userId) {
          for (const g of data) {
            for (const q of g.quizzes) {
              if (q.content.id === assessmentId) {
                const attempts = q.content.studentAttempts || {};
                const maxAllowed = (q.content.quizData as any)?.maxAttempts ?? 1;
                if (attempts[userId]) {
                  const attData = attempts[userId] as any;
                  const count = attData.attemptCount ?? 1;
                  setAttemptCount(count);
                  setScore(attData.score || 0);
                  setStoredAnswers(attData.answers || {});
                  // Persist integrity-violation flag from server — blocks re-attempts permanently
                  if (attData.integrityViolated) {
                    setIntegrityViolatedPrev(true);
                  }
                  if (count >= maxAllowed || attData.integrityViolated) {
                    setAlreadyAttempted(true);
                  } else {
                    setAlreadyAttempted(true);
                  }
                }
                break;
              }
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [instituteId, assessmentId]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const item = useMemo<AssessmentItem | null>(() => {
    for (const g of groups) {
      for (const q of g.quizzes) {
        if (q.content.id !== assessmentId) continue;
        const t = `${q.content.title} ${q.module.title}`.toLowerCase();
        const type: "exam" | "quiz" = t.includes("exam") ? "exam" : "quiz";
        return {
          id: q.content.id,
          type,
          courseName: g.course.name,
          moduleTitle: q.module.title,
          title: q.content.title,
          description: q.content.description,
          questionCount: q.content.quizData?.questions?.length ?? 0,
          passingScore: q.content.quizData?.passingScore ?? 70,
          timeLimit: q.content.quizData?.timeLimit ?? 0,
          createdAt: q.content.createdAt,
          content: q.content,
        };
      }
    }
    return null;
  }, [assessmentId, groups]);

  const requiresScreenShare = item
    ? !!(item.content.quizData as any)?.requireScreenShare
    : false;

  const questions        = item?.content.quizData?.questions ?? [];
  const maxAttemptsAllowed = (item?.content.quizData as any)?.maxAttempts ?? 1;
  // No re-attempt allowed if integrity was violated (regardless of remaining attempts)
  const canReattempt     = alreadyAttempted && attemptCount < maxAttemptsAllowed && !integrityViolatedPrev;

  // Live score from current answers (used for back-submit)
  const liveScore = useMemo(() => {
    let correct = 0;
    for (const q of questions as QuizQuestion[]) {
      if (answers[q.id] === q.correctAnswer) correct += 1;
    }
    return (questions as QuizQuestion[]).length > 0
      ? Math.round((correct / (questions as QuizQuestion[]).length) * 100)
      : 0;
  }, [answers, questions]);

  // ── When item loads, skip gate if not required or already attempted ────────
  useEffect(() => {
    if (!item || alreadyAttempted) return;
    const req = !!(item.content.quizData as any)?.requireScreenShare;
    if (!req) {
      setExamStarted(true);
    } else {
      setMultiMonitor(!!(window.screen as any).isExtended);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  // ── Copy/paste prevention ──────────────────────────────────────────────────
  useEffect(() => {
    if (alreadyAttempted) return;
    const handleCopy          = (e: ClipboardEvent) => e.preventDefault();
    const handleContextMenu   = (e: MouseEvent)    => e.preventDefault();
    const handleSelectStart   = (e: Event)          => e.preventDefault();
    const handleDragStart     = (e: DragEvent)      => e.preventDefault();
    document.addEventListener("copy",          handleCopy);
    document.addEventListener("contextmenu",   handleContextMenu);
    document.addEventListener("selectstart",   handleSelectStart);
    document.addEventListener("dragstart",     handleDragStart);
    return () => {
      document.removeEventListener("copy",          handleCopy);
      document.removeEventListener("contextmenu",   handleContextMenu);
      document.removeEventListener("selectstart",   handleSelectStart);
      document.removeEventListener("dragstart",     handleDragStart);
    };
  }, [alreadyAttempted]);

  // ── Score calculation ──────────────────────────────────────────────────────
  const calculatedScore = useMemo(() => {
    if (!item || !submitted) return 0;
    let correct = 0;
    for (const q of questions as QuizQuestion[]) {
      if (answers[q.id] === q.correctAnswer) correct += 1;
    }
    return questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
  }, [answers, item, questions, submitted]);

  // ── Direct API submission ──────────────────────────────────────────────────
  const submitScore = useCallback(async (finalScore: number, finalAnswers: Record<string, number>) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const token   = authService.getToken();
      const apiUrl  = process.env.NEXT_PUBLIC_API_URL;
      const isIntegrityViolation = integrityViolatedRef.current;
      const res = await fetch(
        `${apiUrl}/api/institutes/institutes/${instituteId}/courses/student-assessments/${assessmentId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            score: isIntegrityViolation ? 0 : finalScore,
            answers: finalAnswers,
            violations: violationsRef.current,
            integrityViolated: isIntegrityViolation || undefined,
          }),
        }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || "Failed to submit quiz");
        setSubmitted(false);
        return;
      }
      const finalSavedScore = isIntegrityViolation ? 0 : finalScore;
      setScore(finalSavedScore);
      setStoredAnswers(finalAnswers);
      if (isIntegrityViolation) setIntegrityViolatedPrev(true);
      setAlreadyAttempted(true);
      setAttemptCount((prev) => prev + 1);
    } catch (e) {
      console.error(e);
      setError("Error submitting quiz attempt" + (e instanceof Error ? ": " + e.message : ""));
      setSubmitted(false);
    } finally {
      setSubmitting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId, instituteId]);

  // ── Submit effect (triggered by normal Submit button) ─────────────────────
  useEffect(() => {
    if (!submitted || !assessmentId || !instituteId) return;
    if (autoFailedRef.current) return; // auto-fail handles its own submission
    submitScore(calculatedScore, answers);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);

  // ── Re-attempt ────────────────────────────────────────────────────────────
  const handleReattempt = useCallback(() => {
    setAlreadyAttempted(false);
    setSubmitted(false);
    setAnswers({});
    setStoredAnswers({});
    setScore(0);
    setError(null);
    setViolationMsg("");
    setLeaveCountdown(null);
    setIntegrityViolatedPrev(false);
    autoFailedRef.current         = false;
    integrityViolatedRef.current  = false;
    leaveViolationsRef.current    = 0;
    violationsRef.current         = [];
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    if (requiresScreenShare) {
      setExamStarted(false);
      setMultiMonitor(!!(window.screen as any).isExtended);
    } else {
      setExamStarted(true);
    }
  }, [requiresScreenShare]);

  // ── Back during exam — auto-submit current answers ────────────────────────
  const handleBack = useCallback(async () => {
    const examInProgress = examStarted && !submitted && !alreadyAttempted;
    if (!examInProgress) { router.push(backPath); return; }
    const answeredCount = Object.keys(answers).length;
    const totalQ = (questions as QuizQuestion[]).length;
    const confirmed = window.confirm(
      `You have answered ${answeredCount} of ${totalQ} question${totalQ !== 1 ? "s" : ""}.\n` +
      `Your current score is ${liveScore}%.\n\n` +
      `Leaving now will automatically submit these answers.\nContinue?`
    );
    if (!confirmed) return;
    // Stop screen share cleanly before submitting
    autoFailedRef.current = true;
    if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setLeaveCountdown(null);
    await submitScore(liveScore, answers);
    router.push(backPath);
  }, [examStarted, submitted, alreadyAttempted, answers, questions, liveScore, submitScore, router, backPath]);

  // ── Warn on browser back / tab close during active exam ───────────────────
  useEffect(() => {
    if (!examStarted || submitted || alreadyAttempted) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [examStarted, submitted, alreadyAttempted]);

  // ── Auto-fail ─────────────────────────────────────────────────────────────
  const triggerAutoFail = useCallback((reason = "screen_share_stopped") => {
    if (autoFailedRef.current) return;
    violationsRef.current.push({ type: reason, timestamp: new Date().toISOString() });
    autoFailedRef.current        = true;
    integrityViolatedRef.current = true; // mark as integrity violation — forces 0 + blocks re-attempts
    if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setLeaveCountdown(null);
    setViolationMsg("");
    submitScore(0, {}); // submit 0 marks with violations + integrityViolated flag
  }, [submitScore]);

  triggerAutoFailRef.current = triggerAutoFail;

  // ── PROCTORING effect ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!requiresScreenShare || !examStarted || submitted || alreadyAttempted) return;

    // Screen share liveness — every 5 s
    const livenessTimer = setInterval(() => {
      const s = screenStreamRef.current;
      if (!s || s.getTracks().every((t) => t.readyState === "ended")) {
        triggerAutoFailRef.current("screen_share_stopped");
      }
    }, 5_000);

    const SECS = 10;
    const startCountdown = () => {
      if (countdownTimerRef.current || autoFailedRef.current) return;
      setLeaveCountdown(SECS);
      countdownTimerRef.current = setInterval(() => {
        setLeaveCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownTimerRef.current!);
            countdownTimerRef.current = null;
            triggerAutoFailRef.current("tab_switch_timeout");
            return null;
          }
          return prev - 1;
        });
      }, 1_000);
    };

    // Fire a real-time violation report to backend (teacher notified immediately)
    const reportViolationRealTime = (type: string, detail: string) => {
      try {
        const token  = authService.getToken();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        fetch(
          `${apiUrl}/api/institutes/institutes/${instituteId}/courses/student-assessments/${assessmentId}/violation`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ type, timestamp: new Date().toISOString(), detail }),
          }
        ).catch(() => {}); // fire-and-forget; don't block the UI
      } catch { /* ignore */ }
    };

    const clearCountdown = () => {
      if (!countdownTimerRef.current) return;
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
      setLeaveCountdown(null);
      leaveViolationsRef.current += 1;
      const n = leaveViolationsRef.current;
      const ts = new Date().toISOString();
      const detail = `Warning #${n} — returned within countdown`;
      // Record locally
      violationsRef.current.push({ type: "tab_switch", timestamp: ts, detail });
      // Report to teacher in real-time
      reportViolationRealTime("tab_switch", detail);
      if (n >= 2) {
        triggerAutoFailRef.current("tab_switch_repeated");
      } else {
        setViolationMsg(
          `⚠ Violation #${n}: You left the assessment window. ` +
          "Leave again and your assessment will be TERMINATED with 0 marks immediately."
        );
        setTimeout(() => setViolationMsg(""), 9_000);
      }
    };

    const onVisibility = () => document.visibilityState === "hidden" ? startCountdown() : clearCountdown();
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiresScreenShare, examStarted, submitted, alreadyAttempted]);

  // ── Request screen share then start exam ──────────────────────────────────
  const requestScreenShareAndStart = useCallback(async () => {
    setSsError("");
    const isExtended = !!(window.screen as any).isExtended;
    setMultiMonitor(isExtended);
    if (isExtended) {
      setSsError("An external monitor is still connected. Please disconnect it first, then click the button again.");
      return;
    }
    setSsRequesting(true);
    try {
      const stream: MediaStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { cursor: "always", displaySurface: "monitor" },
        audio: false,
        // Chrome 111+ — defaults picker to "Entire Screen" tab and hides current-tab shortcut
        preferCurrentTab: false,
        selfBrowserSurface: "exclude",
      });
      const track   = stream.getVideoTracks()[0];
      const surface = (track?.getSettings() as any)?.displaySurface as string | undefined;
      // Strict: only entire screen ("monitor") is accepted — reject window, tab, application
      if (surface && surface !== "monitor") {
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        const surfaceNames: Record<string, string> = {
          browser: "a browser tab",
          window: "an application window",
          application: "an application window",
        };
        const what = surfaceNames[surface] ?? `"${surface}"`;
        setSsError(
          `❌ You shared ${what} — only your entire screen is accepted. ` +
          `Click again, choose the "Entire Screen" tab, select your monitor, then click Share.`
        );
        setSsRequesting(false);
        return;
      }
      track?.addEventListener("ended", () => {
        if (!autoFailedRef.current) triggerAutoFailRef.current("screen_share_stopped");
      });
      screenStreamRef.current = stream;
      setSsRequesting(false);
      setExamStarted(true);
    } catch {
      setSsError("Screen sharing was denied or cancelled. It is required to start this assessment.");
      setSsRequesting(false);
    }
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-32 animate-pulse rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-white/3" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-white/3">
        <p className="text-base font-semibold text-gray-900 dark:text-white">Assessment not found</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This assessment may no longer be available.</p>
        <Link href={`/${instituteId}/student/assignments`}
          className="mt-4 inline-flex rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
          Back to Assessments
        </Link>
      </div>
    );
  }

  // ── Review mode (already attempted) ────────────────────────────────────────
  if (alreadyAttempted) {
    const passed        = score >= item.passingScore;
    const reviewAnswers = storedAnswers;
    const correctCount  = (questions as QuizQuestion[]).filter((q) => reviewAnswers[q.id] === q.correctAnswer).length;

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{item.title}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.courseName} • {item.moduleTitle}</p>
          </div>
          <Link href={`/${instituteId}/student/assignments`}
            className="inline-flex rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            Back
          </Link>
        </div>

        {/* Integrity-violation / auto-fail termination banner */}
        {(autoFailedRef.current || integrityViolatedPrev) && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-5 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                <svg width="18" height="18" fill="none" stroke="#ef4444" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-red-700 dark:text-red-400">Assessment Terminated — Integrity Violation</p>
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  A cheating violation was detected during this assessment (tab/window switch or screen share stopped).
                  Your score has been set to <strong>0</strong> and this has been reported to your teacher.
                </p>
                <p className="mt-2 text-xs font-semibold text-red-500 dark:text-red-400">
                  🔒 No further attempts are permitted for this assessment.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className={`rounded-2xl border p-5 ${passed
          ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
          : "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20"}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className={`text-lg font-bold ${passed ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                {passed ? "Passed" : "Failed"} — {score}%
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {correctCount} of {questions.length} correct • Passing score: {item.passingScore}%
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${passed
              ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
              : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"}`}>
              {passed ? "✓ Passed" : "✗ Failed"}
            </span>
          </div>
        </div>

        {(questions as QuizQuestion[]).length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400">
            No questions found.
          </div>
        ) : (
          <div className="space-y-4">
            {(questions as QuizQuestion[]).map((q, idx) => {
              const studentPick = reviewAnswers[q.id];
              const isCorrect   = studentPick === q.correctAnswer;
              const unanswered  = studentPick === undefined;
              return (
                <div key={q.id} className={`rounded-2xl border p-4 ${
                  unanswered ? "border-gray-200 bg-white dark:border-gray-700 dark:bg-white/3"
                  : isCorrect ? "border-green-300 bg-white dark:border-green-800 dark:bg-white/3"
                  : "border-red-300 bg-white dark:border-red-800 dark:bg-white/3"}`}>
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{idx + 1}. {q.question}</p>
                    {unanswered
                      ? <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">Skipped</span>
                      : isCorrect
                      ? <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/20 dark:text-green-400">Correct</span>
                      : <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/20 dark:text-red-400">Wrong</span>}
                  </div>
                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const isStudentChoice = studentPick === optIdx;
                      const isCorrectAnswer = q.correctAnswer === optIdx;
                      let borderColor = "border-gray-200 dark:border-gray-700", bgColor = "";
                      let label: React.ReactNode = null;
                      if (isCorrectAnswer && isStudentChoice) {
                        borderColor = "border-green-400 dark:border-green-600"; bgColor = "bg-green-50 dark:bg-green-900/20";
                        label = <span className="ml-auto text-xs font-medium text-green-600 dark:text-green-400">Your answer ✓</span>;
                      } else if (isCorrectAnswer) {
                        borderColor = "border-green-400 dark:border-green-600"; bgColor = "bg-green-50 dark:bg-green-900/20";
                        label = <span className="ml-auto text-xs font-medium text-green-600 dark:text-green-400">Correct answer</span>;
                      } else if (isStudentChoice) {
                        borderColor = "border-red-400 dark:border-red-600"; bgColor = "bg-red-50 dark:bg-red-900/20";
                        label = <span className="ml-auto text-xs font-medium text-red-600 dark:text-red-400">Your answer ✗</span>;
                      }
                      return (
                        <div key={optIdx} className={`flex items-center gap-2 rounded-lg border p-2 ${borderColor} ${bgColor}`}>
                          <input type="radio" readOnly checked={isStudentChoice} className="pointer-events-none" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{opt}</span>
                          {label}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && (
                    <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                      {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between">
          <Link href={backPath}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            Back to Assessments
          </Link>
          {canReattempt && (
            <button
              onClick={handleReattempt}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Re-attempt ({attemptCount}/{maxAttemptsAllowed} used)
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Screen Share Gate ──────────────────────────────────────────────────────
  if (requiresScreenShare && !examStarted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] py-8">
        <div className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                {item.type === "exam" ? "Exam" : "Quiz"} — Screen Proctoring
              </p>
              <h2 className="text-sm font-bold mt-0.5 text-gray-900 dark:text-white">{item.title}</h2>
            </div>
            <Link href={`/${instituteId}/student/assignments`}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </Link>
          </div>

          {/* Body */}
          <div className="p-6 flex flex-col items-center gap-5 text-center">
            {/* Monitor icon */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-blue-50 dark:bg-blue-500/10">
              <svg width="28" height="28" fill="none" stroke="#3b82f6" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-base text-gray-900 dark:text-white">Screen Share Required</p>
              <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
                Your <strong>entire screen</strong> must be shared for proctoring before this assessment begins.
              </p>
            </div>

            {/* Steps */}
            <div className="w-full rounded-2xl p-4 text-left space-y-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">How to share correctly</p>
              {[
                'Click "Share Entire Screen & Start" below',
                'In the browser picker select the "Entire Screen" or "Screen" tab — NOT "Window" or "Tab"',
                'Click your monitor thumbnail, then click "Share"',
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 bg-blue-500">{i + 1}</span>
                  <p className="text-xs text-gray-600 dark:text-gray-300">{t}</p>
                </div>
              ))}
              {/* Hard block notice */}
              <div className="flex items-start gap-2 rounded-lg px-2.5 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <svg width="12" height="12" fill="none" stroke="#ef4444" strokeWidth={2.5} viewBox="0 0 24 24" className="shrink-0 mt-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
                <p className="text-[11px] font-semibold text-red-700 dark:text-red-400">
                  Window, Tab, and Application sharing are <u>blocked</u> — only Entire Screen is accepted.
                </p>
              </div>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                ⚠ Stopping the share or switching apps during the assessment results in automatic 0 marks.
              </p>
            </div>

            {/* Multi-monitor warning */}
            {multiMonitor && (
              <div className="w-full rounded-xl px-4 py-3 text-sm text-left space-y-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300">
                <p className="font-bold flex items-center gap-1.5">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  External Monitor Detected
                </p>
                <p className="text-xs leading-relaxed">
                  You have an additional screen connected. Please{" "}
                  <strong>disconnect your external monitor</strong> before starting.
                  After disconnecting, click <strong>Re-check</strong> to continue.
                </p>
                <button
                  onClick={() => setMultiMonitor(!!(window.screen as any).isExtended)}
                  className="mt-1 px-3 py-1 rounded-lg text-xs font-semibold bg-yellow-100 dark:bg-yellow-800/40 border border-yellow-300 dark:border-yellow-600 text-yellow-800 dark:text-yellow-300"
                >
                  Re-check Monitors
                </button>
              </div>
            )}

            {ssError && (
              <div className="w-full rounded-xl px-4 py-3 text-sm text-left bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
                {ssError}
              </div>
            )}

            <div className="flex gap-3 w-full">
              <Link href={`/${instituteId}/student/assignments`}
                className="flex-1 py-2.5 rounded-2xl text-sm font-medium text-center border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </Link>
              <button
                onClick={requestScreenShareAndStart}
                disabled={ssRequesting || multiMonitor}
                className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white disabled:opacity-60 transition-colors"
                style={{ background: multiMonitor ? "#9ca3af" : "#3b82f6" }}
              >
                {ssRequesting ? "Requesting…" : multiMonitor ? "Disconnect External Monitor First" : "Share Entire Screen & Start"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Attempt mode ──────────────────────────────────────────────────────────
  return (
    <div
      className="space-y-5 select-none relative"
      style={{ WebkitUserSelect: "none", MozUserSelect: "none", userSelect: "none" }}
    >
      {/* Tab-switch countdown overlay */}
      {leaveCountdown !== null && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center px-4 bg-black/90">
          <div className="w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center bg-white dark:bg-gray-900">
            <div className="relative w-28 h-28 mx-auto mb-5">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
                <circle cx="56" cy="56" r="48" fill="none" stroke="#fee2e2" strokeWidth="8" />
                <circle cx="56" cy="56" r="48" fill="none" stroke="#ef4444" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 48}`}
                  strokeDashoffset={`${2 * Math.PI * 48 * (1 - leaveCountdown / 10)}`}
                  style={{ transition: "stroke-dashoffset 0.9s linear" }} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-4xl font-black text-red-500">
                {leaveCountdown}
              </span>
            </div>
            <p className="text-xl font-bold mb-2 text-red-500">You Left the Assessment!</p>
            <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              Return immediately — assessment terminates with{" "}
              <strong className="text-red-500">0 marks</strong> in{" "}
              <strong className="text-red-500">{leaveCountdown}</strong>{" "}
              second{leaveCountdown !== 1 ? "s" : ""}.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{item.title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.courseName} • {item.moduleTitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {requiresScreenShare && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Screen Monitored
            </span>
          )}
          <button
            onClick={handleBack}
            className="inline-flex rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            Back
          </button>
        </div>
      </div>

      {/* Violation warning banner */}
      {violationMsg && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300">
          {violationMsg}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-white/3 dark:text-gray-300">
        <p>
          {item.questionCount} question{item.questionCount !== 1 ? "s" : ""}
          {item.timeLimit > 0 ? ` • ${item.timeLimit} min` : ""}
          {` • Pass ${item.passingScore}%`}
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {(questions as QuizQuestion[]).length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400">
          No questions found for this assessment.
        </div>
      ) : (
        <div className="space-y-4">
          {(questions as QuizQuestion[]).map((q, idx) => (
            <div key={q.id} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-white/3">
              <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{idx + 1}. {q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, optIdx) => {
                  const selected     = answers[q.id] === optIdx;
                  const showCorrect  = submitted && q.correctAnswer === optIdx;
                  const showWrong    = submitted && selected && q.correctAnswer !== optIdx;
                  return (
                    <label key={optIdx} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 ${
                      showCorrect ? "border-green-400 bg-green-50 dark:bg-green-900/20"
                      : showWrong ? "border-red-400 bg-red-50 dark:bg-red-900/20"
                      : selected  ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                      : "border-gray-200 dark:border-gray-700"}`}>
                      <input type="radio" name={`q-${q.id}`} disabled={submitted} checked={selected}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))} />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{opt}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/95">
        {submitted ? (
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Score: {calculatedScore}% {calculatedScore >= item.passingScore ? "(Passed)" : "(Failed)"}
          </p>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">Answer all questions, then submit.</p>
        )}

        {!submitted ? (
          <button onClick={() => setSubmitted(true)} disabled={(questions as QuizQuestion[]).length === 0}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
            Submit Assessment
          </button>
        ) : submitting ? (
          <button disabled className="rounded-lg bg-gray-400 px-4 py-2 text-sm font-medium text-white">Submitting...</button>
        ) : (
          <button disabled className="rounded-lg bg-gray-400 px-4 py-2 text-sm font-medium text-white">Failed to Submit</button>
        )}
      </div>
    </div>
  );
}
