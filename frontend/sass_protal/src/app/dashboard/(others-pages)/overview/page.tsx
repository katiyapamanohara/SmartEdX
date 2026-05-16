"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import { authService } from "@/services/authService";

interface InstituteUser {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role?: { name: string };
  isActive: boolean;
}

interface InstituteDetail {
  id: string;
  name: string;
  description?: string;
  category?: string;
  country?: string;
  studentCount?: string;
  realStudentCount?: number;
  plan: string;
  enabledFeatures: string[];
  isActive: boolean;
  createdAt: string;
  users: InstituteUser[];
}

type TabId = "overview" | "teachers" | "students";

const FEATURE_LABELS: Record<string, string> = {
  live_sessions: "Live Sessions",
  recordings: "Recordings",
  ai_tools: "AI Tools",
  ai_tutor: "AI Tutor",
  exam_proctoring: "Exam Proctoring",
  advanced_reports: "Advanced Reports",
  virtual_labs: "Virtual Labs",
  voice_agent: "Voice Agent",
};

const ALL_FEATURES = Object.keys(FEATURE_LABELS);

const PLAN_COLORS: Record<string, { badge: string; dot: string }> = {
  starter: {
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  pro: {
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  enterprise: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
};

const PLAN_SCORE: Record<string, number> = { starter: 33, pro: 66, enterprise: 100 };

function getStudentCount(inst: InstituteDetail) {
  return inst.realStudentCount ?? (inst.studentCount ? parseInt(inst.studentCount, 10) || 0 : 0);
}

function performanceScore(inst: InstituteDetail): number {
  const featureScore = ALL_FEATURES.length
    ? Math.round((inst.enabledFeatures.length / ALL_FEATURES.length) * 40)
    : 0;
  const planScore = Math.round(((PLAN_SCORE[inst.plan] ?? 33) / 100) * 40);
  const activityScore = inst.isActive ? 20 : 0;
  return featureScore + planScore + activityScore;
}

function getTeachersFromInstitute(inst: InstituteDetail) {
  const teachers = inst.users.filter(
    (u) =>
      u.role?.name?.toLowerCase().includes("teacher") ||
      u.role?.name?.toLowerCase().includes("instructor")
  );
  return teachers.length > 0 ? teachers : inst.users;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, email, size = "md" }: { name?: string; email: string; size?: "sm" | "md" | "lg" }) {
  const initials = name ? name.slice(0, 2).toUpperCase() : email.slice(0, 2).toUpperCase();
  const colors = [
    "from-blue-500 to-indigo-600",
    "from-violet-500 to-purple-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-pink-500 to-rose-600",
    "from-cyan-500 to-sky-600",
  ];
  const colorIdx = email.charCodeAt(0) % colors.length;
  const sizeClass = size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-9 w-9 text-sm";
  return (
    <div
      className={`${sizeClass} shrink-0 rounded-full bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center text-white font-semibold`}
    >
      {initials}
    </div>
  );
}

// ─── Score Bar ────────────────────────────────────────────────────────────────
function ScoreBar({ score, showLabel = true }: { score: number; showLabel?: boolean }) {
  const color =
    score >= 75 ? "from-emerald-400 to-emerald-600" :
    score >= 50 ? "from-blue-400 to-indigo-600" :
    score >= 25 ? "from-amber-400 to-orange-500" :
    "from-red-400 to-rose-600";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 rounded-full bg-gray-100 dark:bg-gray-800 h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-bold tabular-nums text-gray-500 dark:text-gray-400 w-8 text-right">
          {score}%
        </span>
      )}
    </div>
  );
}

