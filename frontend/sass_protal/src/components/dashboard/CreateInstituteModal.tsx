"use client";
import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";


interface CreateInstituteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateInstituteModal({
  isOpen,
  onClose,
}: CreateInstituteModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle creation logic here
    console.log("Creating institute:", { name, description, selectedModel });
    onClose();
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
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#0f172a]/50 border border-dash border-gray-700/50 text-gray-400">
                         <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                         </svg>
                    </div>
                    <div className="flex gap-3">
                         <button className="px-4 py-2 text-xs font-medium text-red-500 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors">
                            Remove
                         </button>
                         <button className="px-4 py-2 text-xs font-medium text-gray-300 bg-[#0f172a] border border-gray-700 rounded-lg hover:bg-[#1e293b] transition-colors">
                            Change Logo
                         </button>
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
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                        >
                            <option value="Select Category">Select Category</option>
                            <option value="education">Education</option>
                            <option value="technology">Technology</option>
                            <option value="business">Business</option>
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
                        <span className="block text-xs font-normal text-gray-500">Select location</span>
                    </label>
                    <div className="relative">
                        <select className="w-full appearance-none px-4 py-3 text-sm text-white bg-[#0f172a]/50 border border-gray-700/50 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all">
                            <option>Select Location...</option>
                            <option>New York</option>
                            <option>London</option>
                            <option>Paris</option>
                            <option>Tokyo</option>
                        </select>
                         <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                             </svg>
                        </div>
                    </div>
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
