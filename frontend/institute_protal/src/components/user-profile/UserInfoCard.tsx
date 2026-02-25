"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { authService, User } from "@/services/authService";
import { FiEdit2, FiMail, FiUser, FiKey, FiTag } from "react-icons/fi";

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="mb-1 text-xs leading-normal text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800 dark:text-white/90">{value || "—"}</p>
    </div>
  );
}

export default function UserInfoCard() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const params = useParams();
  const instituteId = params?.instituteId as string;

  useEffect(() => {
    setUser(authService.getUser());
  }, []);

  if (!user) return null;

  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-5">
            Personal Information
          </h4>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
            <InfoRow label="First Name" value={user.firstName} />
            <InfoRow label="Last Name" value={user.lastName} />
            <InfoRow label="Email Address" value={user.email} />
            <InfoRow label="Role" value={user.role} />
            <InfoRow label="Account Type" value={user.type} />
            <InfoRow label="User ID" value={user.id} />
          </div>
        </div>

        <button
          onClick={() => router.push(`/${instituteId}/institute/edit-profile`)}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] lg:inline-flex lg:w-auto"
        >
          <FiEdit2 className="w-4 h-4" />
          Edit
        </button>
      </div>
    </div>
  );
}
