"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { VideoIcon } from "@/icons";
import { authService } from "@/services/authService";
import { instituteService } from "@/services/instituteService";

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

// Treat the full deadline day as active (end-of-day local time).
// This avoids relying on the backend's computed `status` field which can be
// affected by UTC midnight parsing of date-only strings.
function isAssignmentActive(a: RecordingAssignment): boolean {
  if (!a.deadline) return false;
  const dateStr = String(a.deadline).split("T")[0]; // normalise to YYYY-MM-DD
  const endOfDay = new Date(`${dateStr}T23:59:59`);
  return !isNaN(endOfDay.getTime()) && endOfDay > new Date();
}

function normalizeKey(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export default function StudentRecordingsPage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCourseId, setFilterCourseId] = useState("All");
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playRecording, setPlayRecording] = useState<Recording | null>(null);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [protectionNotice, setProtectionNotice] = useState<string | null>(null);
  const [watermarkTime, setWatermarkTime] = useState(() => new Date().toLocaleString());

  const protectedVideoRef = useRef<HTMLVideoElement>(null);
  const protectionTimeoutRef = useRef<number | null>(null);

  // Core data fetcher — pass silent=true for background refreshes (no loading spinner).
  const loadRecordings = useCallback(async (silent = false) => {
    if (!instituteId) return;
    if (!silent) { setLoading(true); setError(null); }
    try {
      const [enrolledCourses, allRecordings] = await Promise.all([
        instituteService.getMyEnrolledCourses(instituteId),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/institutes/institutes/${instituteId}/recordings`, {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${authService.getToken()}`,
            "Content-Type": "application/json",
          },
        }).then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || "Failed to fetch recordings");
          }
          return (await res.json()) as Recording[];
        }),
      ]);

      const enrolledCourseIds = new Set(enrolledCourses.map((c) => normalizeKey(c.id)).filter(Boolean));
      const enrolledCourseNames = new Set(enrolledCourses.map((c) => normalizeKey(c.name)).filter(Boolean));

      const assignedToStudent = allRecordings
        .map((r) => {
          const filteredAssignments = (r.assignments || []).filter((a) => {
            const assignmentCourseId = normalizeKey(a.courseId);
            const assignmentCourseName = normalizeKey(a.courseName);
            return (
              (assignmentCourseId && enrolledCourseIds.has(assignmentCourseId)) ||
              (assignmentCourseName && enrolledCourseNames.has(assignmentCourseName))
            );
          });
          return filteredAssignments.length > 0
            ? { ...r, assignments: filteredAssignments }
            : null;
        })
        .filter(Boolean) as Recording[];

      setRecordings(assignedToStudent);
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
    const active = recordings.filter((r) => r.assignments.some(isAssignmentActive)).length;
    const expired = recordings.filter((r) => r.assignments.every((a) => !isAssignmentActive(a))).length;
    return { total, active, expired };
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

    function onWindowBlur() {
      setIsWindowFocused(false);
    }

    function onWindowFocus() {
      setIsWindowFocused(true);
    }

    function onVisibilityChange() {
      setIsWindowFocused(!document.hidden);
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between py-4">
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
          className="mt-1 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
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
          { label: "Expired", value: loading ? "-" : String(stats.expired) },
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

      {playRecording && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90"
          onClick={() => setPlayRecording(null)}
        >
          <div className="absolute inset-x-0 top-0 z-20 border-b border-red-300/30 bg-red-600/85 px-4 py-2 text-center text-xs font-semibold text-white">
            Protected stream: downloading and PiP are blocked where supported.
          </div>

          {protectionNotice && (
            <div className="absolute left-1/2 top-12 z-20 -translate-x-1/2 rounded-lg border border-red-200/40 bg-red-500/95 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
              {protectionNotice}
            </div>
          )}

          <div className="relative mx-4 w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPlayRecording(null)}
              className="absolute -top-10 right-0 flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>

            <div className="relative">
              <video
                key={playRecording.id}
                ref={protectedVideoRef}
                src={playRecording.fileUrl}
                controls
                autoPlay
                playsInline
                controlsList="nodownload noremoteplayback"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
                className={`max-h-[70vh] w-full rounded-xl bg-black transition-all ${!isWindowFocused ? "blur-xl" : ""}`}
                style={{ outline: "none" }}
              />

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
            </div>

            <div className="mt-3 flex items-center justify-between px-1">
              <div>
                <h3 className="text-sm font-semibold text-white">{playRecording.title}</h3>
                <p className="mt-0.5 text-xs text-white/50">
                  {new Date(playRecording.uploadDate).toLocaleDateString()}
                </p>
              </div>
              <span className="text-xs text-white/50">{playRecording.duration ?? ""}</span>
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
