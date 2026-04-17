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
}

class NotificationService {
  private readonly apiUrl = process.env.NEXT_PUBLIC_API_URL;

  private headers(): HeadersInit {
    const token = authService.getToken();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  async getNotifications(instituteId: string): Promise<Notification[]> {
    const res = await fetch(
      `${this.apiUrl}/api/institutes/institutes/${instituteId}/notifications`,
      { headers: this.headers() }
    );
    if (!res.ok) return [];
    return res.json();
  }

  async getUnreadCount(instituteId: string): Promise<number> {
    const res = await fetch(
      `${this.apiUrl}/api/institutes/institutes/${instituteId}/notifications/unread-count`,
      { headers: this.headers() }
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count ?? 0;
  }

  async markAsRead(instituteId: string, notifId: string): Promise<void> {
    await fetch(
      `${this.apiUrl}/api/institutes/institutes/${instituteId}/notifications/${notifId}/read`,
      { method: "PATCH", headers: this.headers() }
    );
  }

  async markAllAsRead(instituteId: string): Promise<void> {
    await fetch(
      `${this.apiUrl}/api/institutes/institutes/${instituteId}/notifications/mark-all-read`,
      { method: "PATCH", headers: this.headers() }
    );
  }

  async createReminder(
    instituteId: string,
    title: string,
    body: string,
    scheduledAt?: string
  ): Promise<Notification | null> {
    const res = await fetch(
      `${this.apiUrl}/api/institutes/institutes/${instituteId}/notifications/reminders`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ title, body, scheduledAt }),
      }
    );
    if (!res.ok) return null;
    return res.json();
  }
}

export const notificationService = new NotificationService();
