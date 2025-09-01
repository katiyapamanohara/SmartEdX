'use client';

import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import React from "react";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import { useState } from "react";
import MonthlyTokenUsage from "@/components/ecommerce/MonthlyTokenUsage";
import VoiceStatisticsChart from "@/components/ecommerce/VoiceStatisticsChart";
import { useSubscriptionTracker } from "@/hooks/useSubscription";

export default function Ecommerce() {
  const [showBanner, setShowBanner] = useState(true);

  useSubscriptionTracker();

  return (
    <div>
      {/* Updates Banner */}
      {showBanner && (
        <div className="mb-4 flex items-center justify-between rounded-xl px-6 py-3 border dark:bg-[#17223b] dark:border-[#22315a] dark:text-blue-100"
          style={{
            backgroundColor: "#465FFF22",
            borderColor: "#465FFF",
            color: "#465FFF"
          }}>
          <div>
            <span className="font-semibold">New Version Released!</span> &nbsp;
            <span className="text-sm">
              Version 2.1.0 is now live.{" "}
              <a
                href="/"
                className="underline text-blue-600 hover:text-blue-800"
                target="_blank"
                rel="noopener noreferrer"
              >
                Check out
              </a>{" "}
              the latest features and improvements.
            </span>
          </div>
          <button
            className="ml-4 text-blue-500 hover:text-blue-700 font-bold"
            onClick={() => setShowBanner(false)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Top metrics row */}
        <div className="col-span-12 flex flex-row gap-6">
          <EcommerceMetrics />
        </div>

        {/* Monthly Sales and Monthly Target side by side */}
        <div className="col-span-12 flex flex-col xl:flex-row gap-6">
          <div className="flex-1">
            <MonthlyTokenUsage />
            {/* <MonthlySalesChart /> */}
          </div>
          <div className="flex-1">
            <MonthlyTarget />
          </div>
        </div>

        {/* Toekn Usage Statistics Chart */}
        <div className="col-span-12">
          <StatisticsChart />
        </div>

        {/* Voice Minutes statistics Chart */}
        <div className="col-span-12">
          <VoiceStatisticsChart />
        </div>

        {/* Demographic Card and Recent Orders */}
        {/* <div className="col-span-12 xl:col-span-5">
          <DemographicCard />
        </div>
        <div className="col-span-12 xl:col-span-7">
          <RecentOrders />
        </div> */}
      </div>
    </div>
  );
}