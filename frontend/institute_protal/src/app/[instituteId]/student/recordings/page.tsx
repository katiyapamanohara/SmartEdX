"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { VideoIcon } from "@/icons";
import { authService } from "@/services/authService";
import { useInstituteFeatures } from "@/hooks/useInstituteFeatures";

type RecordingAssignment = {
  id: string;
  courseId?: string;
  courseName: string;
  deadline: string;
  status: "active" | "expired";
};

type Recording = {
  id: string;
  title: string;
  fileUrl?: string;
  uploadDate: string;
  duration?: string;
  assignments: RecordingAssignment[];
};

type VideoQuestion = {
  id: string;
  atSeconds: number;
  question: string;
  options: [string, string, string, string];
  marks: number;
  // correctAnswer omitted — server strips it for students
};

type QuestionFeedback = {
  questionId: string;
  correct: boolean;
  chosen: number;
  correctAnswer: number;
  marks: number;
  options?: [string, string, string, string];
};

// Treat the full deadline day as active (end-of-day local time).
// This avoids relying on the backend's computed `status` field which can be
// affected by UTC midnight parsing of date-only strings.
function isAssignmentActive(a: RecordingAssignment): boolean {
  if (!a.deadline) return false;
  const dateStr = String(a.deadline).split("T")[0]; // normalise to YYYY-MM-DD
  const endOfDay = new Date(`${dateStr}T23:59:59`);
  return !isNaN(endOfDay.getTime()) && endOfDay > new Date();
}


