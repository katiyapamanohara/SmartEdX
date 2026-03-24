import { authService } from "./authService";

export interface MessageContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
  role: string;
  courses: { id: string; name: string }[];
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  recipientId: string;
  isRead: boolean;
  isMine: boolean;
  createdAt: string;
}

class MessageService {
  private readonly apiUrl = process.env.NEXT_PUBLIC_API_URL;

  private headers(): HeadersInit {
    const token = authService.getToken();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  async getContacts(instituteId: string): Promise<MessageContact[]> {
    const res = await fetch(
      `${this.apiUrl}/api/institutes/institutes/${instituteId}/messages/contacts`,
      { headers: this.headers() }
    );
    if (!res.ok) return [];
    return res.json();
  }

  async getConversation(instituteId: string, otherUserId: string): Promise<Message[]> {
    const res = await fetch(
      `${this.apiUrl}/api/institutes/institutes/${instituteId}/messages/conversation/${otherUserId}`,
      { headers: this.headers() }
    );
    if (!res.ok) return [];
    return res.json();
  }

  async sendMessage(
    instituteId: string,
    recipientId: string,
    content: string
  ): Promise<Message | null> {
    const res = await fetch(
      `${this.apiUrl}/api/institutes/institutes/${instituteId}/messages`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ recipientId, content }),
      }
    );
    if (!res.ok) return null;
    return res.json();
  }

  async getUnreadCounts(instituteId: string): Promise<Record<string, number>> {
    const res = await fetch(
      `${this.apiUrl}/api/institutes/institutes/${instituteId}/messages/unread-counts`,
      { headers: this.headers() }
    );
    if (!res.ok) return {};
    return res.json();
  }
}

export const messageService = new MessageService();
