export interface UserProfile {
  auth: {
    firstName?: string;
    lastName?: string;
    email?: string;
    registrationDate?: string;
    authProvider?: string;
    providerData?: {
      providerId?: string;
      displayName?: string;
      email?: string;
      phoneNumber?: string;
      photoURL?: string;
    };
    activeSubscriptionID?: string;
    profileImage?: File;
  };
  authMeta?: {
    phoneNumber?: string;
    companyName?: string;
    country?: string;
    numberOfEmployees?: string;
    primaryUseCase?: string[];
    socialLinks?: {
      x?: string;
      linkedin?: string;
    };
  };
}

export interface UpdateProfileData {
  auth: {
    firstName?: string;
    lastName?: string;
    email?: string;
    profileImage?: File;
  };
  authMeta?: {
    phoneNumber?: string;
    companyName?: string;
    country?: string;
    numberOfEmployees?: string;
    primaryUseCase?: string[];
    socialLinks?: {
      x?: string;
      linkedin?: string;
    };
  };
}

export interface ProfileApiResponse {
  success: boolean;
  message: string;
  data?: UserProfile;
}