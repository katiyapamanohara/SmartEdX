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

  const handleDeleteInstitute = async (id: string) => {
    try {
      await authService.deleteInstitute(id);
      // Optimistic update or refetch
      setInstitutes(institutes.filter(inst => inst.id !== id));
    } catch (error) {
      console.error("Failed to delete institute:", error);
      alert("Failed to delete institute");
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await authService.updateInstitute(id, { isActive: !currentStatus });
      setInstitutes(institutes.map(inst => 
        inst.id === id ? { ...inst, isActive: !currentStatus } : inst
      ));
    } catch (error) {
      console.error("Failed to toggle status:", error);
      alert("Failed to toggle status");
    }
  };

  useEffect(() => {
    fetchInstitutes();
  }, []);

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
     
      {/* Create New  Institutees Section */}
      <div>
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
           Create Institutes
          </h2>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Manage your institute's locations and  Institutees
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        
          <CreateOptionCard
            title="Add New Institute"
            description="Start fresh and build a fully customized  Institute tailored to your unique needs."
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
            description="Quickly launch a new  Institute by replicating an existing one."
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
            description="Let AI help you setup an intelligent  Institute configuration."
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
                  <InstituteCard 
                    key={institute.id} 
                    institute={institute} 
                    onDelete={() => handleDeleteInstitute(institute.id)} 
                    onToggleStatus={() => handleToggleStatus(institute.id, institute.isActive ?? true)}
                  />
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
    isActive?: boolean;
}

const MOCK_INSTITUTES: Institute[] = [
    {
        id: "1",
        name: "testing-institute",
        description: "setting",
    },
];

const InstituteCard: React.FC<{ 
    institute: Institute; 
    onDelete: () => Promise<void>;
    onToggleStatus: () => Promise<void>;
}> = ({ institute, onDelete, onToggleStatus }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isToggling, setIsToggling] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleDeleteClick = async () => {
        if (confirm("Are you sure you want to delete this institute? This action cannot be undone.")) {
            setIsDeleting(true);
            try {
                await onDelete();
            } catch (error) {
                setIsDeleting(false); 
            }
        }
    };

    const handleToggleClick = async () => {
        setIsToggling(true);
        try {
            await onToggleStatus();
        } catch (error) {
            console.error("Failed to toggle status", error);
        } finally {
            setIsToggling(false);
            setIsMenuOpen(false);
        }
    };

    return (
        <div className="overflow-hidden border border-gray-200 rounded-2xl bg-white dark:bg-white/[0.03] dark:border-gray-800 transition-all hover:shadow-md group relative">
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
                    
                    <div className="relative" ref={menuRef}>
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                             </svg>
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 z-10 overflow-hidden">
                                <button
                                    onClick={handleToggleClick}
                                    disabled={isToggling}
                                    className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                                >
                                    {isToggling ? (
                                        <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        (institute.isActive ?? true) ? (
                                             <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                             </svg>
                                        ) : (
                                            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )
                                    )}
                                    {(institute.isActive ?? true) ? "Deactivate" : "Activate"}
                                </button>
                                <button
                                    onClick={handleDeleteClick}
                                    disabled={isDeleting}
                                    className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center gap-2 border-t border-gray-100 dark:border-gray-800"
                                >
                                     {isDeleting ? (
                                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                         </svg>
                                    )}
                                    Delete Institute
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                        {institute.name}
                    </h3>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        (institute.isActive ?? true) 
                            ? "bg-green-500/10 text-green-500" 
                            : "bg-red-500/10 text-red-500"
                    }`}>
                        {(institute.isActive ?? true) ? "ACTIVE" : "INACTIVE"}
                    </span>
                </div>
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
