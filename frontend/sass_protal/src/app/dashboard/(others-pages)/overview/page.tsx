"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
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

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pro: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  enterprise: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const PLAN_SCORE: Record<string, number> = { starter: 33, pro: 66, enterprise: 100 };

function performanceScore(inst: InstituteDetail): number {
  const featureScore = ALL_FEATURES.length
    ? Math.round((inst.enabledFeatures.length / ALL_FEATURES.length) * 40)
    : 0;
  const planScore = Math.round(((PLAN_SCORE[inst.plan] ?? 33) / 100) * 40);
  const activityScore = inst.isActive ? 20 : 0;
  return featureScore + planScore + activityScore;
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 75
      ? "bg-emerald-500"
      : score >= 50
      ? "bg-brand-500"
      : score >= 25
      ? "bg-amber-400"
      : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-full bg-gray-200 dark:bg-gray-700 h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 w-8 text-right">
        {score}%
      </span>
    </div>
  );
}

function StatChip({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 py-3 min-w-[90px]">
      <div className="text-brand-500 mb-1">{icon}</div>
      <span className="text-lg font-bold text-gray-800 dark:text-white leading-tight">
        {value}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</span>
    </div>
  );
}

function InstituteCard({ inst }: { inst: InstituteDetail }) {
  const [expanded, setExpanded] = useState(false);

  const teachers = inst.users.filter(
    (u) => u.role?.name?.toLowerCase().includes("teacher") || u.role?.name?.toLowerCase().includes("instructor")
  );
  const otherStaff = inst.users.filter(
    (u) => !u.role?.name?.toLowerCase().includes("teacher") && !u.role?.name?.toLowerCase().includes("instructor")
  );
  const studentNum =
    inst.realStudentCount ?? (inst.studentCount ? parseInt(inst.studentCount, 10) || 0 : 0);
  const score = performanceScore(inst);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white font-bold text-sm">
            {inst.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
              {inst.name}
            </h3>
            {inst.category && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{inst.category}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
              PLAN_COLORS[inst.plan] ?? "bg-gray-100 text-gray-600"
            }`}
          >
            {inst.plan}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              inst.isActive
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            }`}
          >
            {inst.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 overflow-x-auto px-5 pb-4 no-scrollbar">
        <StatChip
          label="Students"
          value={studentNum || "—"}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
        />
        <StatChip
          label="Teachers"
          value={teachers.length || inst.users.length || "—"}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <StatChip
          label="Modules"
          value={inst.enabledFeatures.length}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatChip
          label="Staff"
          value={inst.users.length}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
      </div>

      {/* Performance */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Performance Score
          </span>
        </div>
        <ScoreBar score={score} />
      </div>

      {/* Toggle expand */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-xs font-medium text-brand-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <span>{expanded ? "Hide details" : "View details"}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4 space-y-5">
          {/* Enabled modules */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Enabled Modules
            </h4>
            <div className="flex flex-wrap gap-2">
              {ALL_FEATURES.map((f) => {
                const on = inst.enabledFeatures.includes(f);
                return (
                  <span
                    key={f}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      on
                        ? "bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400"
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
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Teachers / Instructors
            </h4>
            {teachers.length === 0 && otherStaff.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-600">No staff assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {(teachers.length > 0 ? teachers : otherStaff).map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-xs font-semibold">
                        {(u.firstName?.[0] ?? u.email[0]).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                          {u.firstName && u.lastName
                            ? `${u.firstName} ${u.lastName}`
                            : u.email}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {u.role && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {u.role.name}
                        </span>
                      )}
                      <span
                        className={`h-2 w-2 rounded-full ${
                          u.isActive ? "bg-emerald-400" : "bg-gray-300"
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info row */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {inst.country && (
              <div>
                <span className="text-gray-400 dark:text-gray-500">Country</span>
                <p className="font-medium text-gray-700 dark:text-gray-300">{inst.country}</p>
              </div>
            )}
            <div>
              <span className="text-gray-400 dark:text-gray-500">Created</span>
              <p className="font-medium text-gray-700 dark:text-gray-300">
                {new Date(inst.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
            {inst.description && (
              <div className="col-span-2">
                <span className="text-gray-400 dark:text-gray-500">Description</span>
                <p className="font-medium text-gray-700 dark:text-gray-300">{inst.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OverviewPage() {
  const [institutes, setInstitutes] = useState<InstituteDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const totalStudents = institutes.reduce(
    (sum, i) =>
      sum + (i.realStudentCount ?? (i.studentCount ? parseInt(i.studentCount, 10) || 0 : 0)),
    0
  );
  const totalTeachers = institutes.reduce((sum, i) => sum + i.users.length, 0);
  const totalModules = institutes.reduce((sum, i) => sum + i.enabledFeatures.length, 0);
  const activeInstitutes = institutes.filter((i) => i.isActive).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Overview</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          All institutes, students, teachers, and module performance at a glance.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">⚠ {error}</p>
        </div>
      )}

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Total Institutes",
            value: institutes.length,
            sub: `${activeInstitutes} active`,
            color: "from-brand-500 to-brand-600",
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            ),
          },
          {
            label: "Total Students",
            value: totalStudents || "—",
            sub: "across all institutes",
            color: "from-emerald-500 to-emerald-600",
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            ),
          },
          {
            label: "Staff / Teachers",
            value: totalTeachers || "—",
            sub: "assigned users",
            color: "from-violet-500 to-violet-600",
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ),
          },
          {
            label: "Enabled Modules",
            value: totalModules,
            sub: "total across institutes",
            color: "from-amber-500 to-amber-600",
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            ),
          },
        ].map((tile) => (
          <div
            key={tile.label}
            className="rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm"
          >
            <div className={`flex items-center gap-3 bg-gradient-to-r ${tile.color} px-4 py-3`}>
              <div className="text-white">{tile.icon}</div>
              <span className="text-xs font-semibold text-white/90">{tile.label}</span>
            </div>
            <div className="px-4 py-3">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{tile.value}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{tile.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Institute cards */}
      {institutes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 py-20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/20">
            <svg className="h-8 w-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white">No institutes yet</h3>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            Create your first institute to see performance data here.
          </p>
          <a
            href="/dashboard/institute"
            className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            Create Institute
          </a>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Institutes ({institutes.length})
            </h2>
            <a
              href="/dashboard/institute"
              className="text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
            >
              Manage institutes →
            </a>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {institutes.map((inst) => (
              <InstituteCard key={inst.id} inst={inst} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
