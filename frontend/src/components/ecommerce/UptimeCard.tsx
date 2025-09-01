import React from "react";

const UptimeCard: React.FC<{ uptime: number }> = ({ uptime }) => (
  <div className="min-w-[210px] flex-shrink-0 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 flex flex-col h-full">
    <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
      <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800">
        <svg className="w-7 h-7 text-gray-600 dark:text-white/90" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
        </svg>
      </span>
    </div>
    <div className="flex flex-col justify-between mt-5 h-full">
      <div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          System Uptime
        </span>
        <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
          {uptime}%
        </h4>
      </div>
    </div>
  </div>
);

export default UptimeCard;