"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { authService } from "@/services/authService";
import InstituteMetrics from "@/components/dashboard/InstituteMetrics";
import UsersGrowthChart from "@/components/dashboard/UsersGrowthChart";
import PlanProgressCard from "@/components/dashboard/PlanProgressCard";
import InstituteStatsChart from "@/components/dashboard/InstituteStatsChart";
import RecentInstitutes from "@/components/dashboard/RecentInstitutes";
import FeatureUsageCard from "@/components/dashboard/FeatureUsageCard";

export interface InstituteData {
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
  userCount?: number;
  users?: any[];
}

export default function DashboardPage() {
  const [institutes, setInstitutes] = useState<InstituteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = authService.getUser();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const raw: InstituteData[] = await authService.getInstitutes();
        const enriched = await Promise.all(
          raw.map(async (inst) => {
            try {
              const users = await authService.getInstituteUsers(inst.id);
              return { ...inst, users, userCount: Array.isArray(users) ? users.length : 0 };
            } catch {
              return { ...inst, users: [], userCount: 0 };
            }
          })
        );
        setInstitutes(enriched);
      } catch (e: any) {
        setError(e.message ?? 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      {/* Error banner */}
      {error && (
        <div className="col-span-12 rounded-xl border border-red-200 bg-red-50 px-5 py-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">⚠ {error}</p>
        </div>
      )}

      {/* Welcome banner */}
      <div className="col-span-12">
        <div className="rounded-2xl bg-gradient-to-r from-brand-500 to-brand-700 p-5 text-white md:p-6">
          <h1 className="text-xl font-bold md:text-2xl">
            Welcome back, {user?.firstName || "there"} 👋
          </h1>
          <p className="mt-1 text-sm text-white/80">
            Here&apos;s an overview of your institutes and platform activity.
          </p>
        </div>
      </div>

      {institutes.length === 0 ? (
        <div className="col-span-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-20 dark:border-gray-700 dark:bg-gray-800/30">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/20">
            <svg className="h-8 w-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white">No institutes yet</h3>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Create your first institute to start managing courses and users.</p>
          <a
            href="/dashboard/institute"
            className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            Create Institute
          </a>
        </div>
      ) : (
        <>
          {/* Metric cards */}
          <div className="col-span-12 space-y-6 xl:col-span-7">
            <InstituteMetrics institutes={institutes} />
            <UsersGrowthChart institutes={institutes} />
          </div>

          {/* Plan progress */}
          <div className="col-span-12 xl:col-span-5">
            <PlanProgressCard institutes={institutes} />
          </div>

          {/* Statistics (multi-institute comparison) */}
          <div className="col-span-12">
            <InstituteStatsChart institutes={institutes} />
          </div>

          {/* Feature usage + Recent institutes */}
          <div className="col-span-12 xl:col-span-5">
            <FeatureUsageCard institutes={institutes} />
          </div>

          <div className="col-span-12 xl:col-span-7">
            <RecentInstitutes institutes={institutes} />
          </div>
        </>
      )}
    </div>
  );
}
