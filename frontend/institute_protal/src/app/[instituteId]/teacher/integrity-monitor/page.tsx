"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { examService } from "@/services/examService";

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

const severityConfig: Record<string, { label: string; cls: string }> = {
  high: { label: "High", cls: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
  medium: { label: "Medium", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
  low: { label: "Low", cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" },
};

const VIOLATION_LABELS: Record<string, string> = {
  tab_switch: "Tab switch detected",
  face_absent: "Face not visible",
  multiple_faces: "Multiple faces detected",
  face_verify_failed: "Face verification failed",
  camera_disabled: "Camera disabled",
  fullscreen_exit: "Exited fullscreen",
};

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

export default function TeacherIntegrityMonitorPage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed">("all");

  const load = useCallback(async () => {
    if (!instituteId) return;
    setLoading(true);
    const data = await examService.getIntegrityFlags(instituteId);
    setFlags(data);
    setLoading(false);
  }, [instituteId]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (flag: FlagRow) => {
    if (flag.reviewed) return;
    setReviewingId(flag.flagId);
    const ok = await examService.markFlagReviewed(instituteId, flag.examId, flag.flagId, flag.userId);
    if (ok) {
      setFlags((prev) =>
        prev.map((f) => f.flagId === flag.flagId ? { ...f, reviewed: true } : f)
      );
    }
    setReviewingId(null);
  };

  const total = flags.length;
  const reviewed = flags.filter((f) => f.reviewed).length;
  const pending = total - reviewed;

  const visible = flags.filter((f) => {
    if (filter === "pending") return !f.reviewed;
    if (filter === "reviewed") return f.reviewed;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integrity Monitor</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Real-time academic integrity flags from proctored exams
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Flags", value: loading ? "—" : total, color: "text-red-500" },
          { label: "Reviewed", value: loading ? "—" : reviewed, color: "text-green-500" },
          { label: "Pending Review", value: loading ? "—" : pending, color: "text-amber-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5">
            <span className="text-sm text-gray-500 dark:text-gray-400">{s.label}</span>
            <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Flags table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03]">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold text-gray-800 dark:text-white">Flagged Incidents</h2>
          <div className="flex items-center gap-2">
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
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Student</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Exam</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Issue</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Severity</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Time</th>
                  <th className="px-5 py-3 text-end text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {visible.map((f) => {
                  const sev = severityConfig[f.severity] ?? severityConfig.medium;
                  const isReviewing = reviewingId === f.flagId;
                  return (
                    <tr
                      key={f.flagId}
                      className={`hover:bg-gray-50 dark:hover:bg-white/2 transition-colors ${
                        f.reviewed ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-5 py-4 font-medium text-gray-800 dark:text-white/90">{f.studentName}</td>
                      <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{f.examTitle}</td>
                      <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                        {VIOLATION_LABELS[f.type] ?? f.type.replace(/_/g, " ")}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sev.cls}`}>
                          {sev.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">
                        {formatTimestamp(f.timestamp)}
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
