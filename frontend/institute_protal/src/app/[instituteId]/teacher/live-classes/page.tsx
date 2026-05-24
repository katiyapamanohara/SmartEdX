"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { VideoIcon } from "@/icons";
import { useInstituteFeatures } from "@/hooks/useInstituteFeatures";

interface LiveSession {
  id: string;
  title: string;
  description?: string;
  courseId?: string;
  courseName?: string;
  teacherName?: string;
  status: "scheduled" | "live" | "ended";
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  participantCount: number;
  createdAt: string;
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
  const cfg = {
    live: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
    scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
    ended: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  const label = { live: "● Live", scheduled: "Scheduled", ended: "Ended" };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg[status]}`}>
      {label[status]}
    </span>
  );
}

interface Course {
  id: string;
  name: string;
}

function ScheduleModal({
  instituteId,
  onCreated,
  onClose,
}: {
  instituteId: string;
  onCreated: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    courseId: "",
    scheduledAt: new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16),
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCourses = async () => {
      setLoadingCourses(true);
      try {
        const res = await fetch(`${API}/api/institutes/institutes/${instituteId}/courses/my-courses`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setCourses(Array.isArray(data) ? data : []);
        }
      } catch { /* ignore */ }
      setLoadingCourses(false);
    };
    fetchCourses();
  }, [instituteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/institutes/institutes/${instituteId}/live-classes`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          courseId: form.courseId || undefined,
          scheduledAt: new Date(form.scheduledAt).toISOString(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to create session");
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Schedule Live Class</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
        </div>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Introduction to Algebra"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course (optional)</label>
            {loadingCourses ? (
              <div className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm">
                Loading courses...
              </div>
            ) : (
              <select
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.courseId}
                onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))}
              >
                <option value="">-- Open to all students --</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What will be covered?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Scheduled At</label>
            <input
              type="datetime-local"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={form.scheduledAt}
              onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditModal({
  instituteId,
  session,
  onUpdated,
  onClose,
}: {
  instituteId: string;
  session: LiveSession;
  onUpdated: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    title: session.title,
    description: session.description || "",
    courseId: session.courseId || "",
    scheduledAt: session.scheduledAt ? new Date(session.scheduledAt).toISOString().slice(0, 16) : "",
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCourses = async () => {
      setLoadingCourses(true);
      try {
        const res = await fetch(`${API}/api/institutes/institutes/${instituteId}/courses/my-courses`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setCourses(Array.isArray(data) ? data : []);
        }
      } catch { /* ignore */ }
      setLoadingCourses(false);
    };
    fetchCourses();
  }, [instituteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/institutes/institutes/${instituteId}/live-classes/${session.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          courseId: form.courseId || undefined,
          scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to update session");
      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Live Class</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
        </div>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course (optional)</label>
            {loadingCourses ? (
              <div className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm">
                Loading courses...
              </div>
            ) : (
              <select
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.courseId}
                onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))}
              >
                <option value="">-- Open to all students --</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Scheduled At</label>
            <input
              type="datetime-local"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={form.scheduledAt}
              onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TeacherLiveClassesPage() {
  const { instituteId } = useParams<{ instituteId: string }>();
  const router = useRouter();
  useInstituteFeatures({ requiredFeature: "live_sessions", redirectTo: `/${instituteId}/teacher` });
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState<LiveSession | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/institutes/institutes/${instituteId}/live-classes/teacher`, {
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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this session?")) return;
    setDeleting(id);
    try {
      await fetch(`${API}/api/institutes/institutes/${instituteId}/live-classes/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const handleStartNow = async (session: LiveSession) => {
    if (session.status === "scheduled") {
      await fetch(`${API}/api/institutes/institutes/${instituteId}/live-classes/${session.id}/start`, {
        method: "POST",
        headers: authHeaders(),
      });
    }
    router.push(`/${instituteId}/teacher/live-classes/${session.id}`);
  };

  const upcoming = sessions.filter((s) => s.status !== "ended");
  const past = sessions.filter((s) => s.status === "ended");
  const displayed = tab === "upcoming" ? upcoming : past;

  const stats = {
    live: sessions.filter((s) => s.status === "live").length,
    scheduled: sessions.filter((s) => s.status === "scheduled").length,
    ended: sessions.filter((s) => s.status === "ended").length,
  };

  return (
    <div className="flex flex-col gap-6">
      {showModal && (
        <ScheduleModal
          instituteId={instituteId}
          onCreated={fetchSessions}
          onClose={() => setShowModal(false)}
        />
      )}

      {editingSession && (
        <EditModal
          instituteId={instituteId}
          session={editingSession}
          onUpdated={fetchSessions}
          onClose={() => setEditingSession(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Classes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Schedule and host live sessions for your students</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          Schedule Class
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Live Now", value: stats.live, color: "text-red-600 dark:text-red-400" },
          { label: "Scheduled", value: stats.scheduled, color: "text-blue-600 dark:text-blue-400" },
          { label: "Completed", value: stats.ended, color: "text-gray-700 dark:text-gray-300" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-5">
            <span className="text-sm text-gray-500 dark:text-gray-400">{s.label}</span>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

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
            {t === "upcoming" ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
          </button>
        ))}
      </div>

      {/* Session List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <VideoIcon className="w-8 h-8 text-gray-400" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-700 dark:text-gray-300">No {tab} sessions</p>
            {tab === "upcoming" && (
              <p className="text-sm text-gray-400 mt-1">
                Click <strong>Schedule Class</strong> to create your first session.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {displayed.map((s) => (
            <div
              key={s.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] p-5"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  s.status === "live"
                    ? "bg-red-50 dark:bg-red-500/10"
                    : "bg-brand-50 dark:bg-brand-500/10"
                }`}>
                  <VideoIcon className={`w-6 h-6 ${s.status === "live" ? "text-red-500" : "text-brand-500"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-800 dark:text-white">{s.title}</h3>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {s.courseName && <span>{s.courseName} · </span>}
                    {s.status === "live"
                      ? `Started at ${new Date(s.startedAt!).toLocaleTimeString()}`
                      : s.status === "ended"
                      ? `Ended at ${new Date(s.endedAt!).toLocaleString()}`
                      : `Scheduled: ${new Date(s.scheduledAt!).toLocaleString()}`}
                    {s.participantCount > 0 && ` · ${s.participantCount} joined`}
                  </p>
                  {s.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{s.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-auto sm:ml-0">
                {s.status !== "ended" && (
                  <button
                    onClick={() => handleStartNow(s)}
                    className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      s.status === "live"
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-green-500 hover:bg-green-600 text-white"
                    }`}
                  >
                    {s.status === "live" ? "Re-enter" : "Start Now"}
                  </button>
                )}
                {s.status === "scheduled" && (
                  <>
                    <button
                      onClick={() => setEditingSession(s)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deleting === s.id}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
                    >
                      {deleting === s.id ? "…" : "Delete"}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