export default function StudentRecordingsPage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;
  useInstituteFeatures({ requiredFeature: "recordings", redirectTo: `/${instituteId}/student` });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCourseId, setFilterCourseId] = useState("All");
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playRecording, setPlayRecording] = useState<Recording | null>(null);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [protectionNotice, setProtectionNotice] = useState<string | null>(null);
  const [watermarkTime, setWatermarkTime] = useState(() => new Date().toLocaleString());

  // ── Timed quiz questions ──────────────────────────────────────────────────
  const [videoQuestions, setVideoQuestions] = useState<VideoQuestion[]>([]);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [collectedAnswers, setCollectedAnswers] = useState<Record<string, number>>({});
  const [activeQuestion, setActiveQuestion] = useState<VideoQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [feedback, setFeedback] = useState<QuestionFeedback | null>(null);
  const [quizResult, setQuizResult] = useState<{ score: number; totalMarks: number; percentage: number } | null>(null);

  // Refs written on every render (not in effects) so they are always up-to-date
  // before any interval tick or native event fires.
  const videoQuestionsRef = useRef<VideoQuestion[]>([]);
  const answeredIdsRef = useRef<Set<string>>(new Set());
  const activeQuestionRef = useRef<VideoQuestion | null>(null);
  const feedbackRef = useRef<QuestionFeedback | null>(null);
  const submittingAnswerRef = useRef(false);
  videoQuestionsRef.current = videoQuestions;
  answeredIdsRef.current = answeredIds;
  activeQuestionRef.current = activeQuestion;
  feedbackRef.current = feedback;
  submittingAnswerRef.current = submittingAnswer;

  // Stable handler ref — always calls the latest logic without re-attaching the listener
  const triggerCheckRef = useRef<() => void>(() => {});
  triggerCheckRef.current = () => {
    if (activeQuestionRef.current || feedbackRef.current) return;
    const v = protectedVideoRef.current;
    if (!v) return;
    const due = videoQuestionsRef.current.find(
      (q) => !answeredIdsRef.current.has(q.id) && v.currentTime >= q.atSeconds
    );
    if (due) {
      v.pause();
      setActiveQuestion(due);
      setSelectedOption(null);
    }
  };

  const protectedVideoRef = useRef<HTMLVideoElement>(null);
  const protectionTimeoutRef = useRef<number | null>(null);

  // Core data fetcher — pass silent=true for background refreshes (no loading spinner).
  const loadRecordings = useCallback(async (silent = false) => {
    if (!instituteId) return;
    if (!silent) { setLoading(true); setError(null); }
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/institutes/institutes/${instituteId}/recordings/student`,
        {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${authService.getToken()}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to fetch recordings");
      }
      const data = (await res.json()) as Recording[];
      setRecordings(data);
    } catch (e) {
      console.error(e);
      if (!silent) setError(e instanceof Error ? e.message : "Failed to load recordings");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [instituteId]);

  // Renamed alias used by the Refresh button (shows spinner).
  const fetchRecordings = useCallback(() => loadRecordings(false), [loadRecordings]);

  // Initial load
  useEffect(() => { loadRecordings(); }, [loadRecordings]);

  // Refetch when student returns to this tab (teacher may have changed assignments).
  useEffect(() => {
    function onVisibilityChange() {
      if (!document.hidden && !playRecording) loadRecordings(true);
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [loadRecordings, playRecording]);

  // Background poll every 10 s so assignment changes appear without manual refresh.
  useEffect(() => {
    if (playRecording) return; // don't poll while video is playing
    const id = window.setInterval(() => loadRecordings(true), 10_000);
    return () => window.clearInterval(id);
  }, [loadRecordings, playRecording]);

  const assignedCourses = useMemo(() => {
    const map = new Map<string, string>();
    for (const recording of recordings) {
      for (const assignment of recording.assignments) {
        const key = assignment.courseId ?? assignment.courseName;
        if (!key) continue;
        map.set(key, assignment.courseName || key);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [recordings]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return recordings.filter((r) => {
      // Show only recordings that are assigned by teacher to at least one student course.
      if (!r.assignments || r.assignments.length === 0) return false;

      if (filterCourseId !== "All" && !r.assignments.some((a) => a.courseId === filterCourseId)) {
        return false;
      }

      const courseNames = r.assignments.map((a) => a.courseName).join(" ").toLowerCase();
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        courseNames.includes(q)
      );
    });
  }, [recordings, searchQuery, filterCourseId]);

  const stats = useMemo(() => {
    const total = recordings.length;
    const active = recordings.length; // backend only returns active assignments
    return { total, active };
  }, [recordings]);

  const watermarkIdentity = useMemo(() => {
    const user = authService.getUser();
    const email = user?.email || "";
    const id = user?.id || "";
    if (email && id) return `ID: ${id} | Email: ${email}`;
    if (email) return `Email: ${email}`;
    if (id) return `ID: ${id}`;
    return "unknown";
  }, []);

  const showProtectionNotice = useCallback((message: string) => {
    setProtectionNotice(message);
    if (protectionTimeoutRef.current) window.clearTimeout(protectionTimeoutRef.current);
    protectionTimeoutRef.current = window.setTimeout(() => setProtectionNotice(null), 2200);
  }, []);

  const handleBlockPictureInPicture = useCallback(async (video: HTMLVideoElement | null) => {
    if (!video) return;
    showProtectionNotice("Picture-in-Picture is blocked.");
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
    } catch {
      // noop
    }

    try {
      const maybeSafariVideo = video as HTMLVideoElement & {
        webkitSetPresentationMode?: (mode: "inline" | "fullscreen" | "picture-in-picture") => void;
      };
      maybeSafariVideo.webkitSetPresentationMode?.("inline");
    } catch {
      // noop
    }
  }, [showProtectionNotice]);

  useEffect(() => {
    if (!playRecording) return;

    const previousOverflow = document.body.style.overflow;
    const videoEl = protectedVideoRef.current;
    document.body.style.overflow = "hidden";

    const canResume = () =>
      !activeQuestionRef.current &&
      !feedbackRef.current &&
      !submittingAnswerRef.current;

    function onWindowBlur() {
      setIsWindowFocused(false);
      protectedVideoRef.current?.pause();
    }

    function onWindowFocus() {
      setIsWindowFocused(true);
      if (canResume()) protectedVideoRef.current?.play();
    }

    function onVisibilityChange() {
      const hidden = document.hidden;
      setIsWindowFocused(!hidden);
      if (hidden) {
        protectedVideoRef.current?.pause();
      } else if (canResume()) {
        protectedVideoRef.current?.play();
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      const isPiPShortcut = (e.metaKey && e.shiftKey && key === "p") || (e.altKey && key === "p");
      if (isPiPShortcut) {
        e.preventDefault();
        e.stopPropagation();
        showProtectionNotice("Picture-in-Picture is blocked.");
      }
    }

    function onEnterPictureInPicture() {
      handleBlockPictureInPicture(videoEl ?? null);
    }

    function onWebkitPresentationModeChanged() {
      const maybeSafariVideo = videoEl as HTMLVideoElement & {
        webkitPresentationMode?: string;
      };
      if (maybeSafariVideo?.webkitPresentationMode === "picture-in-picture") {
        handleBlockPictureInPicture(videoEl ?? null);
      }
    }

    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("keydown", onKeyDown, true);
    videoEl?.addEventListener("enterpictureinpicture", onEnterPictureInPicture);
    videoEl?.addEventListener("webkitpresentationmodechanged", onWebkitPresentationModeChanged as EventListener);

    return () => {
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("focus", onWindowFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("keydown", onKeyDown, true);
      videoEl?.removeEventListener("enterpictureinpicture", onEnterPictureInPicture);
      videoEl?.removeEventListener("webkitpresentationmodechanged", onWebkitPresentationModeChanged as EventListener);
      document.body.style.overflow = previousOverflow;
      setIsWindowFocused(true);
      setProtectionNotice(null);
      if (protectionTimeoutRef.current) {
        window.clearTimeout(protectionTimeoutRef.current);
        protectionTimeoutRef.current = null;
      }
    };
  }, [handleBlockPictureInPicture, playRecording, showProtectionNotice]);

  useEffect(() => {
    if (!playRecording) return;
    setWatermarkTime(new Date().toLocaleString());
    const interval = window.setInterval(() => {
      setWatermarkTime(new Date().toLocaleString());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [playRecording]);

  // Fetch timed questions when a recording starts playing
  useEffect(() => {
    if (!playRecording || !instituteId) {
      setVideoQuestions([]);
      setAnsweredIds(new Set());
      setCollectedAnswers({});
      setActiveQuestion(null);
      setSelectedOption(null);
      setSubmittingAnswer(false);
      setFeedback(null);
      setQuizResult(null);
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/institutes/institutes/${instituteId}/recordings/${playRecording.id}/video-questions`,
          { headers: { Authorization: `Bearer ${authService.getToken()}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setVideoQuestions(data.questions ?? []);
        }
      } catch {
        // non-blocking
      }
    })();
  }, [playRecording, instituteId]);

  // Seeking guard — blocks scrubbing past unanswered questions.
  // Stored in a ref so the callback ref on the video element can attach it
  // without recreating the listener on every render.
  const seekingGuardRef = useRef<() => void>(() => {});
  seekingGuardRef.current = () => {
    const v = protectedVideoRef.current;
    if (!v || activeQuestionRef.current) return;
    const earliest = videoQuestionsRef.current
      .filter((q) => !answeredIdsRef.current.has(q.id))
      .sort((a, b) => a.atSeconds - b.atSeconds)[0];
    if (earliest && v.currentTime > earliest.atSeconds) {
      v.currentTime = Math.max(0, earliest.atSeconds - 0.5);
    }
  };

  // Play guard — if a question/feedback/submit is active, immediately re-pause
  // any attempt to play the video (e.g. student clicking the play button on controls).
  const playGuardRef = useRef<() => void>(() => {});
  playGuardRef.current = () => {
    if (activeQuestionRef.current || feedbackRef.current || submittingAnswerRef.current) {
      protectedVideoRef.current?.pause();
    }
  };

  // Stable listener wrappers — same object reference for add/removeEventListener.
  const onTimeUpdateStable = useRef(() => triggerCheckRef.current());
  const onSeekingStable    = useRef(() => seekingGuardRef.current());
  const onPlayStable       = useRef(() => playGuardRef.current());

  // Callback ref — attaches native listeners the instant the video element
  // enters the DOM (before any useEffect, no timing race possible).
  const videoCallbackRef = useCallback((el: HTMLVideoElement | null) => {
    if (protectedVideoRef.current) {
      protectedVideoRef.current.removeEventListener("timeupdate", onTimeUpdateStable.current);
      protectedVideoRef.current.removeEventListener("seeking",    onSeekingStable.current);
      protectedVideoRef.current.removeEventListener("play",       onPlayStable.current);
    }
    protectedVideoRef.current = el;
    if (!el) return;
    el.addEventListener("timeupdate", onTimeUpdateStable.current);
    el.addEventListener("seeking",    onSeekingStable.current);
    el.addEventListener("play",       onPlayStable.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close player — final score already submitted per-answer; just show last result
  const closePlayer = useCallback(() => {
    setPlayRecording(null);
    setActiveQuestion(null);
    setSelectedOption(null);
    setFeedback(null);
  }, []);

  const submitAnswer = useCallback(async () => {
    if (!activeQuestion || selectedOption === null || !playRecording || !instituteId) return;
    protectedVideoRef.current?.pause();
    setSubmittingAnswer(true);
    const newAnswers = { ...collectedAnswers, [activeQuestion.id]: selectedOption };
    setCollectedAnswers(newAnswers);
    setAnsweredIds((prev) => new Set([...prev, activeQuestion.id]));
    // Keep activeQuestion set so the overlay stays visible with a loading state

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/institutes/institutes/${instituteId}/recordings/${playRecording.id}/video-attempt`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authService.getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ answers: newAnswers }),
        }
      );
      if (res.ok) {
        const result = await res.json();
        // Find the feedback for this specific question
        const qFeedback = (result.questionResults ?? []).find(
          (r: QuestionFeedback) => r.questionId === activeQuestion.id
        );
        if (qFeedback) {
          setActiveQuestion(null);
          setFeedback({ ...qFeedback, options: activeQuestion.options });
          setQuizResult({ score: result.score, totalMarks: result.totalMarks, percentage: result.percentage });
          // Show feedback briefly then resume
          setTimeout(() => {
            setFeedback(null);
            setSelectedOption(null);
            protectedVideoRef.current?.play();
          }, 2500);
          return;
        }
      }
    } catch {
      // non-blocking
    } finally {
      setSubmittingAnswer(false);
    }
    // Fallback: resume without feedback
    setActiveQuestion(null);
    setSelectedOption(null);
    protectedVideoRef.current?.play();
  }, [activeQuestion, selectedOption, playRecording, instituteId, collectedAnswers]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recordings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Watch class recordings assigned to your enrolled courses
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchRecordings()}
          disabled={loading}
          className="shrink-0 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
        >
          <svg
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Assigned", value: loading ? "-" : String(stats.total) },
          { label: "Active", value: loading ? "-" : String(stats.active) },
          { label: "Expired", value: "0" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
            <span className="text-sm text-gray-500 dark:text-gray-400">{s.label}</span>
            <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        

        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-white/3">
          <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">Filter by Course</label>
          <select
            value={filterCourseId}
            onChange={(e) => setFilterCourseId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none ring-brand-500/30 focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            <option value="All">All Assigned Courses</option>
            {assignedCourses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </div>

      </div>

      {error ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-white/3">
              <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-3 h-3 w-1/3 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-200 bg-white py-24 text-center dark:border-gray-700 dark:bg-white/3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <VideoIcon className="h-8 w-8 text-gray-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">No recordings available</p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              Recordings assigned to your courses will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((recording) => {
            const isActive = recording.assignments.some(isAssignmentActive);
            const firstDeadline = recording.assignments[0]?.deadline;

            return (
              <div key={recording.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-white/3">
                <div className="group relative h-52 bg-gray-900">
                  {recording.fileUrl ? (
                    <video
                      src={recording.fileUrl}
                      className="h-full w-full object-cover"
                      preload="metadata"
                      muted
                      playsInline
                      onLoadedMetadata={(e) => {
                        e.currentTarget.currentTime = 1;
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-brand-400 to-brand-600">
                      <VideoIcon className="h-10 w-10 text-white/40" />
                    </div>
                  )}

                  <div className="absolute left-2 top-2 flex items-center gap-2">
                    {recording.duration && (
                      <span className="rounded-full bg-black/60 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                        {recording.duration}
                      </span>
                    )}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/60 to-transparent p-3">
                    <h3 className="line-clamp-2 text-sm font-semibold text-white">{recording.title}</h3>
                    <p className="mt-1 text-xs text-white/70">
                      {recording.assignments.map((a) => a.courseName).join(" • ")}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                          isActive
                            ? "bg-green-500/20 text-green-100"
                            : "bg-red-500/20 text-red-100"
                        }`}
                      >
                        {isActive ? "Active" : "Expired"}
                      </span>
                      {recording.fileUrl ? (
                        <button
                          type="button"
                          onClick={() => setPlayRecording(recording)}
                          className="rounded-lg border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/20"
                        >
                          Watch
                        </button>
                      ) : (
                        <span className="text-xs text-white/60">Unavailable</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>Uploaded: {new Date(recording.uploadDate).toLocaleDateString()}</span>
                  {firstDeadline ? (
                    <span>Deadline: {new Date(firstDeadline).toLocaleDateString()}</span>
                  ) : (
                    <span>No deadline</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(searchQuery || filterCourseId !== "All") && (
        <p className="-mt-2 text-sm text-gray-500 dark:text-gray-400">
          Showing {filtered.length} of {recordings.length} recordings
          <button
            onClick={() => {
              setSearchQuery("");
              setFilterCourseId("All");
            }}
            className="ml-2 font-medium text-brand-500 hover:text-brand-600"
          >
            Clear
          </button>
        </p>
      )}

      {/* Quiz result toast */}
      {quizResult && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-brand-200 bg-white dark:bg-gray-800 dark:border-brand-500/40 shadow-2xl p-5 w-72">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Quiz Complete!</h4>
            <button onClick={() => setQuizResult(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none">&times;</button>
          </div>
          <p className="text-3xl font-bold text-brand-600 dark:text-brand-400">{quizResult.percentage}%</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {quizResult.score} / {quizResult.totalMarks} marks
          </p>
        </div>
      )}

      {playRecording && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90"
          onClick={() => closePlayer()}
        >
          <div className="absolute inset-x-0 top-0 z-20 border-b border-red-300/30 bg-red-600/85 px-4 py-2 text-center text-xs font-semibold text-white">
            Protected stream: downloading and PiP are blocked where supported.
          </div>

          {protectionNotice && (
            <div className="absolute left-1/2 top-12 z-20 -translate-x-1/2 rounded-lg border border-red-200/40 bg-red-500/95 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
              {protectionNotice}
            </div>
          )}

          {/* ── Side-by-side container ── */}
          <div
            className="relative mx-4 flex w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => closePlayer()}
              className="absolute -top-10 right-0 flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white z-10"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>

            {/* ── Video column (always full width) ── */}
            <div className="flex w-full flex-col gap-2">
              <div className="relative">
                <video
                  key={playRecording.id}
                  ref={videoCallbackRef}
                  src={playRecording.fileUrl}
                  controls
                  autoPlay
                  playsInline
                  controlsList="nodownload noremoteplayback"
                  disablePictureInPicture
                  onContextMenu={(e) => e.preventDefault()}
                  className={`w-full rounded-xl bg-black transition-all ${!isWindowFocused ? "blur-xl" : ""} ${activeQuestion || feedback ? "brightness-40" : ""}`}
                  style={{ outline: "none", maxHeight: "70vh" }}
                />

                {/* Watermark */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                  <div
                    className="absolute -left-40 top-10 whitespace-nowrap text-xs font-bold tracking-widest text-red-300/55"
                    style={{ animation: "student-watermark-a 14s linear infinite" }}
                  >
                    {watermarkIdentity} • {watermarkTime} • PROTECTED CONTENT
                  </div>
                  <div
                    className="absolute -right-52 top-1/2 whitespace-nowrap text-xs font-bold tracking-widest text-red-300/50"
                    style={{ animation: "student-watermark-b 16s linear infinite" }}
                  >
                    {watermarkIdentity} • {watermarkTime} • PROTECTED CONTENT
                  </div>
                </div>

                {!isWindowFocused && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/80 backdrop-blur-md">
                    <div className="rounded-xl border border-red-300/30 bg-red-900/45 px-4 py-3 text-center">
                      <p className="text-sm font-bold text-white">Playback hidden while window is inactive</p>
                      <p className="mt-1 text-xs text-red-100">Return to this tab to resume playback.</p>
                    </div>
                  </div>
                )}

                {/* ── Question / feedback popup overlay ── */}
                {(activeQuestion || feedback) && (() => {
                  const qIndex = activeQuestion
                    ? videoQuestions.findIndex((q) => q.id === activeQuestion.id)
                    : videoQuestions.findIndex((q) => q.id === feedback!.questionId);

                  return (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl p-4">
                      <div
                        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden"
                        style={{ maxHeight: "90%", overflowY: "auto" }}
                      >
                        {/* Header */}
                        <div className={`flex items-center justify-between px-4 py-3 ${feedback ? (feedback.correct ? "bg-green-600" : "bg-red-600") : submittingAnswer ? "bg-gray-600" : "bg-brand-500"}`}>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />
                            <span className="text-xs font-bold text-white uppercase tracking-wide">
                              {feedback ? (feedback.correct ? "Correct!" : "Incorrect") : submittingAnswer ? "Checking…" : "Question"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/80">
                              Q{qIndex + 1} / {videoQuestions.length}
                            </span>
                            {activeQuestion && (
                              <span className="text-xs font-semibold text-white bg-white/20 px-2 py-0.5 rounded-full">
                                {activeQuestion.marks} mark{activeQuestion.marks !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="flex gap-1 px-4 pt-3">
                          {videoQuestions.map((q, i) => (
                            <div
                              key={q.id}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                answeredIds.has(q.id)
                                  ? "bg-green-400"
                                  : i === qIndex
                                  ? "bg-brand-500"
                                  : "bg-gray-200 dark:bg-gray-700"
                              }`}
                            />
                          ))}
                        </div>

                        {/* Body */}
                        {submittingAnswer && !feedback ? (
                          <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                            <svg className="h-10 w-10 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Checking your answer…</p>
                          </div>
                        ) : feedback ? (
                          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold ${
                              feedback.correct ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400" : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                            }`}>
                              {feedback.correct ? "✓" : "✗"}
                            </div>
                            <div>
                              <p className={`text-base font-bold ${feedback.correct ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                {feedback.correct ? "Well done!" : "Not quite right"}
                              </p>
                              {!feedback.correct && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  Correct answer:{" "}
                                  <span className="font-semibold text-gray-800 dark:text-white">
                                    {String.fromCharCode(65 + feedback.correctAnswer)}. {feedback.options?.[feedback.correctAnswer] ?? ""}
                                  </span>
                                </p>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Video resuming in a moment…</p>
                          </div>
                        ) : activeQuestion ? (
                          <div className="p-4 flex flex-col gap-4">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                              {activeQuestion.question}
                            </p>

                            <div className="flex flex-col gap-2">
                              {activeQuestion.options.map((opt, i) => (
                                <button
                                  key={i}
                                  onClick={() => setSelectedOption(i)}
                                  disabled={submittingAnswer}
                                  className={`text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-all disabled:opacity-60 ${
                                    selectedOption === i
                                      ? "border-brand-500 bg-brand-50 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 shadow-sm"
                                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-500/10"
                                  }`}
                                >
                                  <span className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-bold mr-2 shrink-0 ${
                                    selectedOption === i
                                      ? "bg-brand-500 text-white"
                                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                  }`}>
                                    {String.fromCharCode(65 + i)}
                                  </span>
                                  {opt}
                                </button>
                              ))}
                            </div>

                            <div>
                              <button
                                onClick={submitAnswer}
                                disabled={selectedOption === null || submittingAnswer}
                                className="w-full py-2.5 text-sm font-semibold rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
                              >
                                {submittingAnswer ? "Submitting…" : "Submit & Continue"}
                              </button>
                              <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-2">
                                Answer to resume the video
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Video meta row */}
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-sm font-semibold text-white">{playRecording.title}</h3>
                  <p className="mt-0.5 text-xs text-white/50">
                    {new Date(playRecording.uploadDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {videoQuestions.length > 0 && (
                    <span className="text-xs text-purple-300 font-medium">
                      {answeredIds.size}/{videoQuestions.length} answered
                    </span>
                  )}
                  <span className="text-xs text-white/50">{playRecording.duration ?? ""}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes student-watermark-a {
          0% { transform: translateX(0) rotate(-24deg); }
          100% { transform: translateX(170%) rotate(-24deg); }
        }

        @keyframes student-watermark-b {
          0% { transform: translateX(0) rotate(-24deg); }
          100% { transform: translateX(-185%) rotate(-24deg); }
        }
      `}</style>
    </div>
  );
}
