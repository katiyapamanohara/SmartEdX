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
  const [studentCount, setStudentCount] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [country, setCountry] = useState("");
  const [primaryUseCases, setPrimaryUseCases] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      setIsSubmitting(true);
      await authService.createInstitute({
        name,
        description,
        defaultModel: selectedModel,
        category,
        location,
        logo,
        studentCount,
        referralSource,
        country,
        primaryUseCases: JSON.stringify(primaryUseCases),
      });
      console.log("Institute created successfully");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to create institute:", error);
      alert("Failed to create institute. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[700px] p-0 overflow-hidden" showCloseButton={false}>
      <div className="flex flex-col h-full bg-[#1e293b] text-white rounded-3xl">
        {/* Header with Close Button */}
        <div className="flex items-center justify-between px-8 py-6">
          <h2 className="text-xl font-bold text-white">Add New Branch</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
             <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
          </button>
        </div>

        <div className="px-8 pb-8 space-y-6">
            {/* Branch Name */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">
                    Branch Name
                    <span className="block text-xs font-normal text-gray-500">What is the name of this branch?</span>
                </label>
                <input 
                    type="text" 
                    placeholder="Branch Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 text-sm text-white placeholder-gray-500 bg-[#0f172a]/50 border border-gray-700/50 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">
                    Branch Logo
                    <span className="block text-xs font-normal text-gray-500">An optional logo for this branch.</span>
                </label>
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#0f172a]/50 border border-dash border-gray-700/50 text-gray-400 overflow-hidden">
                         {logo ? (
                           <img src={logo} className="w-full h-full object-cover" alt="Preview" />
                         ) : (
                           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                           </svg>
                         )}
                    </div>
                    <div className="flex gap-3">
                         <button onClick={() => setLogo(null)} className="px-4 py-2 text-xs font-medium text-red-500 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors">
                            Remove
                         </button>
                         <label className="px-4 py-2 text-xs font-medium text-gray-300 bg-[#0f172a] border border-gray-700 rounded-lg hover:bg-[#1e293b] transition-colors cursor-pointer">
                            Change Logo
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                         </label>
                    </div>
                </div>
                <p className="text-xs text-gray-500">Recommended size: 250x250px</p>
            </div>

            {/* AI Model & Languages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                     <label className="text-sm font-medium text-gray-400">
                        Category
                        <span className="block text-xs font-normal text-gray-500">Select category for your branch</span>
                    </label>
                     <div className="relative">
                        <select 
                            className="w-full appearance-none px-4 py-3 text-sm text-white bg-[#0f172a]/50 border border-gray-700/50 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
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
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                             </svg>
                        </div>
                    </div>
                </div>

                 <div className="space-y-2">
                     <label className="text-sm font-medium text-gray-400">
                        Location
                        <span className="block text-xs font-normal text-gray-500">City/Region</span>
                    </label>
                    <input
                        type="text"
                        placeholder="e.g. New York"
                        className="w-full px-4 py-3 text-sm text-white placeholder-gray-500 bg-[#0f172a]/50 border border-gray-700/50 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">
                        Country
                        <span className="block text-xs font-normal text-gray-500">Institute origin</span>
                    </label>
                    <div className="relative">
                        <select 
                            className="w-full appearance-none px-4 py-3 text-sm text-white bg-[#0f172a]/50 border border-gray-700/50 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
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
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expansion Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                 <div className="space-y-2">
                     <label className="text-sm font-medium text-gray-400">
                        Total Students
                        <span className="block text-xs font-normal text-gray-500">Student enrollment range</span>
                    </label>
                    <div className="relative">
                        <select 
                            className="w-full appearance-none px-4 py-3 text-sm text-white bg-[#0f172a]/50 border border-gray-700/50 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                            value={studentCount}
                            onChange={(e) => setStudentCount(e.target.value)}
                        >
                            <option value="">Select Range</option>
                            <option value="1-50">1-50 Students</option>
                            <option value="51-200">51-200 Students</option>
                            <option value="201-500">201-500 Students</option>
                            <option value="501-1000">501-1000 Students</option>
                            <option value="1000+">1000+ Students</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                             </svg>
                        </div>
                    </div>
                </div>

                 <div className="space-y-2">
                     <label className="text-sm font-medium text-gray-400">
                        Referral
                        <span className="block text-xs font-normal text-gray-500">How did you find us?</span>
                    </label>
                    <div className="relative">
                        <select 
                            className="w-full appearance-none px-4 py-3 text-sm text-white bg-[#0f172a]/50 border border-gray-700/50 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
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
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                             </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Primary Use Cases */}
            <div className="space-y-3">
                <label className="text-sm font-medium text-gray-400">
                    Primary Use Cases
                    <span className="block text-xs font-normal text-gray-500">Select all that apply</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {["Customer Support", "Tutoring", "Course Assistant", "Internal Knowledge", "Marketing", "Other"].map((useCase) => (
                      <div 
                        key={useCase}
                        onClick={() => {
                          setPrimaryUseCases(prev => 
                            prev.includes(useCase) 
                              ? prev.filter(i => i !== useCase) 
                              : [...prev, useCase]
                          );
                        }}
                        className={`px-3 py-2 text-center text-xs font-semibold rounded-lg border cursor-pointer transition-all ${
                          primaryUseCases.includes(useCase)
                            ? "border-blue-500 bg-blue-500/20 text-blue-400"
                            : "border-gray-700/50 text-gray-500 hover:border-gray-600"
                        }`}
                      >
                        {useCase}
                      </div>
                    ))}
                </div>
            </div>

            {/* Description */}
             <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">
                    Description
                    <span className="block text-xs font-normal text-gray-500">Description about your branch</span>
                </label>
                <textarea 
                    placeholder="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 text-sm text-white placeholder-gray-500 bg-[#0f172a]/50 border border-gray-700/50 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                />
            </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-8 py-6 gap-3 border-t border-gray-700/50">
            <button 
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-medium text-gray-300 bg-[#2d3748] rounded-lg hover:bg-[#374151] transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handleSubmit}
                className="px-6 py-2.5 text-sm font-medium text-white bg-[#465fff] rounded-lg hover:bg-[#3b4ecc] transition-colors shadow-lg shadow-blue-500/20"
            >
                Create Branch
            </button>
        </div>
      </div>
    </Modal>
  );
}
