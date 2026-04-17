"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { examService } from "@/services/examService";
import { authService } from "@/services/authService";
import { useInstituteFeatures } from "@/hooks/useInstituteFeatures";
import { io, Socket } from "socket.io-client";

// ─── Types ────────────────────────────────────────────────────────────────────

type FlagRow = {
  flagId: string;
  examId: string;
  examTitle: string;
  userId: string;
  studentName: string;
  type: string;
  severity: string;
  timestamp: string;
  reviewed: boolean;
};

interface LiveAlert {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  violationType: string;
  severity: string;
  totalHighFlags: number;
  allFlags: { type: string; severity: string; timestamp: string }[];
  autoFailed: boolean;
  timestamp: string;
  dismissed: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VIOLATION_LABELS: Record<string, string> = {
  tab_switch: "Tab / Window Switch",
  face_absent: "Face Not Visible",
  multiple_faces: "Multiple Faces Detected",
  face_verify_failed: "Face Verification Failed",
  live_face_mismatch: "Face Mismatch (Live)",
  camera_disabled: "Camera Disabled",
  fullscreen_exit: "Exited Fullscreen",
  screen_share_disabled: "Screen Share Stopped",
  suspicious_screen: "Suspicious Screen Content",
  copy_attempt: "Copy / Paste Attempt",
};

const SEVERITY_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  high: {
    label: "High",
    cls: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
    dot: "bg-red-500",
  },
  medium: {
    label: "Medium",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  low: {
    label: "Low",
    cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
    dot: "bg-blue-500",
  },
};

function fmtTime(ts: string) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

function violationLabel(type: string) {
  return VIOLATION_LABELS[type] ?? type.replace(/_/g, " ");
}

// ─── Live Alert Card ──────────────────────────────────────────────────────────

function LiveAlertCard({
  alert,
  onDismiss,
}: {
  alert: LiveAlert;
  onDismiss: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.medium;

  return (
    <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0 text-red-600 dark:text-red-300 font-bold text-sm">
          {alert.studentName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">{alert.studentName}</span>
            {alert.autoFailed && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-red-600 text-white font-bold shrink-0">AUTO-FAILED</span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{alert.studentEmail}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            Exam: <span className="font-medium text-gray-700 dark:text-gray-300">{alert.examTitle}</span>
          </p>
        </div>
        <button
          onClick={() => onDismiss(alert.id)}
          className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-200 shrink-0 text-xl leading-none"
        >
          &times;
        </button>
      </div>

      {/* Violation badge */}
      <div className="flex items-center gap-2 px-4 pb-2 flex-wrap">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sev.cls}`}>
          {sev.label.toUpperCase()}
        </span>
        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{violationLabel(alert.violationType)}</span>
        <span className="text-xs text-gray-400">· {alert.totalHighFlags} high flag{alert.totalHighFlags !== 1 ? "s" : ""}</span>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full text-xs text-brand-500 hover:text-brand-600 px-4 pb-2 text-left flex items-center gap-1"
      >
        {expanded ? "▲ Hide" : "▼ View"} full activity log
      </button>

      {/* Activity log */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 max-h-40 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
            All Violations ({alert.allFlags.length})
          </p>
          {alert.allFlags.map((f, i) => {
            const fs = SEVERITY_CONFIG[f.severity] ?? SEVERITY_CONFIG.medium;
            return (
              <div key={i} className="flex items-center gap-2 py-0.5">
                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold shrink-0 ${fs.cls}`}>
                  {f.severity.toUpperCase()}
                </span>
                <span className="text-xs text-gray-700 dark:text-gray-300 flex-1">{violationLabel(f.type)}</span>
                <span className="text-xs text-gray-400 shrink-0">{new Date(f.timestamp).toLocaleTimeString()}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="px-4 pb-3 pt-1">
        <button
          onClick={() => onDismiss(alert.id)}
          className="w-full text-xs py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeacherIntegrityMonitorPage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;
  useInstituteFeatures({ requiredFeature: "exam_proctoring", redirectTo: `/${instituteId}/teacher` });

  // Historical flags (from API)
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed">("all");

  // Live alerts (from WebSocket)
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const alertIdRef = useRef(0);

  // ── Load historical flags ─────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!instituteId) return;
    setLoading(true);
    const data = await examService.getIntegrityFlags(instituteId);
    setFlags(data);
    setLoading(false);
  }, [instituteId]);

  useEffect(() => { load(); }, [load]);

  // ── Live WebSocket cheat alerts ───────────────────────────────────────────

  useEffect(() => {
    const token = authService.getToken();
    if (!token || typeof window === "undefined") return;

    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001").replace(":5001", ":5003");

    const socket: Socket = io(`${wsUrl}/notifications`, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });

    socket.on("new_notification", (notif: { type: string; metadata?: Record<string, unknown> }) => {
      if (notif.type !== "cheat_alert" || !notif.metadata) return;
      const m = notif.metadata;
      setLiveAlerts((prev) => [
        {
          id: `alert-${Date.now()}-${++alertIdRef.current}`,
          examId: m.examId as string,
          examTitle: m.examTitle as string,
          studentId: m.studentId as string,
          studentName: m.studentName as string,
          studentEmail: m.studentEmail as string,
          violationType: m.violationType as string,
          severity: m.severity as string,
          totalHighFlags: m.totalHighFlags as number,
          allFlags: m.allFlags as LiveAlert["allFlags"],
          autoFailed: m.autoFailed as boolean,
          timestamp: m.timestamp as string,
          dismissed: false,
        },
        ...prev,
      ]);
      // Also refresh the historical table so the new flag appears immediately
      load();
    });

    return () => { socket.disconnect(); };
  }, [instituteId, load]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleReview = async (flag: FlagRow) => {
    if (flag.reviewed) return;
    setReviewingId(flag.flagId);
    const ok = await examService.markFlagReviewed(instituteId, flag.examId, flag.flagId, flag.userId);
    if (ok) {
      setFlags((prev) => prev.map((f) => f.flagId === flag.flagId ? { ...f, reviewed: true } : f));
    }
    setReviewingId(null);
  };

  const dismissAlert = (id: string) =>
    setLiveAlerts((prev) => prev.filter((a) => a.id !== id));

  const dismissAll = () => setLiveAlerts([]);

  // ── Derived stats ─────────────────────────────────────────────────────────

  const total = flags.length;
  const reviewed = flags.filter((f) => f.reviewed).length;
  const pending = total - reviewed;
  const highCount = flags.filter((f) => f.severity === "high").length;

  const visible = flags.filter((f) => {
    if (filter === "pending") return !f.reviewed;
    if (filter === "reviewed") return f.reviewed;
    return true;
  });

  const activeAlerts = liveAlerts.filter((a) => !a.dismissed);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="py-4 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integrity Monitor</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time academic integrity alerts and historical violation log
          </p>
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live monitoring active
        </div>
      </div>

      {/* ── Live Alert Feed ──────────────────────────────────────────────────── */}
      {activeAlerts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">
                Live Cheat Alerts — {activeAlerts.length}
              </h2>
            </div>
            <button
              onClick={dismissAll}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
            >
              Dismiss all
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeAlerts.map((alert) => (
              <LiveAlertCard key={alert.id} alert={alert} onDismiss={dismissAlert} />
            ))}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Flags", value: loading ? "—" : total, color: "text-gray-800 dark:text-white" },
          { label: "High Severity", value: loading ? "—" : highCount, color: "text-red-500" },
          { label: "Pending Review", value: loading ? "—" : pending, color: "text-amber-500" },
          { label: "Reviewed", value: loading ? "—" : reviewed, color: "text-green-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5">
            <span className="text-xs text-gray-500 dark:text-gray-400">{s.label}</span>
            <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Flags table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03]">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold text-gray-800 dark:text-white">Flagged Incidents</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "pending", "reviewed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-brand-500 text-white"
                    : "bg-gray-100 dark:bg-white/6 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === "pending" && pending > 0 && (
                  <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {pending}
                  </span>
                )}
              </button>
            ))}
            <button
              onClick={load}
              className="ml-2 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/6 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm">Loading flags…</div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm">
            {filter === "all" ? "No integrity flags recorded yet." : `No ${filter} flags.`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-white/2">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Student</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Exam</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Violation</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Severity</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Time</th>
                  <th className="px-5 py-3 text-end text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {visible.map((f) => {
                  const sev = SEVERITY_CONFIG[f.severity] ?? SEVERITY_CONFIG.medium;
                  const isReviewing = reviewingId === f.flagId;
                  return (
                    <tr
                      key={f.flagId}
                      className={`hover:bg-gray-50 dark:hover:bg-white/2 transition-colors ${f.reviewed ? "opacity-50" : ""}`}
                    >
                      <td className="px-5 py-4 font-medium text-gray-800 dark:text-white/90">{f.studentName}</td>
                      <td className="px-5 py-4 text-gray-500 dark:text-gray-400 max-w-40 truncate">{f.examTitle}</td>
                      <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                        {violationLabel(f.type)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${sev.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                          {sev.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">
                        {fmtTime(f.timestamp)}
                      </td>
                      <td className="px-5 py-4 text-end">
                        {f.reviewed ? (
                          <span className="text-xs text-green-500 font-medium">Reviewed</span>
                        ) : (
                          <button
                            onClick={() => handleReview(f)}
                            disabled={isReviewing}
                            className="text-xs font-medium text-brand-500 hover:underline disabled:opacity-50"
                          >
                            {isReviewing ? "Saving…" : "Mark Reviewed"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
