import { authService } from "./authService";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authService.getToken()}`,
  };
}

export const adminService = {
  // ─── Analytics ───────────────────────────────────────────────────────────────
  getAnalytics: async () => {
    const res = await fetch(`${API_URL}/api/auth/admin/analytics`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch analytics");
    return res.json();
  },

  // ─── Users ───────────────────────────────────────────────────────────────────
  getAllUsers: async () => {
    const res = await fetch(`${API_URL}/api/auth/users`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch users");
    return res.json();
  },

  toggleUserStatus: async (userId: string) => {
    const res = await fetch(`${API_URL}/api/auth/admin/toggle-status/${userId}`, {
      method: "PATCH",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to toggle user status");
    return res.json();
  },

  resetPassword: async (userId: string, newPassword: string) => {
    const res = await fetch(`${API_URL}/api/auth/admin/reset-password`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ userId, newPassword }),
    });
    if (!res.ok) throw new Error("Failed to reset password");
    return res.json();
  },

  // ─── Institutes ──────────────────────────────────────────────────────────────
  getAllInstitutes: async () => {
    const res = await fetch(`${API_URL}/api/auth/admin/institutes`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch institutes");
    return res.json();
  },

  updateInstituteFeatures: async (id: string, data: { plan: string; enabledFeatures: string[] }) => {
    const res = await fetch(`${API_URL}/api/auth/institutes/${id}/features`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update institute features");
    return res.json();
  },

  // ─── Subscriptions ───────────────────────────────────────────────────────────
  getAllSubscriptions: async () => {
    const res = await fetch(`${API_URL}/api/auth/admin/subscriptions`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch subscriptions");
    return res.json();
  },

  createSubscription: async (data: {
    instituteId: string;
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
  }) => {
    const res = await fetch(`${API_URL}/api/auth/admin/subscriptions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create subscription");
    return res.json();
  },

  updateSubscription: async (id: string, data: Partial<{
    plan: string;
    status: string;
    price: number;
    billingCycle: string;
    paymentMethod: string;
    paymentReference: string;
    startDate: string;
    endDate: string;
    nextBillingDate: string;
    notes: string;
  }>) => {
    const res = await fetch(`${API_URL}/api/auth/admin/subscriptions/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update subscription");
    return res.json();
  },

  cancelSubscription: async (id: string) => {
    const res = await fetch(`${API_URL}/api/auth/admin/subscriptions/${id}/cancel`, {
      method: "PATCH",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to cancel subscription");
    return res.json();
  },
};
