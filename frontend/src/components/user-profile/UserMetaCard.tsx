"use client";
import React from "react";
import Image from "next/image";
import { useProfile } from "@/hooks/useProfile";
import { useEffect, useState } from "react";
import type { UserProfile, ProfileApiResponse } from "@/types/profile";

export default function UserMetaCard() {
  const { fetchProfile } = useProfile();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile().then((response: ProfileApiResponse | null) => {
      if (response && response.data) setProfile(response.data);
      setLoading(false);
      console.log("Fetched profile data:", response?.data);
    }).catch(() => {
      setLoading(false);
    });
  }, [fetchProfile]);

  return (
    <>
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      )}

      {!loading && (
        <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
              <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800">
                <Image
                  width={80}
                  height={80}
                  src={
                    typeof profile?.auth?.profileImage === "string" && (profile.auth.profileImage as string).trim().length > 0
                      ? profile.auth.profileImage
                      : "/images/user/default_user.jpg"
                  }
                  alt={profile?.auth?.firstName && profile?.auth?.lastName
                    ? `${profile.auth.firstName} ${profile.auth.lastName}`
                    : "User"}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="order-3 xl:order-2">
                <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                  {profile?.auth?.firstName && profile?.auth?.lastName
                    ? `${profile.auth.firstName} ${profile.auth.lastName}`
                    : "User Name"}
                </h4>
                <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {profile?.authMeta?.phoneNumber || "No phone"}
                  </p>
                  <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {profile?.auth?.firstName ? "Verified User" : "Guest"}
                  </p>
                </div>
              </div>
              <div className="flex items-center order-2 gap-2 grow xl:order-3 xl:justify-end">
                <a
                  href={profile?.authMeta?.socialLinks?.x || "https://x.com/PimjoHQ"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                >
                  <svg
                    className="fill-current"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15.1708 1.875H17.9274L11.9049 8.75833L18.9899 18.125H13.4424L9.09742 12.4442L4.12578 18.125H1.36745L7.80912 10.7625L1.01245 1.875H6.70078L10.6283 7.0675L15.1708 1.875ZM14.2033 16.475H15.7308L5.87078 3.43833H4.23162L14.2033 16.475Z"
                      fill=""
                    />
                  </svg>
                </a>

                <a
                  href={profile?.authMeta?.socialLinks?.linkedin || "https://www.linkedin.com/company/pimjo"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                >
                  <svg
                    className="fill-current"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5.78381 4.16645C5.78351 4.84504 5.37181 5.45569 4.74286 5.71045C4.11391 5.96521 3.39331 5.81321 2.92083 5.32613C2.44836 4.83904 2.31837 4.11413 2.59216 3.49323C2.86596 2.87233 3.48886 2.47942 4.16715 2.49978C5.06804 2.52682 5.78422 3.26515 5.78381 4.16645ZM5.83381 7.06645H2.50048V17.4998H5.83381V7.06645ZM11.1005 7.06645H7.78381V17.4998H11.0672V12.0248C11.0672 8.97475 15.0422 8.69142 15.0422 12.0248V17.4998H18.3338V10.8914C18.3338 5.74978 12.4505 5.94145 11.0672 8.46642L11.1005 7.06645Z"
                      fill=""
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
