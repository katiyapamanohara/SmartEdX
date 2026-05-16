import { authService } from "./authService";

export type NotificationType = "message" | "email" | "reminder" | "cheat_alert";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  metadata: Record<string, any> | null;
  createdAt: string;
  instituteId?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

function authHeaders(): HeadersInit {
  const token = authService.getToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function getInstituteIds(): Promise<string[]> {
  try {
    const institutes = await authService.getInstitutes();
    return (institutes ?? []).map((inst: any) => inst.id).filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchForInstitute(instituteId: string): Promise<Notification[]> {
  try {
    const res = await fetch(
      `${API_URL}/api/institutes/institutes/${instituteId}/notifications`,
      { headers: authHeaders() }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((n: Notification) => ({ ...n, instituteId }));
  } catch {
    return [];
  }
}

export const notificationService = {
  async getNotifications(): Promise<Notification[]> {
    const ids = await getInstituteIds();
    if (!ids.length) return [];
    const results = await Promise.all(ids.map(fetchForInstitute));
    return results
      .flat()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async markAsRead(instituteId: string, notifId: string): Promise<void> {
    await fetch(
      `${API_URL}/api/institutes/institutes/${instituteId}/notifications/${notifId}/read`,
      { method: "PATCH", headers: authHeaders() }
    );
  },

  async markAllAsRead(instituteIds: string[]): Promise<void> {
    await Promise.all(
      instituteIds.map((id) =>
        fetch(
          `${API_URL}/api/institutes/institutes/${id}/notifications/mark-all-read`,
          { method: "PATCH", headers: authHeaders() }
        )
      )
    );
  },
};
