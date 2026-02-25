"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { authService, User } from "@/services/authService";
import { FiUser, FiMail, FiShield, FiTag, FiEdit2 } from "react-icons/fi";
import Image from "next/image";

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-gray-900 dark:text-white break-all">{value || "—"}</p>
    </div>
  );
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  instructor: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  teacher: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  student: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export default function AccountSettingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const instituteId = params?.instituteId as string;

  useEffect(() => {
    async function loadUser() {
      // 1. Try cookie first (instant)
      const cached = authService.getUser();
      if (cached) {
        setUser(cached);
        setLoading(false);
        return;
      }
      // 2. Fall back to API call
      const profile = await authService.getProfile();
      setUser(profile);
      setLoading(false);
    }
    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-gray-500 dark:text-gray-400">Could not load user profile.</p>
        <button
          onClick={() => router.push(`/${instituteId}/signin`)}
          className="text-sm text-blue-600 underline"
        >
          Sign in again
        </button>
      </div>
    );
  }

  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();
  // role may be a string or {name, id, ...} object from the API
  const roleStr =
    typeof user.role === "string" ? user.role : (user.role as any)?.name ?? "";
  const roleBadge = roleStr.toLowerCase();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header card */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] overflow-hidden">
        {/* Cover gradient */}
        <div className="h-32 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600" />
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {user.profilePicture ? (
                <Image
                  width={96}
                  height={96}
                  src={user.profilePicture}
                  alt={fullName}
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-white dark:border-gray-900 shadow-lg"
                
                />  
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white dark:border-gray-900 shadow-lg">
                  {initials || <FiUser className="w-10 h-10" />}
                </div>
              )}
            </div>
            {/* Edit button */}
            <button
              onClick={() => router.push(`/${instituteId}/institute/edit-profile`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm self-end"
            >
              <FiEdit2 className="w-4 h-4" />
              Edit Profile
            </button>
          </div>
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{fullName || "—"}</h2>
              {roleBadge && (
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${ROLE_COLORS[roleBadge] ?? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                  {roleStr}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
              <FiMail className="w-4 h-4" />
              {user.email}
            </p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FiUser className="w-4 h-4 text-blue-500" />
            Personal Information
          </h3>
          <button
            onClick={() => router.push(`/${instituteId}/institute/edit-profile`)}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            <FiEdit2 className="w-3.5 h-3.5" />
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
          <InfoRow label="First Name" value={user.firstName} />
          <InfoRow label="Last Name" value={user.lastName} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Role" value={roleStr} />
          <InfoRow label="Account Type" value={user.type} />
          <InfoRow label="User ID" value={user.id} />
        </div>
      </div>

      {/* Account security */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
          <FiShield className="w-4 h-4 text-green-500" />
          Account Security
        </h3>
        <div className="space-y-4">
          {[
            { title: "Password", desc: "Keep your account secure with a strong password", action: "Change", actionCls: "text-blue-600 dark:text-blue-400" },
            { title: "Two-Factor Authentication", desc: "Add an extra layer of security", action: "Not enabled", actionCls: "text-gray-400 dark:text-gray-500 cursor-default" },
            { title: "Login Sessions", desc: "Manage your active login sessions", action: "Sign out all", actionCls: "text-red-500" },
          ].map((item, i, arr) => (
            <div key={item.title} className={`flex items-center justify-between py-3 ${i < arr.length - 1 ? "border-b border-gray-100 dark:border-gray-700" : ""}`}>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white">{item.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
              </div>
              <button className={`text-xs font-medium ${item.actionCls}`}>{item.action}</button>
            </div>
          ))}
        </div>
      </div>

      {/* Institute info */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
          <FiTag className="w-4 h-4 text-purple-500" />
          Institute Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <InfoRow label="Institute ID" value={user.instituteId} />
          <InfoRow label="Status" value={user.isNew ? "New User" : "Active"} />
        </div>
      </div>
    </div>
  );
}
