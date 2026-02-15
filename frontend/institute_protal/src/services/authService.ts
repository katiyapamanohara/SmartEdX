import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/utils/firebase";
import { jwtDecode } from "jwt-decode";

export interface Role {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Institute {
  id: string;
  name: string;
  description: string;
  category: string;
  country: string;
  location: string;
  logo: string;
  phoneNumber: string;
  studentCount: string;
  primaryUseCases: string;
  referralSource: string;
  defaultModel: string;
  ownerId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string; // Role name as string (e.g., "student", "instructor", "teacher")
  profilePicture: string;
  isNew: boolean;
  type: string; // e.g., "institute_user"
  instituteId: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

// JWT Payload interface
export interface JWTPayload {
  sub: string; // User ID
  email: string;
  role: string;
  instituteId: string;
  type: string;
  iat: number;
  exp: number;
}

class AuthService {
  private readonly apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // Helper method to set a cookie
  private setCookie(name: string, value: string, maxAge: number = 86400) {
    document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }

  // Helper method to get a cookie
  private getCookie(name: string): string | null {
    if (typeof window === "undefined") return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  // Helper method to delete a cookie
  private deleteCookie(name: string) {
    document.cookie = `${name}=; path=/; max-age=0`;
  }

  // Helper method to decode JWT token
  private decodeToken(token: string): JWTPayload | null {
    try {
      return jwtDecode<JWTPayload>(token);
    } catch (error) {
      console.error("Failed to decode JWT token:", error);
      return null;
    }
  }

  // Get role from JWT token
  getRole(): string | null {
    if (typeof window === "undefined") return null;
    
    const token = this.getToken();
    if (!token) return null;

    const decoded = this.decodeToken(token);
    return decoded?.role || null;
  }

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
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to authenticate with backend");
      }

      const data: AuthResponse = await response.json();
      this.setCookie("access_token", data.access_token);

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

     
      await auth.signOut();

      // Clear cookies
      this.deleteCookie("access_token");
      this.deleteCookie("user");
      this.deleteCookie("user_role");

      // Redirect to institute-specific signin if possible, otherwise generic signin
      if (instituteId) {
        window.location.href = `/${instituteId}/signin`;
      } else {
        window.location.href = "/signin";
      }
    } catch (error) {
      console.error("AuthService.logout Error:", error);
      // Fallback: clear what we can and redirect
      this.deleteCookie("access_token");
      this.deleteCookie("user");
      this.deleteCookie("user_role");
      window.location.href = "/signin";
    }
  }

  getUser(): User | null {
    if (typeof window === "undefined") return null;
    const userStr = this.getCookie("user");
    return userStr ? JSON.parse(userStr) : null;
  }

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return this.getCookie("access_token");
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
        return data.user;
      }
      return null;
    } catch (error) {
      console.error("AuthService.getProfile Error:", error);
      return this.getUser(); // Fallback to cookies
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
