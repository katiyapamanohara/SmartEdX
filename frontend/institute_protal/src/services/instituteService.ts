import { authService } from "./authService";

export interface Institute {
  id: string;
  name: string;
  logo?: string;
  // Add other fields as needed
}

class InstituteService {
  private readonly apiUrl = process.env.NEXT_PUBLIC_API_URL;

  async getInstituteById(id: string): Promise<Institute | null> {
    const token = authService.getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${this.apiUrl}/api/institutes/auth/institutes/${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch institute details");
      }

      return await response.json();
    } catch (error) {
      console.error("InstituteService.getInstituteById Error:", error);
      return null;
    }
  }
}

export const instituteService = new InstituteService();
