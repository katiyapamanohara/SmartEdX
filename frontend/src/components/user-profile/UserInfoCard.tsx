"use client";
import React, { useEffect, useState, useRef } from "react";
import { useModal } from "../../hooks/useModal";
import { useProfile } from "../../hooks/useProfile";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import type { UserProfile, ProfileApiResponse } from "@/types/profile";
import Image from "next/image";

export default function UserInfoCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const { fetchProfile, updateProfile, isLoading, error, clearError } = useProfile();

  // Form refs for uncontrolled inputs
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [profileImage, setProfileImage] = useState<File | undefined>(undefined);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile().then((response: ProfileApiResponse | null) => {
      if (response && response.data) setProfile(response.data);
      setLoading(false);
      console.log("Fetched profile data:", response?.data);
    }).catch(() => {
      setLoading(false);
    });
  }, [fetchProfile]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }

      setProfileImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenModal = () => {
    setProfileImage(undefined);
    setProfileImagePreview(null);
    setValidationErrors(null);
    setSuccessMessage(null);
    clearError();
    openModal();
  };

  const validateForm = (formData: FormData): string | null => {
    const firstName = (formData.get('firstName') as string)?.trim();
    const lastName = (formData.get('lastName') as string)?.trim();
    const phoneNumber = (formData.get('phoneNumber') as string)?.trim();

    // Return the first validation error found (one at a time)
    if (!firstName) {
      return 'First name is required';
    }

    if (!lastName) {
      return 'Last name is required';
    }

    if (!phoneNumber) {
      return 'Phone number is required';
    }

    // Basic phone number validation (optional - adjust regex as needed)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (phoneNumber && !phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''))) {
      return 'Please enter a valid phone number';
    }

    return null; // No errors
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Clear previous validation errors and success message
    setValidationErrors(null);
    setSuccessMessage(null);

    // Get form data using FormData API
    const form = event.target as HTMLFormElement;
    const formDataAPI = new FormData(form);

    // Validate required fields
    const validationError = validateForm(formDataAPI);
    if (validationError) {
      setValidationErrors(validationError);
      return;
    }

    // Extract form values
    const firstName = (formDataAPI.get('firstName') as string).trim();
    const lastName = (formDataAPI.get('lastName') as string).trim();
    const phoneNumber = (formDataAPI.get('phoneNumber') as string).trim();

    // Only get the social links that actually exist in your form
    const x = (formDataAPI.get('x') as string)?.trim() || "";
    const linkedin = (formDataAPI.get('linkedin') as string)?.trim() || "";

    // Create socialLinks object with only non-empty values
    const socialLinks: Record<string, string> = {};
    if (x) socialLinks.x = x;
    if (linkedin) socialLinks.linkedin = linkedin;

    const formData: UserProfile = {
      auth: {
        firstName: firstName,
        lastName: lastName,
        profileImage: profileImage
      },
      authMeta: {
        phoneNumber: phoneNumber
      }
    };

    // Only include socialLinks if there are any non-empty values
    if (Object.keys(socialLinks).length > 0) {
      formData.authMeta = {
        ...formData.authMeta,
        socialLinks
      };
    }

    const success = await updateProfile(formData);
    console.log("updateProfile result:", success);

    if (success) {
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => {
        closeModal();
        // Refresh the page after saving
        window.location.reload();
      }, 3000);
    }
  };

  return (
    <>
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
        </div>
      )}

      {!loading && (
        <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
                Personal Information
              </h4>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Full Name
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {profile?.auth?.firstName && profile?.auth?.lastName
                      ? `${profile.auth.firstName} ${profile.auth.lastName}`
                      : "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Email Address
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {profile?.auth?.email || "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Registration Date
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {profile?.auth?.registrationDate ? new Date(profile.auth.registrationDate).toLocaleDateString() : "Not available"}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Provider
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {profile?.auth?.authProvider || (profile?.auth?.providerData && Array.isArray(profile.auth.providerData) && profile.auth.providerData.length > 0 && profile.auth.providerData[0] && typeof profile.auth.providerData[0] === 'object' && 'providerId' in profile.auth.providerData[0]
                      ? (profile.auth.providerData[0] as { providerId: string }).providerId
                      : "Not available")}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Account Status
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {profile?.auth?.activeSubscriptionID ? "Paid" : "Free"}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleOpenModal}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
            >
              <svg
                className="fill-current"
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                  fill=""
                />
              </svg>
              Edit
            </button>
          </div>

          <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
            <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
              <div className="px-2 pr-14">
                <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                  Edit Personal Information
                </h4>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                  Update your details to keep your profile up-to-date.
                </p>
              </div>
              <form className="flex flex-col" onSubmit={handleSave}>
                <div className="custom-scrollbar h-[400px] overflow-y-auto px-2 pb-3">
                  {/* Profile Image Section */}
                  <div className="mb-7">
                    <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                      Profile Picture
                    </h5>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800">
                        <Image
                          src={
                            profileImagePreview
                              ? profileImagePreview
                              : profile?.auth?.profileImage && typeof profile.auth.profileImage === "string" && (profile.auth.profileImage as string).trim()
                                ? profile.auth.profileImage as string
                                : "/images/user/default_user.jpg"
                          }
                          alt={
                            profile?.auth?.firstName && profile?.auth?.lastName
                              ? `${profile.auth.firstName} ${profile.auth.lastName}`
                              : "User"
                          }
                          width={64}
                          height={64}
                          className="w-full h-full object-cover rounded-full border border-gray-200 dark:border-gray-800"
                        />
                      </div>
                      <div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageChange}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          className="border border-gray-300 bg-white text-gray-700 px-2 rounded text-sm py-1 hover:bg-gray-50"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Change Photo
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          JPG, PNG or GIF. Max size 5MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Personal Information Section */}
                  <div className="mb-7">
                    <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                      Personal Information
                    </h5>

                    <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                      <div className="col-span-2 lg:col-span-1">
                        <Label>First Name</Label>
                        <Input
                          type="text"
                          name="firstName"
                          defaultValue={profile?.auth?.firstName || ""}
                          placeholder="Enter your first name"
                        />
                      </div>

                      <div className="col-span-2 lg:col-span-1">
                        <Label>Last Name</Label>
                        <Input
                          type="text"
                          name="lastName"
                          defaultValue={profile?.auth?.lastName || ""}
                          placeholder="Enter your last name"
                        />
                      </div>

                      <div className="col-span-2 lg:col-span-1">
                        <Label>Phone Number</Label>
                        <Input
                          type="tel"
                          name="phoneNumber"
                          defaultValue={profile?.authMeta?.phoneNumber || ""}
                          placeholder="Enter your phone number"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Social Links Section */}
                  <div>
                    <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                      Social Links
                    </h5>

                    <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                      <div>
                        <Label>X.com (Twitter)</Label>
                        <Input
                          type="url"
                          name="x"
                          defaultValue={profile?.authMeta?.socialLinks?.x || ""}
                          placeholder="https://x.com/username"
                        />
                      </div>

                      <div>
                        <Label>LinkedIn</Label>
                        <Input
                          type="url"
                          name="linkedin"
                          defaultValue={profile?.authMeta?.socialLinks?.linkedin || ""}
                          placeholder="https://linkedin.com/in/username"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Success Message */}
                {successMessage && (
                  <div className="px-2 mb-2">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                      <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
                    </div>
                  </div>
                )}

                {/* Validation Error Message */}
                {validationErrors && (
                  <div className="px-2 mb-2">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-sm text-red-600 dark:text-red-400">{validationErrors}</p>
                    </div>
                  </div>
                )}

                {/* API Error Message */}
                {error && (
                  <div className="px-2 mb-2">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={closeModal}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`inline-flex items-center justify-center font-medium gap-2 rounded-lg transition px-4 py-3 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 ${isLoading ? "cursor-not-allowed opacity-50" : ""
                      }`}
                  >
                    {isLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </Modal>
        </div>
      )}
    </>
  );
}