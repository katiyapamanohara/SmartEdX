"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { VideoIcon } from "@/icons";
import { useInstituteFeatures } from "@/hooks/useInstituteFeatures";

interface LiveSession {
  id: string;
  title: string;
  description?: string;
  courseName?: string;
  teacherName?: string;
  teacherAvatar?: string;
  status: "scheduled" | "live" | "ended";
  scheduledAt?: string;
  startedAt?: string;
  participantCount: number;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(^| )access_token=([^;]+)/);
  return match ? match[2] : null;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

function StatusBadge({ status }: { status: LiveSession["status"] }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 animate-pulse">
        ● Live Now
      </span>
    );
  }
  if (status === "scheduled") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
        Upcoming
      </span>
    );
  }
  return null;
}

export default function StudentLiveClassesPage() {
  const { instituteId } = useParams<{ instituteId: string }>();
  const router = useRouter();
  useInstituteFeatures({ requiredFeature: "live_sessions", redirectTo: `/${instituteId}/student` });
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/institutes/institutes/${instituteId}/live-classes`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [instituteId]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Auto-refresh every 30s to catch new live sessions
  useEffect(() => {
    const id = setInterval(fetchSessions, 30_000);
    return () => clearInterval(id);
  }, [fetchSessions]);

  const handleJoin = (session: LiveSession) => {
    router.push(`/${instituteId}/student/live-classes/${session.id}`);
  };

  const liveSessions = sessions.filter((s) => s.status === "live");
  const upcomingSessions = sessions.filter((s) => s.status === "scheduled");
  const allUpcoming = [...liveSessions, ...upcomingSessions];
  const pastSessions = sessions.filter((s) => s.status === "ended");
  const displayed = tab === "upcoming" ? allUpcoming : pastSessions;

  const todayStr = new Date().toDateString();
  const todayCount = sessions.filter(
    (s) => s.scheduledAt && new Date(s.scheduledAt).toDateString() === todayStr,
  ).length;
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekCount = sessions.filter(
    (s) => s.scheduledAt && new Date(s.scheduledAt) >= weekStart,
  ).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Classes</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Join your teachers' live sessions in real time
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Live Now", value: liveSessions.length, color: "text-red-600 dark:text-red-400" },
          { label: "Today's Classes", value: todayCount, color: "text-blue-600 dark:text-blue-400" },
          { label: "This Week", value: weekCount, color: "text-gray-700 dark:text-gray-300" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-5">
            <span className="text-sm text-gray-500 dark:text-gray-400">{s.label}</span>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Live Now banner */}
      {liveSessions.length > 0 && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-500/10 p-4 flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-ping shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400 font-medium">
            {liveSessions.length} class{liveSessions.length > 1 ? "es are" : " is"} live right now — join before you miss it!
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            {t === "upcoming" ? `Upcoming (${allUpcoming.length})` : `Past (${pastSessions.length})`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <VideoIcon className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">
              {tab === "upcoming" ? "No upcoming sessions" : "No past sessions"}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {tab === "upcoming"
                ? "Your teachers haven't scheduled any live classes yet."
                : "Sessions you've attended will appear here."}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {displayed.map((s) => (
            <div
              key={s.id}
              className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border bg-white dark:bg-white/3 p-5 transition-shadow ${
                s.status === "live"
                  ? "border-red-200 dark:border-red-900/50 shadow-sm shadow-red-100 dark:shadow-none"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  s.status === "live" ? "bg-red-50 dark:bg-red-500/10" : "bg-brand-50 dark:bg-brand-500/10"
                }`}>
                  <VideoIcon className={`w-6 h-6 ${s.status === "live" ? "text-red-500" : "text-brand-500"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-800 dark:text-white">{s.title}</h3>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {s.teacherName && <span>By {s.teacherName} · </span>}
                    {s.courseName && <span>{s.courseName} · </span>}
                    {s.status === "live"
                      ? `Started ${new Date(s.startedAt!).toLocaleTimeString()}`
                      : s.scheduledAt
                      ? new Date(s.scheduledAt).toLocaleString()
                      : ""}
                    {s.participantCount > 0 && ` · ${s.participantCount} joined`}
                  </p>
                  {s.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{s.description}</p>
                  )}
                </div>
              </div>

              {s.status !== "ended" && (
                <button
                  onClick={() => handleJoin(s)}
                  className={`px-5 py-2 text-sm rounded-lg font-medium transition-colors shrink-0 ${
                    s.status === "live"
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-brand-500 hover:bg-brand-600 text-white"
                  }`}
                >
                  {s.status === "live" ? "Join Now" : "Enter Room"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
