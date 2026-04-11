"use client";

import React, { useEffect, useState } from "react";
import { adminService } from "@/services/adminService";

interface Subscription {
  id: string;
  instituteId: string;
  institute?: { id: string; name: string; category?: string };
  plan: string;
  status: string;
  price: number;
  billingCycle: string;
  paymentMethod?: string;
  paymentReference?: string;
  startDate?: string;
  endDate?: string;
  nextBillingDate?: string;
  notes?: string;
  createdAt: string;
}

interface Institute { id: string; name: string }

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pro: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  enterprise: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  inactive: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  cancelled: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  trial: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
};

const PLAN_PRICES: Record<string, number> = { starter: 29, pro: 79, enterprise: 199 };

const emptyForm = {
  instituteId: "",
  plan: "starter",
  status: "active",
  price: 29,
  billingCycle: "monthly",
  paymentMethod: "card",
  paymentReference: "",
  startDate: "",
  endDate: "",
  nextBillingDate: "",
  notes: "",
};

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [subsData, instData] = await Promise.all([
        adminService.getAllSubscriptions(),
        adminService.getAllInstitutes(),
      ]);
      setSubs(subsData.subscriptions || []);
      setInstitutes(instData.institutes || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditSub(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEdit = (sub: Subscription) => {
    setEditSub(sub);
    setForm({
      instituteId: sub.instituteId,
      plan: sub.plan,
      status: sub.status,
      price: sub.price,
      billingCycle: sub.billingCycle,
      paymentMethod: sub.paymentMethod || "card",
      paymentReference: sub.paymentReference || "",
      startDate: sub.startDate ? sub.startDate.substring(0, 10) : "",
      endDate: sub.endDate ? sub.endDate.substring(0, 10) : "",
      nextBillingDate: sub.nextBillingDate ? sub.nextBillingDate.substring(0, 10) : "",
      notes: sub.notes || "",
    });
    setShowForm(true);
  };

  const handleFormChange = (field: string, value: string | number) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "plan") updated.price = PLAN_PRICES[value as string] || prev.price;
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editSub) {
        const updated = await adminService.updateSubscription(editSub.id, form as any);
        setSubs((prev) => prev.map((s) => (s.id === editSub.id ? { ...s, ...updated } : s)));
        setActionMsg("Subscription updated.");
      } else {
        const created = await adminService.createSubscription(form as any);
        setSubs((prev) => [created, ...prev]);
        setActionMsg("Subscription created.");
      }
      setShowForm(false);
    } catch (e: any) {
      setActionMsg("Failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this subscription?")) return;
    try {
      await adminService.cancelSubscription(id);
      setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, status: "cancelled" } : s)));
      setActionMsg("Subscription cancelled.");
    } catch (e: any) {
      setActionMsg("Failed: " + e.message);
    }
  };

  // Summary stats
  const activeSubs = subs.filter((s) => s.status === "active");
  const totalMRR = activeSubs.reduce((sum, s) => sum + parseFloat(s.price as any || "0"), 0);
  const totalARR = totalMRR * 12;

  const filtered = subs.filter((s) => {
    const name = s.institute?.name || "";
    return name.toLowerCase().includes(search.toLowerCase()) || s.plan.includes(search) || s.status.includes(search);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Subscriptions & Payments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage SaaS billing and subscription plans</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
        >
          + New Subscription
        </button>
      </div>

      {actionMsg && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300 flex items-center justify-between">
          {actionMsg}
          <button onClick={() => setActionMsg(null)} className="ml-4 text-blue-400 hover:text-blue-600">✕</button>
        </div>
      )}

      {/* Revenue summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Monthly Recurring Revenue", value: `$${totalMRR.toLocaleString()}`, sub: `${activeSubs.length} active subscriptions`, color: "from-emerald-500 to-emerald-600" },
          { label: "Annual Recurring Revenue", value: `$${totalARR.toLocaleString()}`, sub: "MRR × 12", color: "from-blue-500 to-blue-600" },
          { label: "Total Subscriptions", value: subs.length, sub: `${subs.filter(s => s.status === "cancelled").length} cancelled`, color: "from-violet-500 to-violet-600" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${c.color} text-white mb-3`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{c.value}</p>
            <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <input
            type="text"
            placeholder="Search by institute, plan or status…"
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
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Price</th>
                  <th className="px-5 py-3">Billing</th>
                  <th className="px-5 py-3">Next Billing</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">No subscriptions found.</td></tr>
                )}
                {filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                          {sub.institute?.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span className="font-medium text-gray-800 dark:text-white">{sub.institute?.name || sub.instituteId}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${PLAN_COLORS[sub.plan] || PLAN_COLORS.starter}`}>
                        {sub.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${STATUS_COLORS[sub.status] || STATUS_COLORS.inactive}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-700 dark:text-gray-200">
                      ${parseFloat(sub.price as any).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400 capitalize">{sub.billingCycle}</td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                      {sub.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => openEdit(sub)}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-400 transition-colors"
                        >
                          Edit
                        </button>
                        {sub.status !== "cancelled" && (
                          <button
                            onClick={() => handleCancel(sub.id)}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 my-auto">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-5">
              {editSub ? "Edit Subscription" : "New Subscription"}
            </h3>

            <div className="space-y-4">
              {/* Institute */}
              {!editSub && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Institute</label>
                  <select
                    value={form.instituteId}
                    onChange={(e) => handleFormChange("instituteId", e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select institute…</option>
                    {institutes.map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Plan & Price row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Plan</label>
                  <select
                    value={form.plan}
                    onChange={(e) => handleFormChange("plan", e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="starter">Starter — $29/mo</option>
                    <option value="pro">Pro — $79/mo</option>
                    <option value="enterprise">Enterprise — $199/mo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Price ($)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => handleFormChange("price", parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Status & Billing cycle row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => handleFormChange("status", e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="inactive">Inactive</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Billing Cycle</label>
                  <select
                    value={form.billingCycle}
                    onChange={(e) => handleFormChange("billingCycle", e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              {/* Payment method & reference */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Payment Method</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => handleFormChange("paymentMethod", e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Payment Reference</label>
                  <input
                    type="text"
                    placeholder="TXN-001…"
                    value={form.paymentReference}
                    onChange={(e) => handleFormChange("paymentReference", e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { field: "startDate", label: "Start Date" },
                  { field: "endDate", label: "End Date" },
                  { field: "nextBillingDate", label: "Next Billing" },
                ].map(({ field, label }) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                    <input
                      type="date"
                      value={(form as any)[field]}
                      onChange={(e) => handleFormChange(field, e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional notes…"
                  value={form.notes}
                  onChange={(e) => handleFormChange("notes", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || (!editSub && !form.instituteId)}
                className="px-4 py-2 text-sm rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {saving ? "Saving…" : editSub ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
