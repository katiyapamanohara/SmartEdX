import { TokenManager } from '@/utils/tokenManager';
import type { UserProfile, UpdateProfileData, ProfileApiResponse } from '@/types/profile';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

class ProfileService {
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {};

    try {
      const token = TokenManager.getAccessToken();
      if (token && !TokenManager.isTokenExpired(token)) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      console.warn('Auth token not available or expired, proceeding without authentication');
    }

    return headers;
  }

  async updateProfile(profileData: UpdateProfileData): Promise<ProfileApiResponse> {
    try {
      console.log('updateProfile called with:', profileData);

      const token = TokenManager.getAccessToken();
      if (!token || TokenManager.isTokenExpired(token)) {
        throw new Error('Authentication required. Please log in to update profile.');
      }

      const formData = new FormData();

      // Auth fields
      if (profileData.auth?.firstName) formData.append('firstName', profileData.auth.firstName);
      if (profileData.auth?.lastName) formData.append('lastName', profileData.auth.lastName);

      // AuthMeta fields
      if (profileData.authMeta?.phoneNumber) formData.append('phoneNumber', profileData.authMeta.phoneNumber);
      if (profileData.authMeta?.country) formData.append('country', profileData.authMeta.country);
      if (profileData.authMeta?.companyName) formData.append('companyName', profileData.authMeta.companyName);
      if (profileData.authMeta?.numberOfEmployees) formData.append('numberOfEmployees', profileData.authMeta.numberOfEmployees);

      if (profileData.authMeta?.primaryUseCase && profileData.authMeta.primaryUseCase.length > 0) {
        formData.append('primaryUseCase', JSON.stringify(profileData.authMeta?.primaryUseCase));
      }

      if (profileData.authMeta?.socialLinks) {
        formData.append("socialLinks", JSON.stringify(profileData.authMeta.socialLinks));
      }

      // Profile image
      if (profileData.auth?.profileImage) {
        formData.append('profileImage', profileData.auth.profileImage);
      }

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PATCH',
        headers: headers,
        body: formData
      });

      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseText);

      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.status} ${response.statusText}. Response: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      return data;
    } catch (error) {
      console.error('Error updating profile:', error);

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to the server. Please check your internet connection.');
      }

      if (!API_BASE_URL) {
        throw new Error('API configuration error: API_BASE_URL is not configured.');
      }

      throw error;
    }
  }


  async getUserProfile(): Promise<ProfileApiResponse> {
    try {
      const token = TokenManager.getAccessToken();
      if (!token || TokenManager.isTokenExpired(token)) {
        throw new Error('Authentication required. Please log in to view profile.');
      }

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.status} ${response.statusText}. Response: ${responseText}`);
      }

      let data: ProfileApiResponse | UserProfile;
      try {
        data = JSON.parse(responseText);

        // Patch: If the response is the profile object itself, wrap it in { data }
        if (!('data' in data) && 'auth' in data && 'authMeta' in data) {
          data = {
            success: true,
            message: "Fetched profile",
            data: data as UserProfile
          };
        }
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error('Invalid response format from server');
      }
      return data as ProfileApiResponse;
    } catch (error) {
      console.error('Error fetching profile:', error);

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to the server. Please check your internet connection.');
      }

      if (!API_BASE_URL) {
        throw new Error('API configuration error: API_BASE_URL is not configured.');
      }

      throw error;
    }
  }
}

export const profileService = new ProfileService();
