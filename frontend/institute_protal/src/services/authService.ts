import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/utils/firebase";
import Cookies from "js-cookie";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  instituteId: string;
  profilePicture?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

class AuthService {
  private readonly apiUrl = process.env.NEXT_PUBLIC_API_URL;

  async signInWithGoogle(instituteId: string): Promise<AuthResponse> {
    try {
      googleProvider.setCustomParameters({
        prompt: "select_account",
      });
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      // Call backend to verify and get JWT
      const response = await fetch(`${this.apiUrl}/api/institutes/auth/firebase/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken,
          instituteId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to authenticate with backend");
      }

      const data: AuthResponse = await response.json();

      // Store token in cookies
      Cookies.set("access_token", data.access_token, {
        expires: 7,
        secure: true,
        sameSite: "strict",
      });

      // Store user info in localStorage
      localStorage.setItem("user", JSON.stringify(data.user));

      return data;
    } catch (error) {
      console.error("AuthService.signInWithGoogle Error:", error);
      throw error;
    }
  }

  async logout() {
    try {
      const user = this.getUser();
      const instituteId = user?.instituteId;

      // Sign out from Firebase
      await auth.signOut();

      // Clear local state
      Cookies.remove("access_token");
      localStorage.removeItem("user");

      // Redirect to institute-specific signin if possible, otherwise generic signin
      if (instituteId) {
        window.location.href = `/${instituteId}/signin`;
      } else {
        window.location.href = "/signin";
      }
    } catch (error) {
      console.error("AuthService.logout Error:", error);
      // Fallback: clear what we can and redirect
      Cookies.remove("access_token");
      localStorage.removeItem("user");
      window.location.href = "/signin";
    }
  }

  getUser(): User | null {
    if (typeof window === "undefined") return null;
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }

  getToken(): string | undefined {
    return Cookies.get("access_token");
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  async getProfile(): Promise<User | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${this.apiUrl}/api/institutes/auth/validate`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.logout();
        }
        throw new Error("Failed to fetch user profile");
      }

      const data = await response.json();
      if (data.valid && data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        return data.user;
      }
      return null;
    } catch (error) {
      console.error("AuthService.getProfile Error:", error);
      return this.getUser(); // Fallback to localStorage
    }
  }

  validateInstitute(urlInstituteId: string): boolean {
    const user = this.getUser();
    if (!user) return false;

    if (user.instituteId !== urlInstituteId) {
      console.warn(`Institute mismatch: User is from ${user.instituteId} but tried to access ${urlInstituteId}`);
      // Redirect to their correct dashboard
      window.location.href = `/${user.instituteId}/dashboard`;
      return false;
    }
    return true;
  }
}

export const authService = new AuthService();
