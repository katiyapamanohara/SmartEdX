"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import CreateInstituteModal from "@/components/dashboard/CreateInstituteModal";
import { authService } from "@/services/authService";

export default function InstitutePage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInstitutes = async () => {
    try {
      setIsLoading(true);
      const data = await authService.getInstitutes();
      setInstitutes(data);
    } catch (error) {
      console.error("Error fetching institutes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutes();
  }, []);

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
     
      {/* Create New Branches Section */}
      <div>
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
           Create Institutes
          </h2>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Manage your institute's locations and branches
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        
          <CreateOptionCard
            title="Add New Institute"
            description="Start fresh and build a fully customized branch tailored to your unique needs."
            onClick={() => setIsCreateModalOpen(true)}
            icon={
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-500/10 text-blue-500">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            }
          />


          <CreateOptionCard
            title="Duplicate Institute"
            description="Quickly launch a new branch by replicating an existing one."
            icon={
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-purple-500/10 text-purple-500">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
              </div>
            }
          />

        
          <CreateOptionCard
            title="Auto-configure Institute"
            description="Let AI help you setup an intelligent branch configuration."
            icon={
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-500/10 text-indigo-500">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            }
          />
        </div>
      </div>

  
      <div className="pt-8">
        <h2 className="mb-6 text-xl font-bold text-center text-gray-800 dark:text-white">
          Your Institutes
        </h2>
        
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {institutes.length > 0 ? (
                institutes.map((institute) => (
                  <InstituteCard key={institute.id} institute={institute} />
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                  No Institutes found. Create one to get started.
                </div>
              )}
          </div>
        )}
      </div>

      <CreateInstituteModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={fetchInstitutes}
      />
    </div>
  );
}

// Helper Components & Data

interface CreateOptionCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick?: () => void;
}

const CreateOptionCard: React.FC<CreateOptionCardProps> = ({ title, description, icon, onClick }) => {
    return (
        <div 
            onClick={onClick}
            className="group relative flex flex-col p-6 transition-all border border-gray-200 rounded-2xl bg-white dark:bg-white/[0.03] dark:border-gray-800 hover:shadow-lg hover:border-blue-500/50 dark:hover:border-blue-500/50 cursor-pointer"
        >
            <div className="mb-4">
                {icon}
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
                {description}
            </p>
        </div>
    );
};


interface Institute {
    id: string;
    name: string;
    description: string;
    logo?: string;
}

const MOCK_INSTITUTES: Institute[] = [
    {
        id: "1",
        name: "testing-institute",
        description: "setting",
    },
];

const InstituteCard: React.FC<{ institute: Institute }> = ({ institute }) => {
    return (
        <div className="overflow-hidden border border-gray-200 rounded-2xl bg-white dark:bg-white/[0.03] dark:border-gray-800 transition-all hover:shadow-md">
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white overflow-hidden">
                        {institute.logo && typeof institute.logo === 'string' ? (
                            <img src={institute.logo} className="w-full h-full object-cover" alt={institute.name} />
                        ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        )}
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                         </svg>
                    </button>
                </div>
                <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white">
                    {institute.name}
                </h3>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {institute.description}
                </p>
                
                <Link href={`/dashboard/institute/${institute.id}`} className="inline-block px-4 py-2 text-sm font-medium text-blue-600 bg-transparent border border-gray-200 rounded-lg dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/[0.05] dark:text-blue-400 transition-colors">
                    Customize
                </Link>
            </div>
        </div>
    );
};
