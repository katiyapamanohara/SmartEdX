import { useCallback, useState } from 'react';
import { profileService } from '@/services/profileService';
import type { UserProfile, UpdateProfileData, ProfileApiResponse } from '@/types/profile';

export function useProfile() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = async (profileData: UserProfile): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Transform the profile data to match API expectations
      const updateData: UpdateProfileData = {
        auth: {
          firstName: profileData.auth?.firstName?.trim() || '',
          lastName: profileData.auth?.lastName?.trim() || '',
          profileImage: profileData.auth?.profileImage,
        },
        authMeta: {
          phoneNumber: profileData.authMeta?.phoneNumber?.trim() || '',
          ...(profileData.authMeta?.companyName && { companyName: profileData.authMeta.companyName.trim() }),
          ...(profileData.authMeta?.country && { country: profileData.authMeta.country.trim() }),
          ...(profileData.authMeta?.numberOfEmployees && { numberOfEmployees: profileData.authMeta.numberOfEmployees.trim() }),
          ...(profileData.authMeta?.primaryUseCase && profileData.authMeta.primaryUseCase.length > 0
            ? { primaryUseCase: profileData.authMeta.primaryUseCase }
            : {}),
          ...(profileData.authMeta?.socialLinks && Object.keys(profileData.authMeta.socialLinks).length > 0
            ? { socialLinks: profileData.authMeta.socialLinks }
            : {}),
        }
      };

      const response: ProfileApiResponse = await profileService.updateProfile(updateData);
      if ('auth' in response && 'authMeta' in response) {
        return true;
      } else {
        setError(response.message || 'Failed to update profile');
        return false;
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Profile update error:', errorMessage);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await profileService.getUserProfile();

      if (response) {
        return response;
      } else {
        setError('Failed to fetch profile');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = () => {
    setError(null);
  };

  return {
    updateProfile,
    fetchProfile,
    isLoading,
    error,
    clearError
  };
}