"use client";
import React from "react";
import Badge from "../ui/badge/Badge";
import { ArrowUpIcon, BoxIconLine, GroupIcon } from "@/icons";

interface EcommerceMetricsProps {
  instructorCount?: number;
  courseCount?: number;
  loading?: boolean;
}

export const EcommerceMetrics = ({
  instructorCount,
  courseCount,
  loading = false,
}: EcommerceMetricsProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      {/* Total Lectures */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>

        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total Lectures
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {loading ? (
                <span className="animate-pulse text-gray-300 dark:text-gray-700">
                  ---
                </span>
              ) : (
                (instructorCount ?? 0).toLocaleString()
              )}
            </h4>
          </div>
          <Badge color="success">
            <ArrowUpIcon />
            Live
          </Badge>
        </div>
      </div>

      {/* Total Courses */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoxIconLine className="text-gray-800 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total Courses
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {loading ? (
                <span className="animate-pulse text-gray-300 dark:text-gray-700">
                  ---
                </span>
              ) : (
                (courseCount ?? 0).toLocaleString()
              )}
            </h4>
          </div>

          <Badge color="success">
            <ArrowUpIcon />
            Live
          </Badge>
        </div>
      </div>
    </div>
  );
};

