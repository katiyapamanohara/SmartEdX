"use client";

import React, { useEffect, useState } from "react";
import { adminService } from "@/services/adminService";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: { name: string };
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [resetting, setResetting] = useState<string | null>(null);
  const [resetModal, setResetModal] = useState<{ userId: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminService
      .getAllUsers()
      .then((data) => setUsers(data.users || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (userId: string) => {
    try {
      await adminService.toggleUserStatus(userId);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: !u.isActive } : u))
      );
    } catch (e: any) {
      setActionMsg("Failed to toggle status: " + e.message);
    }
  };

  const handleResetPassword = async () => {
    if (!resetModal || !newPassword.trim()) return;
    setResetting(resetModal.userId);
    try {
      await adminService.resetPassword(resetModal.userId, newPassword);
      setActionMsg("Password reset successfully.");
      setResetModal(null);
      setNewPassword("");
    } catch (e: any) {
      setActionMsg("Failed: " + e.message);
    } finally {
      setResetting(null);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Users</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage all SaaS platform users</p>
        </div>
        <span className="text-sm text-gray-400">{users.length} total</span>
      </div>

      {actionMsg && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300 flex items-center justify-between">
          {actionMsg}
          <button onClick={() => setActionMsg(null)} className="ml-4 text-blue-400 hover:text-blue-600">✕</button>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          </div>
        ) : error ? (
          <p className="p-6 text-red-500">{error}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-gray-400">No users found.</td>
                  </tr>
                )}
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                          {user.firstName?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="capitalize text-gray-600 dark:text-gray-300">{user.role?.name || "owner"}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleToggle(user.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${user.isActive ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400"}`}
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => setResetModal({ userId: user.id, email: user.email })}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 transition-colors"
                        >
                          Reset Password
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reset password modal */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Reset Password</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{resetModal.email}</p>
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setResetModal(null); setNewPassword(""); }}
                className="px-4 py-2 text-sm rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={!!resetting || !newPassword.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {resetting ? "Saving…" : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
