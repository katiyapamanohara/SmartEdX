"use client";

import React, { useEffect, useState } from "react";
import { adminService } from "@/services/adminService";

interface Institute {
  id: string;
  name: string;
  description?: string;
  category?: string;
  country?: string;
  studentCount?: string;
  plan: string;
  enabledFeatures: string[];
  isActive: boolean;
  createdAt: string;
}

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pro: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  enterprise: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const PLAN_PRICES: Record<string, number> = { starter: 29, pro: 79, enterprise: 199 };

const ALL_FEATURES = [
  { key: "live_sessions", label: "Live Sessions" },
  { key: "recordings", label: "Recordings" },
  { key: "ai_tools", label: "AI Tools" },
  { key: "exam_proctoring", label: "Exam Proctoring" },
  { key: "advanced_reports", label: "Advanced Reports" },
  { key: "virtual_labs", label: "Virtual Labs" },
  { key: "voice_agent", label: "Voice Agent" },
];

export default function AdminInstitutesPage() {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editModal, setEditModal] = useState<Institute | null>(null);
  const [editPlan, setEditPlan] = useState("starter");
  const [editFeatures, setEditFeatures] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminService
      .getAllInstitutes()
      .then((data) => setInstitutes(data.institutes || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openEdit = (inst: Institute) => {
    setEditModal(inst);
    setEditPlan(inst.plan || "starter");
    setEditFeatures(inst.enabledFeatures || []);
  };

  const toggleFeature = (key: string) => {
    setEditFeatures((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      await adminService.updateInstituteFeatures(editModal.id, { plan: editPlan, enabledFeatures: editFeatures });
      setInstitutes((prev) =>
        prev.map((i) => i.id === editModal.id ? { ...i, plan: editPlan, enabledFeatures: editFeatures } : i)
      );
      setActionMsg("Institute updated successfully.");
      setEditModal(null);
    } catch (e: any) {
      setActionMsg("Failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = institutes.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.category || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.country || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Institutes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage all registered institutes and their plans</p>
        </div>
        <span className="text-sm text-gray-400">{institutes.length} total</span>
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
            placeholder="Search by name, category or country…"
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
                  <th className="px-5 py-3">Institute</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">MRR</th>
                  <th className="px-5 py-3">Students</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">No institutes found.</td></tr>
                )}
                {filtered.map((inst) => (
                  <tr key={inst.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                          {inst.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">{inst.name}</p>
                          <p className="text-xs text-gray-400">{inst.category || "—"} · {inst.country || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${PLAN_COLORS[inst.plan] || PLAN_COLORS.starter}`}>
                        {inst.plan || "starter"}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-emerald-600 dark:text-emerald-400">
                      ${PLAN_PRICES[inst.plan] || 29}/mo
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{inst.studentCount || "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${inst.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}>
                        {inst.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(inst.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => openEdit(inst)}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-400 transition-colors"
                      >
                        Edit Plan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit plan modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">Edit Plan — {editModal.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Change subscription plan and feature access</p>

            {/* Plan selector */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {["starter", "pro", "enterprise"].map((plan) => (
                <button
                  key={plan}
                  onClick={() => setEditPlan(plan)}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${editPlan === plan ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400" : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400"}`}
                >
                  {plan}
                  <span className="block text-xs font-normal mt-0.5 text-gray-400">${PLAN_PRICES[plan]}/mo</span>
                </button>
              ))}
            </div>

            {/* Features */}
            <p className="text-xs font-semibold uppercase text-gray-400 mb-3">Enabled Features</p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {ALL_FEATURES.map((f) => (
                <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFeatures.includes(f.key)}
                    onChange={() => toggleFeature(f.key)}
                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{f.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditModal(null)}
                className="px-4 py-2 text-sm rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
