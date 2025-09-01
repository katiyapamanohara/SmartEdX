"use client";
import React, { useEffect, useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { useProfile } from "@/hooks/useProfile";
import type { UserProfile, UpdateProfileData, ProfileApiResponse } from "@/types/profile";

// Sample use cases for the dropdown
const useCases = [
  'Marketing',
  'Research',
  'Sales',
  'Customer Support',
  'Analytics',
  'Engineering',
  'Product Management',
  'Other'
];

const employeeOptions = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-1000", label: "201-1000 employees" },
  { value: "1000+", label: "1000+ employees" }
];

export default function CompanyProfileCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>(["SaaS Platform Development"]);
  const { fetchProfile, updateProfile, isLoading, error, clearError } = useProfile();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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

  const handleOpenModal = () => {
    setSelectedUseCases(profile?.authMeta?.primaryUseCase || []);
    setSuccessMessage(null);
    clearError();
    openModal();
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSuccessMessage(null);

    // Get form data using FormData API
    const form = event.target as HTMLFormElement;
    const formDataAPI = new FormData(form);

    // Extract values
    const companyName = (formDataAPI.get('companyName') as string)?.trim();
    const numberOfEmployees = (formDataAPI.get('numberOfEmployees') as string)?.trim();

    // Collect checked use cases
    const primaryUseCase: string[] = [];
    for (const useCase of useCases) {
      // If you use checkboxes, check if checked
      if (formDataAPI.get(`useCase-${useCase}`) === "on") {
        primaryUseCase.push(useCase);
      }
    }

    const formData: UpdateProfileData = { auth: {}, authMeta: {} };
    if (companyName) formData.authMeta!.companyName = companyName;
    if (numberOfEmployees) formData.authMeta!.numberOfEmployees = numberOfEmployees;
    if (primaryUseCase.length > 0) formData.authMeta!.primaryUseCase = primaryUseCase;

    const success = await updateProfile(formData);

    if (success) {
      setSuccessMessage("Company profile updated successfully!");
      setTimeout(() => {
        setSuccessMessage(null);
        closeModal();
        window.location.reload();
      }, 3000);
    }
  };

  const handleUseCaseToggle = (useCase: string) => {
    setSelectedUseCases(prev =>
      prev.includes(useCase)
        ? prev.filter(uc => uc !== useCase)
        : [...prev, useCase]
    );
  };

  return (
    <>
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      )}

      {!loading && (
        <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
                Company Information
              </h4>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Company Name
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {profile?.authMeta?.companyName || "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Number of Employees
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {profile?.authMeta?.numberOfEmployees || "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    Primary Use Cases
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {Array.isArray(profile?.authMeta?.primaryUseCase)
                      ? profile.authMeta.primaryUseCase.join(", ")
                      : "Not provided"}
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
                  d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32362 15.7541 3.44494L15.0911 2.78206ZM13.144 4.12077L14.3399 5.31669L7.44355 12.2131L5.51303 12.5684L5.8684 10.6379L12.7647 3.74146L13.144 4.12077ZM14.717 3.14397C14.9783 3.40528 14.9783 3.8313 14.717 4.09261L14.3377 3.7133C14.5989 3.45199 15.025 3.45199 15.2863 3.7133L14.717 3.14397Z"
                  fill=""
                />
              </svg>
              Edit
            </button>
          </div>
        </div>
      )}

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Company Information
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Update your company details to keep your profile up-to-date.
            </p>
          </div>
          <form className="flex flex-col" onSubmit={handleSave}>
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
              <div>
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Company Information
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2">
                    <Label>Company Name</Label>
                    <Input
                      type="text"
                      name="companyName"
                      defaultValue={profile?.authMeta?.companyName || ""}
                      placeholder="Enter company name"
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Number of Employees</Label>
                    <Input
                      as="select"
                      name="numberOfEmployees"
                      defaultValue={profile?.authMeta?.numberOfEmployees || ""}
                    >
                      <option value="" disabled>
                        Number of employees
                      </option>
                      {employeeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Input>
                  </div>

                  <div className="col-span-2">
                    <Label>Primary Use Cases</Label>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      {useCases.map((useCase) => (
                        <div key={useCase} className="flex items-center">
                          <input
                            id={`useCase-${useCase}`}
                            name={`useCase-${useCase}`}
                            type="checkbox"
                            checked={selectedUseCases.includes(useCase)}
                            onChange={() => handleUseCaseToggle(useCase)}
                            className="peer sr-only"
                          />
                          <span
                            onClick={() => handleUseCaseToggle(useCase)}
                            className={`h-5 w-5 flex items-center justify-center rounded border border-gray-300 mr-2 cursor-pointer
            ${selectedUseCases.includes(useCase)
                                ? "bg-indigo-500 border-indigo-500"
                                : "bg-white"}
            transition`}
                          >
                            {selectedUseCases.includes(useCase) && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={3}
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                          <label
                            htmlFor={`useCase-${useCase}`}
                            className="text-sm text-gray-700 dark:text-gray-200 cursor-pointer"
                          >
                            {useCase}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {successMessage && (
              <div className="px-2 mb-2">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
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
              <Button size="sm" variant="outline" onClick={closeModal}>
                Close
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
    </>
  );
}
