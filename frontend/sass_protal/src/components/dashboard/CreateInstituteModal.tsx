"use client";
import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { authService } from "@/services/authService";

interface CreateInstituteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateInstituteModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateInstituteModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [studentCount, setStudentCount] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [country, setCountry] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [primaryUseCases, setPrimaryUseCases] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!name.trim()) newErrors.name = "Institute name is required";
    if (!category) newErrors.category = "Category is required";
    if (!country) newErrors.country = "Country is required";
    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!/^\d{10}$/.test(phoneNumber.replace(/\D/g, ""))) {
      newErrors.phoneNumber = "Phone number must be exactly 10 digits";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const newInstitute = await authService.createInstitute({
        name,
        description,
        defaultModel: selectedModel,
        category,
        location,
        studentCount,
        referralSource,
        country,
        phoneNumber,
        primaryUseCases: JSON.stringify(primaryUseCases),
      });

      if (logoFile && newInstitute.id) {
        try {
          await authService.uploadInstituteLogo(newInstitute.id, logoFile);
        } catch (logoError) {
          console.error("Failed to upload logo:", logoError);
        }
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Failed to create institute:", error);
      setSubmitError(error.message || "Failed to create institute. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogo(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const inputBase =
    "w-full px-4 py-3 text-sm rounded-lg border outline-none transition-all " +
    "bg-gray-50 dark:bg-gray-800/60 " +
    "text-gray-900 dark:text-white " +
    "placeholder-gray-400 dark:placeholder-gray-500 " +
    "focus:ring-2 focus:ring-blue-500/30";

  const inputBorder = (hasError: boolean) =>
    hasError
      ? "border-red-500 focus:border-red-500"
      : "border-gray-300 dark:border-gray-700 focus:border-blue-500";

  const labelBase = "text-sm font-medium text-gray-700 dark:text-gray-300";
  const subLabelBase = "block text-xs font-normal text-gray-500 dark:text-gray-500 mt-0.5";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
      className="mx-4 w-full max-w-175 h-[calc(100dvh-2rem)] sm:h-[85vh] sm:max-h-[85vh] flex flex-col"
    >
      <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800">

        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-gray-200 dark:border-gray-700/60 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add New Institute</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Fill in the details below to create your institute.</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6 custom-scrollbar">

          {/* Institute Name */}
          <div className="space-y-1.5">
            <label className={labelBase}>
              Institute Name
              <span className={subLabelBase}>What is the name of this institute?</span>
            </label>
            <input
              type="text"
              placeholder="Institute Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${inputBase} ${inputBorder(!!errors.name)}`}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Logo Upload */}
          <div className="space-y-1.5">
            <label className={labelBase}>
              Institute Logo
              <span className={subLabelBase}>An optional logo for this institute.</span>
            </label>
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 overflow-hidden shrink-0">
                {logo ? (
                  <img src={logo} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setLogo(null); setLogoFile(null); }}
                  className="px-3 py-1.5 text-xs font-medium text-red-500 bg-red-50 dark:bg-red-500/10 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                >
                  Remove
                </button>
                <label className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                  Change Logo
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Recommended: Square, at least 250×250px.</p>
          </div>

          {/* Category + Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className={labelBase}>
                Category
                <span className={subLabelBase}>Select a category for your institute</span>
              </label>
              <div className="relative">
                <select
                  className={`${inputBase} ${inputBorder(!!errors.category)} appearance-none pr-10`}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Select Category</option>
                  <option value="education">Education</option>
                  <option value="technology">Technology</option>
                  <option value="business">Business</option>
                  <option value="healthcare">Medical/Healthcare</option>
                  <option value="finance">Finance</option>
                  <option value="arts">Arts & Design</option>
                  <option value="sports">Sports</option>
                  <option value="skills">Skill Development</option>
                  <option value="other">Other</option>
                </select>
                <ChevronIcon />
              </div>
              {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
            </div>

            <div className="space-y-1.5">
              <label className={labelBase}>
                Location
                <span className={subLabelBase}>City / Region</span>
              </label>
              <input
                type="text"
                placeholder="e.g. New York"
                className={`${inputBase} ${inputBorder(false)}`}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Country */}
            <div className="space-y-1.5">
              <label className={labelBase}>
                Country
                <span className={subLabelBase}>Institute origin</span>
              </label>
              <div className="relative">
                <select
                  className={`${inputBase} ${inputBorder(!!errors.country)} appearance-none pr-10`}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <option value="">Select Country</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                  <option value="India">India</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                  <option value="Japan">Japan</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronIcon />
              </div>
              {errors.country && <p className="text-xs text-red-500">{errors.country}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className={labelBase}>
                Phone Number
                <span className={subLabelBase}>Contact number</span>
              </label>
              <input
                type="text"
                placeholder="e.g. +1234567890"
                className={`${inputBase} ${inputBorder(!!errors.phoneNumber)}`}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              {errors.phoneNumber && <p className="text-xs text-red-500">{errors.phoneNumber}</p>}
            </div>

            {/* Students */}
            <div className="space-y-1.5">
              <label className={labelBase}>
                Total Students
                <span className={subLabelBase}>Student enrollment range</span>
              </label>
              <div className="relative">
                <select
                  className={`${inputBase} ${inputBorder(false)} appearance-none pr-10`}
                  value={studentCount}
                  onChange={(e) => setStudentCount(e.target.value)}
                >
                  <option value="">Select Range</option>
                  <option value="1-50">1–50 Students</option>
                  <option value="51-200">51–200 Students</option>
                  <option value="201-500">201–500 Students</option>
                  <option value="501-1000">501–1000 Students</option>
                  <option value="1000+">1000+ Students</option>
                </select>
                <ChevronIcon />
              </div>
            </div>

            {/* Referral */}
            <div className="space-y-1.5">
              <label className={labelBase}>
                Referral
                <span className={subLabelBase}>How did you find us?</span>
              </label>
              <div className="relative">
                <select
                  className={`${inputBase} ${inputBorder(false)} appearance-none pr-10`}
                  value={referralSource}
                  onChange={(e) => setReferralSource(e.target.value)}
                >
                  <option value="">Select Referral Source</option>
                  <option value="Google Search">Google Search</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Recommendation">Recommendation</option>
                  <option value="Advertisement">Advertisement</option>
                  <option value="Blog Post">Blog Post</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronIcon />
              </div>
            </div>
          </div>

          {/* Primary Use Cases */}
          <div className="space-y-2">
            <label className={labelBase}>
              Primary Use Cases
              <span className={subLabelBase}>Select all that apply</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {["Customer Support", "Tutoring", "Course Assistant", "Internal Knowledge", "Marketing", "Other"].map((useCase) => (
                <button
                  key={useCase}
                  type="button"
                  onClick={() =>
                    setPrimaryUseCases((prev) =>
                      prev.includes(useCase) ? prev.filter((i) => i !== useCase) : [...prev, useCase]
                    )
                  }
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border-2 text-center transition-all ${
                    primaryUseCases.includes(useCase)
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  {useCase}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className={labelBase}>
              Description
              <span className={subLabelBase}>A brief description of your institute</span>
            </label>
            <textarea
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={`${inputBase} ${inputBorder(false)} resize-none`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 sm:px-8 py-5 border-t border-gray-200 dark:border-gray-700/60 space-y-3">
          {submitError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-red-600 dark:text-red-400">{submitError}</p>
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2 ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Institute"
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

const ChevronIcon = () => (
  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </div>
);
