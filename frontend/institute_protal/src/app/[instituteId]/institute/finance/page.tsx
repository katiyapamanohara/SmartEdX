"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { instituteService } from "@/services/instituteService";
import { GroupIcon, BoxIconLine } from "@/icons";
import Badge from "@/components/ui/badge/Badge";
import { ArrowUpIcon } from "@/icons";

interface FinanceMetrics {
  studentCount: number;
  teacherCount: number;
  courseCount: number;
}

function MetricCard({
  icon,
  label,
  value,
  loading,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading: boolean;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
        {icon}
      </div>
      <div className="flex items-end justify-between mt-5">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {label}
          </span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {loading ? (
              <span className="animate-pulse text-gray-300 dark:text-gray-700">
                ---
              </span>
            ) : (
              value.toLocaleString()
            )}
          </h4>
          {sub && !loading && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>
          )}
        </div>
        <Badge color="success">
          <ArrowUpIcon />
          Live
        </Badge>
      </div>
    </div>
  );
}

export default function FinancePage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const [metrics, setMetrics] = useState<FinanceMetrics>({
    studentCount: 0,
    teacherCount: 0,
    courseCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!instituteId) return;

    async function fetchData() {
      setLoading(true);
      try {
        const [allUsers, teacherCount, courses] = await Promise.all([
          instituteService.getInstituteUsers(instituteId),
          instituteService.getTeacherCount(instituteId),
          instituteService.getCourses(instituteId),
        ]);

        const studentCount = allUsers.filter(
          (u: any) =>
            u.role?.name === "student" || u.role === "student"
        ).length;

        setMetrics({
          studentCount,
          teacherCount,
          courseCount: courses.length,
        });
      } catch (err) {
        console.error("FinancePage: failed to fetch metrics", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [instituteId]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Finance Overview
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Live summary of institute resources
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
        <MetricCard
          icon={<GroupIcon className="text-gray-800 size-6 dark:text-white/90" />}
          label="Total Students"
          value={metrics.studentCount}
          loading={loading}
          sub="Enrolled students"
        />
        <MetricCard
          icon={<GroupIcon className="text-gray-800 size-6 dark:text-white/90" />}
          label="Total Lectures"
          value={metrics.teacherCount}
          loading={loading}
          sub="Teachers assigned"
        />
        <MetricCard
          icon={<BoxIconLine className="text-gray-800 dark:text-white/90" />}
          label="Total Courses"
          value={metrics.courseCount}
          loading={loading}
          sub="Active courses"
        />
      </div>

      {/* Placeholder panel */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">
          Financial Reports
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Detailed billing, invoices, and revenue analytics will appear here.
        </p>
      </div>
    </div>
  );
}
