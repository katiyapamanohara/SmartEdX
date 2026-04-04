import { authService } from "./authService";

class StudentService {
  private readonly apiUrl = process.env.NEXT_PUBLIC_API_URL;

  async getMyProfile(): Promise<any> {
    const token = authService.getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${this.apiUrl}/api/institutes/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      return await response.json();
    } catch (error) {
      console.error("StudentService.getMyProfile Error:", error);
      return null;
    }
  }

  async enrollFaceFromBase64(imageB64: string): Promise<{ descriptor: number[]; dimensions: number } | null> {
    const token = authService.getToken();
    if (!token) return null;
    const form = new FormData();
    form.append("image_b64", imageB64);
    const res = await fetch(`${this.apiUrl}/api/ai/face/enroll-base64`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Face extraction failed");
    }
    return res.json();
  }

  async enrollFace(descriptor: number[]): Promise<{ faceEnrolled: boolean } | null> {
    const token = authService.getToken();
    if (!token) return null;
    const res = await fetch(`${this.apiUrl}/api/institutes/auth/me/face`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ descriptor }),
    });
    if (!res.ok) return null;
    return res.json();
  }

  async removeFace(): Promise<{ faceEnrolled: boolean } | null> {
    const token = authService.getToken();
    if (!token) return null;
    const res = await fetch(`${this.apiUrl}/api/institutes/auth/me/face`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  }

  async verifyFace(imageB64: string): Promise<{ verified: boolean; distance: number; threshold: number }> {
    const token = authService.getToken();
    if (!token) throw new Error("Not authenticated");
    const res = await fetch(`${this.apiUrl}/api/institutes/auth/me/face/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ image_b64: imageB64 }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).detail || "Face verification failed");
    }
    return res.json();
  }

  async updateMyProfile(data: any): Promise<any> {
    const token = authService.getToken();
    if (!token) throw new Error("No auth token");

    const response = await fetch(`${this.apiUrl}/api/institutes/auth/me`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update profile");
    }

    return await response.json();
  }
}

export const studentService = new StudentService();
