import { Metadata } from "next";
import React from "react";
import InstructorEditProfileForm from "@/components/user-profile/InstructorEditProfileForm";

export const metadata: Metadata = {
  title: "Edit Profile | SmartEdX Instructor Portal",
  description: "Edit your personal information and social links.",
};

export default function InstructorEditProfile() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
      <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
        Edit Instructor Profile
      </h3>
      <div className="max-w-4xl">
        <InstructorEditProfileForm />
      </div>
    </div>
  );
}
