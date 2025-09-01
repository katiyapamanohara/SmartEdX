import { Metadata } from "next";
import ProfileTabs from "@/components/user-profile/ProfileTabs";
import React from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export const metadata: Metadata = {
  title: "User Profile | Articom SaaS",
  description: "View and edit your user profile",
};

export default function Profile() {
  return (
    <ProtectedRoute>
      <div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
            User Profile
          </h3>
          
          <ProfileTabs />
        </div>
      </div>
    </ProtectedRoute>
  );
}
