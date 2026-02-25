"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { authService, User } from "@/services/authService";
import { FiEdit2, FiMail, FiUser, FiShield } from "react-icons/fi";

export default function UserMetaCard() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const params = useParams();
  const instituteId = params?.instituteId as string;

  useEffect(() => {
    setUser(authService.getUser());
  }, []);

  if (!user) return null;

  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const roleBadge = user.role?.toLowerCase();

  const badgeColor: Record<string, string> = {
    admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    instructor: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    teacher: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    student: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-5 xl:flex-row">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={fullName}
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold border-2 border-gray-200 dark:border-gray-700">
                {initials || <FiUser className="w-8 h-8" />}
              </div>
            )}
          </div>

          {/* Name + role */}
          <div className="text-center xl:text-left">
            <h4 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
              {fullName || "—"}
            </h4>
            <div className="flex flex-wrap items-center justify-center xl:justify-start gap-2">
              {roleBadge && (
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${badgeColor[roleBadge] ?? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                  {user.role}
                </span>
              )}
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <FiMail className="w-3.5 h-3.5" />
                {user.email}
              </span>
            </div>
          </div>
        </div>

        {/* Edit button */}
        <button
          onClick={() => router.push(`/${instituteId}/institute/edit-profile`)}
          className="flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          <FiEdit2 className="w-4 h-4" />
          Edit Profile
        </button>
      </div>
    </div>
  );
}
