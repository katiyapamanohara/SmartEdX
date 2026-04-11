"use client";

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
        // Fetch user counts for each institute in parallel
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
        setError(e.message);
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

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400">Failed to load dashboard: {error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
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
    </div>
  );
}
