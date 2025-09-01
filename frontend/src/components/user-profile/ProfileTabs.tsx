"use client";
import React, { useState } from "react";
import UserInfoCard from "@/components/user-profile/UserInfoCard";
import UserMetaCard from "@/components/user-profile/UserMetaCard";
import CompanyProfileCard from "@/components/user-profile/CompanyProfileCard";

export default function ProfileTabs() {
  const [activeTab, setActiveTab] = useState<"user" | "company">("user");

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("user")}
            className={`px-4 py-2.5 font-medium text-sm w-full rounded-md hover:text-gray-900 dark:hover:text-white sm:w-auto ${
              activeTab === "user"
                ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            User Profile
          </button>
          <button
            onClick={() => setActiveTab("company")}
            className={`px-4 py-2.5 font-medium text-sm w-full rounded-md hover:text-gray-900 dark:hover:text-white sm:w-auto ${
              activeTab === "company"
                ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            Company Profile
          </button>
        </div>
      </div>

      {activeTab === "user" && (
        <div className="space-y-6">
          <UserMetaCard />
          <UserInfoCard />
        </div>
      )}
      
      {activeTab === "company" && (
        <div className="space-y-6">
          <CompanyProfileCard />
        </div>
      )}
    </>
  );
}
