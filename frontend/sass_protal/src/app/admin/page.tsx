"use client";

import React, { useEffect, useState } from "react";
import { adminService } from "@/services/adminService";

interface Analytics {
  users: { total: number; active: number; inactive: number; newThisMonth: number };
  institutes: { total: number; active: number; inactive: number };
  subscriptions: { total: number; active: number; byPlan: Record<string, number>; monthlyRevenue: number };
  recentInstitutes: any[];
  recentUsers: any[];
}

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pro: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  enterprise: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const PLAN_PRICES: Record<string, number> = { starter: 29, pro: 79, enterprise: 199 };

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminService
      .getAnalytics()
      .then(setAnalytics)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400">Failed to load analytics: {error}</p>
      </div>
    );
  }

  const a = analytics!;
  const totalPlanRevenue = Object.entries(a.subscriptions.byPlan).reduce(
    (sum, [plan, count]) => sum + (PLAN_PRICES[plan] || 0) * count,
    0
  );
  const mrr = a.subscriptions.monthlyRevenue > 0 ? a.subscriptions.monthlyRevenue : totalPlanRevenue;

  const metricCards = [
    {
      label: "Total Users",
      value: a.users.total,
      sub: `+${a.users.newThisMonth} this month`,
      color: "from-blue-500 to-blue-600",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: "Active Institutes",
      value: a.institutes.active,
      sub: `${a.institutes.total} total`,
      color: "from-emerald-500 to-emerald-600",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      label: "Active Subscriptions",
      value: a.subscriptions.active,
      sub: `${a.subscriptions.total} total`,
      color: "from-violet-500 to-violet-600",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Est. Monthly Revenue",
      value: `$${mrr.toLocaleString()}`,
      sub: "Based on active plans",
      color: "from-amber-500 to-amber-600",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">SaaS Admin Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Platform overview and analytics</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metricCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</span>
              <div className={`bg-gradient-to-br ${card.color} rounded-lg p-2 text-white`}>{card.icon}</div>
            </div>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{card.value}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Plan breakdown + User stats */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Plan breakdown */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-4">Institutes by Plan</h2>
          <div className="space-y-3">
            {["starter", "pro", "enterprise"].map((plan) => {
              const count = a.subscriptions.byPlan[plan] || a.institutes.total === 0 ? (a.subscriptions.byPlan[plan] || 0) : 0;
              const instCount = a.subscriptions.byPlan[plan] || 0;
              const total = a.institutes.total || 1;
              const pct = Math.round((instCount / total) * 100);
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLORS[plan]}`}>{plan}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {instCount} institute{instCount !== 1 ? "s" : ""} &nbsp;·&nbsp; ${PLAN_PRICES[plan]}/mo each
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className={`h-2 rounded-full bg-gradient-to-r ${plan === "starter" ? "from-blue-400 to-blue-500" : plan === "pro" ? "from-purple-400 to-purple-500" : "from-amber-400 to-amber-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Estimated MRR</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">${mrr.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* User stats */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-4">User Statistics</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Users", value: a.users.total, color: "text-blue-600 dark:text-blue-400" },
              { label: "Active Users", value: a.users.active, color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Inactive Users", value: a.users.inactive, color: "text-red-500 dark:text-red-400" },
              { label: "New This Month", value: a.users.newThisMonth, color: "text-violet-600 dark:text-violet-400" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-4 text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent institutes + Recent users */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent institutes */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200">Recent Institutes</h2>
            <a href="/admin/institutes" className="text-xs text-brand-500 hover:text-brand-600 font-medium">View all</a>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {a.recentInstitutes.length === 0 && (
              <p className="p-5 text-sm text-gray-400">No institutes yet.</p>
            )}
            {a.recentInstitutes.map((inst) => (
              <div key={inst.id} className="flex items-center gap-3 px-5 py-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {inst.name?.[0]?.toUpperCase() || "I"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{inst.name}</p>
                  <p className="text-xs text-gray-400 truncate">{inst.category || "General"} · {inst.country || "—"}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${PLAN_COLORS[inst.plan || "starter"]}`}>
                  {inst.plan || "starter"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent users */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200">Recent Users</h2>
            <a href="/admin/users" className="text-xs text-brand-500 hover:text-brand-600 font-medium">View all</a>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {a.recentUsers.length === 0 && (
              <p className="p-5 text-sm text-gray-400">No users yet.</p>
            )}
            {a.recentUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3 px-5 py-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {user.firstName?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${user.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}>
                  {user.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
