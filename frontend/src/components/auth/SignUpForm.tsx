"use client";
import React, { useState } from "react";
import SignUpFormPage1 from "./SignUpFormPage1";
import { FormData } from "./types";
import { useAuth } from "@/context/AuthContext";

export default function SignUpForm() {
  const { signup } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    country: "",
    phone: "",
    password: "",
    companyName: "",
    employeeCount: "",
    referralSource: "",
    useCases: [],
  });

  const updateFormData = (newData: Partial<FormData>) => {
    setFormData((prevData) => ({
      ...prevData,
      ...newData,
    }));
  };

  const handleSubmit = async () => {
    try {
      setError('');
      setIsLoading(true);
      
      // Submit the signup data to our backend
      await signup({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        country: formData.country || '',
        phone: formData.phone || '',
        companyName: formData.companyName || '',
        employeeCount: formData.employeeCount,
        referralSource: formData.referralSource || '',
        useCases: formData.useCases,
      });
      
      // Redirect to dashboard after successful signup (handled by AuthContext)
    } catch (error: Error | unknown) {
      console.error("Signup error:", error);
      setError(error instanceof Error ? error.message : 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SignUpFormPage1
      onNext={handleSubmit}
      formData={formData}
      updateFormData={updateFormData}
      isLoading={isLoading}
      error={error}
    />
  );
}