// ─── Summary Stat Card ────────────────────────────────────────────────────────
function SummaryCard({
  label, value, sub, gradient, icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  gradient: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-[0.06] pointer-events-none`} />
      <div className="relative px-5 py-5">
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} text-white mb-3 shadow-sm`}>
          {icon}
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</p>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-0.5">{label}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────
function Tab({ label, active, onClick, count }: { id?: string; label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
        active
          ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700"
          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50"
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
            active
              ? "bg-brand-500 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      active
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
        : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-gray-400"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ─── Institute Card ───────────────────────────────────────────────────────────
function InstituteCard({ inst }: { inst: InstituteDetail }) {
  const [expanded, setExpanded] = useState(false);
  const teachers = getTeachersFromInstitute(inst);
  const studentNum = getStudentCount(inst);
  const score = performanceScore(inst);
  const planStyle = PLAN_COLORS[inst.plan] ?? { badge: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="relative px-5 py-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/60 dark:to-gray-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white font-bold text-base shadow-sm">
              {inst.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate leading-snug">
                {inst.name}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {inst.category && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">{inst.category}</span>
                )}
                {inst.country && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">{inst.country}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${planStyle.badge}`}>
              {inst.plan}
            </span>
            <StatusBadge active={inst.isActive} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800 border-y border-gray-100 dark:border-gray-800">
        {[
          { label: "Students", value: studentNum || "—" },
          { label: "Teachers", value: teachers.length || "—" },
          { label: "Modules", value: inst.enabledFeatures.length },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center py-3 px-2">
            <span className="text-lg font-bold text-gray-900 dark:text-white leading-none">{s.value}</span>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Performance */}
      <div className="px-5 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Performance</span>
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{score}%</span>
        </div>
        <ScoreBar score={score} showLabel={false} />
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-2.5 border-t border-gray-100 dark:border-gray-800 text-xs font-medium text-brand-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <span>{expanded ? "Hide details" : "View details"}</span>
        <svg className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {/* Modules */}
          <div className="px-5 py-4">
            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
              Enabled Modules
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {ALL_FEATURES.map((f) => {
                const on = inst.enabledFeatures.includes(f);
                return (
                  <span
                    key={f}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                      on
                        ? "bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400 ring-1 ring-brand-200 dark:ring-brand-800/40"
                        : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 line-through"
                    }`}
                  >
                    {FEATURE_LABELS[f]}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Teachers */}
          <div className="px-5 py-4">
            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
              Teachers / Instructors
            </h4>
            {teachers.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No staff assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {teachers.slice(0, 5).map((u) => {
                  const displayName =
                    u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email;
                  return (
                    <div key={u.id} className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 px-3 py-2">
                      <Avatar
                        name={u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : undefined}
                        email={u.email}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{displayName}</p>
                        <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {u.role && (
                          <span className="rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 capitalize">
                            {u.role.name}
                          </span>
                        )}
                        <span className={`h-2 w-2 rounded-full ${u.isActive ? "bg-emerald-400" : "bg-gray-300"}`} />
                      </div>
                    </div>
                  );
                })}
                {teachers.length > 5 && (
                  <p className="text-xs text-gray-400 pl-1">+{teachers.length - 5} more</p>
                )}
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="px-5 py-3 flex flex-wrap gap-4 text-xs">
            <div>
              <span className="text-gray-400">Created</span>
              <p className="font-medium text-gray-700 dark:text-gray-300 mt-0.5">
                {new Date(inst.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </p>
            </div>
            {inst.description && (
              <div className="flex-1 min-w-[200px]">
                <span className="text-gray-400">Description</span>
                <p className="font-medium text-gray-700 dark:text-gray-300 mt-0.5 line-clamp-2">{inst.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Teachers Table ────────────────────────────────────────────────────────────
function TeachersView({ institutes }: { institutes: InstituteDetail[] }) {
  const [search, setSearch] = useState("");

  const allTeachers = useMemo(() => {
    const list: { user: InstituteUser; instituteName: string; plan: string }[] = [];
    for (const inst of institutes) {
      const teachers = getTeachersFromInstitute(inst);
      for (const u of teachers) {
        list.push({ user: u, instituteName: inst.name, plan: inst.plan });
      }
    }
    return list;
  }, [institutes]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return allTeachers;
    return allTeachers.filter(
      ({ user, instituteName }) =>
        user.email.toLowerCase().includes(q) ||
        instituteName.toLowerCase().includes(q) ||
        `${user.firstName ?? ""} ${user.lastName ?? ""}`.toLowerCase().includes(q) ||
        user.role?.name?.toLowerCase().includes(q)
    );
  }, [allTeachers, search]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search teachers by name, email, or institute…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400">Teacher</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400">Email</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400">Role</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400">Institute</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400">Plan</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">
                    No teachers found{search ? ` matching "${search}"` : ""}.
                  </td>
                </tr>
              ) : (
                filtered.map(({ user: u, instituteName, plan }, idx) => {
                  const displayName =
                    u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email;
                  const planStyle = PLAN_COLORS[plan] ?? { badge: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
                  return (
                    <tr key={`${u.id}-${idx}`} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={u.firstName && u.lastName ? displayName : undefined}
                            email={u.email}
                            size="sm"
                          />
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                            {displayName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{u.email}</td>
                      <td className="px-5 py-3">
                        {u.role ? (
                          <span className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">
                            {u.role.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {instituteName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{instituteName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${planStyle.badge}`}>
                          {plan}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge active={u.isActive} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <p className="text-xs text-gray-400">
            Showing {filtered.length} of {allTeachers.length} teacher{allTeachers.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Student-facing features ──────────────────────────────────────────────────
const STUDENT_FEATURES: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  live_sessions: {
    label: "Live Classes",
    color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  recordings: {
    label: "Recordings",
    color: "text-violet-500 bg-violet-50 dark:bg-violet-900/20",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  ai_tutor: {
    label: "AI Tutor",
    color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
      </svg>
    ),
  },
  virtual_labs: {
    label: "Virtual Labs",
    color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  exam_proctoring: {
    label: "Proctored Exams",
    color: "text-rose-500 bg-rose-50 dark:bg-rose-900/20",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
};

// ─── Institute Student Panel ───────────────────────────────────────────────────
function InstituteStudentPanel({
  inst,
  totalStudents,
}: {
  inst: InstituteDetail;
  totalStudents: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const count = getStudentCount(inst);
  const share = totalStudents > 0 && count > 0 ? Math.round((count / totalStudents) * 100) : 0;
  const teachers = getTeachersFromInstitute(inst);
  const activeTeachers = teachers.filter((t) => t.isActive);
  const planStyle = PLAN_COLORS[inst.plan] ?? { badge: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
  const studentFacing = Object.keys(STUDENT_FEATURES).filter((f) => inst.enabledFeatures.includes(f));

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Summary row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left"
      >
        <div className="flex items-center gap-4 px-5 py-4">
          {/* Logo */}
          <div className="h-11 w-11 shrink-0 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
            {inst.name.charAt(0).toUpperCase()}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 dark:text-white text-sm">{inst.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${planStyle.badge}`}>
                {inst.plan}
              </span>
              <StatusBadge active={inst.isActive} />
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {inst.category && <span className="text-[11px] text-gray-400">{inst.category}</span>}
              {inst.country && <span className="text-[11px] text-gray-400">{inst.country}</span>}
            </div>
          </div>

          {/* Student count */}
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">
              {count > 0 ? count.toLocaleString() : "—"}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">students</p>
          </div>

          {/* Share bar */}
          <div className="hidden md:flex flex-col gap-1 w-28 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">Platform share</span>
              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">{share}%</span>
            </div>
            <div className="rounded-full bg-gray-100 dark:bg-gray-800 h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-linear-to-r from-emerald-400 to-teal-500 transition-all duration-700"
                style={{ width: `${share}%` }}
              />
            </div>
          </div>

          {/* Chevron */}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Quick stats strip */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
          {[
            { label: "Students", value: count > 0 ? count.toLocaleString() : "—" },
            { label: "Teachers", value: teachers.length || "—" },
            { label: "Student Features", value: studentFacing.length },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center py-2.5 px-2">
              <span className="text-sm font-bold text-gray-900 dark:text-white leading-none">{s.value}</span>
              <span className="text-[10px] text-gray-400 mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">

          {/* Student overview metrics */}
          <div className="px-5 py-5">
            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
              Student Overview
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 leading-none">
                  {count > 0 ? count.toLocaleString() : "—"}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-500 mt-1">Total Students</p>
              </div>
              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 leading-none">
                  {activeTeachers.length || "—"}
                </p>
                <p className="text-[11px] text-blue-600 dark:text-blue-500 mt-1">Active Teachers</p>
              </div>
              <div className="rounded-xl bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/30 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-violet-700 dark:text-violet-400 leading-none">
                  {studentFacing.length}
                </p>
                <p className="text-[11px] text-violet-600 dark:text-violet-500 mt-1">Student Features</p>
              </div>
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 leading-none">
                  {count > 0 && activeTeachers.length > 0
                    ? Math.round(count / activeTeachers.length)
                    : "—"}
                </p>
                <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-1">Students/Teacher</p>
              </div>
            </div>
          </div>

          {/* Student-facing features */}
          <div className="px-5 py-5">
            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
              Features Available to Students
            </h4>
            {studentFacing.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No student-facing features enabled.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(STUDENT_FEATURES).map(([key, meta]) => {
                  const on = inst.enabledFeatures.includes(key);
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 border ${
                        on
                          ? `${meta.color} border-current/20`
                          : "bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800 opacity-40"
                      }`}
                    >
                      <span className={on ? "" : "text-gray-400"}>{meta.icon}</span>
                      <span className={`text-xs font-semibold ${on ? "" : "text-gray-400 line-through"}`}>
                        {meta.label}
                      </span>
                      {on && (
                        <svg className="w-3 h-3 ml-auto shrink-0 text-current opacity-60" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assigned teachers for these students */}
          <div className="px-5 py-5">
            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
              Teaching Staff
            </h4>
            {teachers.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No teachers assigned yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {teachers.map((u) => {
                  const displayName =
                    u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email;
                  return (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5 border border-gray-100 dark:border-gray-700/50"
                    >
                      <Avatar
                        name={u.firstName && u.lastName ? displayName : undefined}
                        email={u.email}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {displayName}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {u.role && (
                          <span className="rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 capitalize">
                            {u.role.name}
                          </span>
                        )}
                        <span className={`h-2 w-2 rounded-full ${u.isActive ? "bg-emerald-400" : "bg-gray-300"}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Institute info footer */}
          <div className="px-5 py-3 bg-gray-50/50 dark:bg-gray-800/20 flex flex-wrap gap-4 text-xs">
            <div>
              <span className="text-gray-400">Plan</span>
              <p className="font-semibold text-gray-700 dark:text-gray-300 mt-0.5 capitalize">{inst.plan}</p>
            </div>
            {inst.country && (
              <div>
                <span className="text-gray-400">Country</span>
                <p className="font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{inst.country}</p>
              </div>
            )}
            <div>
              <span className="text-gray-400">Created</span>
              <p className="font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                {new Date(inst.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Status</span>
              <p className="font-semibold mt-0.5">
                <StatusBadge active={inst.isActive} />
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Students View ────────────────────────────────────────────────────────────
function StudentsView({ institutes }: { institutes: InstituteDetail[] }) {
  const [search, setSearch] = useState("");

  const totalStudents = useMemo(
    () => institutes.reduce((s, i) => s + getStudentCount(i), 0),
    [institutes]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return institutes;
    return institutes.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q) ||
        i.country?.toLowerCase().includes(q)
    );
  }, [institutes, search]);

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-55">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by institute, category, or country…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition"
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Total across platform:</span>
          <span className="font-bold text-gray-900 dark:text-white">
            {totalStudents > 0 ? totalStudents.toLocaleString() : "—"} students
          </span>
        </div>
      </div>

      {/* Per-institute panels */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 py-16 text-center">
          <p className="text-sm text-gray-400">No institutes found{search ? ` matching "${search}"` : ""}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inst) => (
            <InstituteStudentPanel key={inst.id} inst={inst} totalStudents={totalStudents} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OverviewPage() {
  const [institutes, setInstitutes] = useState<InstituteDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const raw = await authService.getInstitutes();
        const enriched: InstituteDetail[] = await Promise.all(
          raw.map(async (inst: any) => {
            try {
              const users = await authService.getInstituteUsers(inst.id);
              return { ...inst, users: Array.isArray(users) ? users : [] };
            } catch {
              return { ...inst, users: [] };
            }
          })
        );
        setInstitutes(enriched);
      } catch (e: any) {
        setError(e.message ?? "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const totalStudents = institutes.reduce((s, i) => s + getStudentCount(i), 0);
  const totalTeachers = useMemo(
    () => institutes.reduce((s, i) => s + getTeachersFromInstitute(i).length, 0),
    [institutes]
  );
  const totalModules = institutes.reduce((s, i) => s + i.enabledFeatures.length, 0);
  const activeInstitutes = institutes.filter((i) => i.isActive).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-brand-500" />
        <p className="text-sm text-gray-400">Loading platform data…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Platform Overview</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor institutes, teachers, and students across the platform.
          </p>
        </div>
        <a
          href="/dashboard/institute"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Manage Institutes
        </a>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-5 py-3 flex items-center gap-3">
          <svg className="h-4 w-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard
          label="Total Institutes"
          value={institutes.length}
          sub={`${activeInstitutes} active`}
          gradient="from-brand-500 to-indigo-600"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <SummaryCard
          label="Total Students"
          value={totalStudents ? totalStudents.toLocaleString() : "—"}
          sub="across all institutes"
          gradient="from-emerald-500 to-teal-600"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
        />
        <SummaryCard
          label="Teachers"
          value={totalTeachers || "—"}
          sub="assigned staff"
          gradient="from-violet-500 to-purple-600"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <SummaryCard
          label="Enabled Modules"
          value={totalModules}
          sub="total across institutes"
          gradient="from-amber-500 to-orange-600"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          }
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-gray-100/70 dark:bg-gray-800/40 rounded-xl p-1 w-fit">
        <Tab id="overview" label="Institutes" active={activeTab === "overview"} onClick={() => setActiveTab("overview")} count={institutes.length} />
        <Tab id="teachers" label="Teachers" active={activeTab === "teachers"} onClick={() => setActiveTab("teachers")} count={totalTeachers} />
        <Tab id="students" label="Students" active={activeTab === "students"} onClick={() => setActiveTab("students")} />
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        institutes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 py-20">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/20">
              <svg className="h-8 w-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white">No institutes yet</h3>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
              Create your first institute to see performance data here.
            </p>
            <a
              href="/dashboard/institute"
              className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm"
            >
              Create Institute
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {institutes.map((inst) => (
              <InstituteCard key={inst.id} inst={inst} />
            ))}
          </div>
        )
      )}

      {activeTab === "teachers" && <TeachersView institutes={institutes} />}
      {activeTab === "students" && <StudentsView institutes={institutes} />}
    </div>
  );
}
