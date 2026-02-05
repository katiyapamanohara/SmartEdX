"use client";
import React, { useState, useEffect, Suspense } from "react";
import Alert from "@/components/ui/alert/Alert";
import { useParams, useSearchParams, useRouter, usePathname } from "next/navigation";
import { authService } from "@/services/authService";

function InstituteCustomizeContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const instituteId = params?.id as string;
  const activeTab = searchParams.get("tab") || "settings";

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4");
  const [logo, setLogo] = useState<string | null>(null);
  const [studentCount, setStudentCount] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [country, setCountry] = useState("");
  const [primaryUseCases, setPrimaryUseCases] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Assign User State
  const [assignEmail, setAssignEmail] = useState("");
  const [assignRole, setAssignRole] = useState("instructor");
  const [rolesList, setRolesList] = useState<any[]>([
    { id: 'default-1', name: 'instructor' },
    { id: 'default-2', name: 'student' },
    { id: 'default-3', name: 'assistant' },
    { id: 'default-4', name: 'coordinator' }
  ]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [togglingIds, setTogglingIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchInstituteDetails = async () => {
      if (!instituteId) return;
      
      try {
        setIsLoading(true);
        const data = await authService.getInstitute(instituteId);
        setName(data.name || "");
        setDescription(data.description || "");
        setCategory(data.category || "education");
        setLocation(data.location || "");
        setSelectedModel(data.defaultModel || "gpt-4");
        setLogo(data.logo || null);
        setStudentCount(data.studentCount || "");
        setReferralSource(data.referralSource || "");
        setCountry(data.country || "");
        try {
          const useCases = data.primaryUseCases ? JSON.parse(data.primaryUseCases) : [];
          setPrimaryUseCases(Array.isArray(useCases) ? useCases : []);
        } catch (e) {
          setPrimaryUseCases([]);
        }
      } catch (error) {
        console.error("Error fetching institute details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstituteDetails();
  }, [instituteId]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const roles = await authService.getRoles();
        setRolesList(roles.filter((r: any) => r.name !== 'admin'));
        if (roles.length > 0) {
          const instructorRole = roles.find((r: any) => r.name === 'instructor');
          setAssignRole(instructorRole?.name || roles[0].name);
        }
      } catch (error) {
        console.error("Error fetching roles:", error);
      }
    };

    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    if (!instituteId) return;
    try {
      setIsUsersLoading(true);
      const users = await authService.getInstituteUsers(instituteId);
      setAssignedUsers(Array.isArray(users) ? users : []);
    } catch (error) {
      console.error("Error fetching institute users:", error);
    } finally {
      setIsUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "assign-users") {
      fetchUsers();
    }
  }, [activeTab, instituteId]);

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
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

  const handleSave = async () => {
    try {
      setIsLoading(true);
      await authService.updateInstitute(instituteId, {
        name,
        description,
        category,
        location,
        defaultModel: selectedModel,
        logo,
        studentCount,
        referralSource,
        country,
        primaryUseCases: JSON.stringify(primaryUseCases),
      });
      alert("Changes saved successfully!");
    } catch (error) {
      console.error("Failed to update institute:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignUser = async () => {
    if (!assignEmail || !assignRole) {
      alert("Please enter email and select a role");
      return;
    }

    try {
      setIsAssigning(true);
      await authService.assignUserToInstitute(instituteId, {
        email: assignEmail,
        roleName: assignRole,
      });
      alert("User assigned successfully!");
      setAssignEmail("");
      fetchUsers(); // Refresh list after assignment
    } catch (error: any) {
      console.error("Failed to assign user:", error);
      alert(error.message || "Failed to assign user. Please try again.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this user from the institute?")) return;
    try {
      setDeletingIds(prev => [...prev, userId]);
      await authService.deleteInstituteUser(instituteId, userId);
      setAssignedUsers(assignedUsers.filter((u) => u.id !== userId));
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("Failed to remove user");
    } finally {
      setDeletingIds(prev => prev.filter(id => id !== userId));
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      setTogglingIds(prev => [...prev, userId]);
      await authService.toggleInstituteUserStatus(instituteId, userId);
      setAssignedUsers(
        assignedUsers.map((u) =>
          u.id === userId ? { ...u, isActive: !u.isActive } : u
        )
      );
    } catch (error) {
      console.error("Failed to toggle status:", error);
      alert("Failed to update status");
    } finally {
      setTogglingIds(prev => prev.filter(id => id !== userId));
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading institute data...</p>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "settings":
        return (
          <FormSection title="General Information" description="Basic details about your institute.">
            <div className="space-y-8">
              {/* Photo Upload Section */}
              <div className="flex items-center gap-6 pb-8 border-b border-gray-100 dark:border-gray-800">
                <div className="w-24 h-24 rounded-2xl bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 overflow-hidden flex items-center justify-center relative group">
                  {logo ? (
                    <img src={logo} className="w-full h-full object-cover" alt="Logo preview" />
                  ) : (
                    <UploadIcon />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">PREVIEW</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-white">Institute Photo</h4>
                  <div className="flex gap-3">
                    <button onClick={() => setLogo(null)} className="px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors">Remove</button>
                    <label className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                      Change Photo
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  </div>
                  <p className="text-[10px] text-gray-500">Recommended: Square, at least 500x500px.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Institute Name" value={name} onChange={setName} />
                <Input label="Location" value={location} onChange={setLocation} />
                <div className="md:col-span-2">
                  <Select label="Category" value={category} onChange={setCategory}>
                    <option value="education">Education</option>
                    <option value="technology">Technology</option>
                    <option value="business">Business</option>
                    <option value="healthcare">Medical/Healthcare</option>
                    <option value="finance">Finance</option>
                    <option value="arts">Arts & Design</option>
                    <option value="sports">Sports</option>
                    <option value="skills">Skill Development</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Textarea label="Description" value={description} onChange={setDescription} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <Select label="Total Students" value={studentCount} onChange={setStudentCount}>
                    <option value="">Select range</option>
                    <option value="1-50">1-50 Students</option>
                    <option value="51-200">51-200 Students</option>
                    <option value="201-500">201-500 Students</option>
                    <option value="501-1000">501-1000 Students</option>
                    <option value="1000+">1000+ Students</option>
                  </Select>
                  
                  <Select label="How did you find us?" value={referralSource} onChange={setReferralSource}>
                    <option value="">Select Source</option>
                    <option value="Google Search">Google Search</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Recommendation">Recommendation</option>
                    <option value="Advertisement">Advertisement</option>
                    <option value="Blog Post">Blog Post</option>
                    <option value="Other">Other</option>
                  </Select>
                  
                  <Select label="Country" value={country} onChange={setCountry}>
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
                  </Select>
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Primary Use Cases</label>
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
                        className={`px-4 py-2 text-xs font-semibold rounded-lg border-2 cursor-pointer transition-all ${
                          primaryUseCases.includes(useCase)
                            ? "border-blue-600 bg-blue-50/50 text-blue-600 dark:bg-blue-600/10"
                            : "border-gray-100 dark:border-gray-800 text-gray-500 hover:border-gray-200"
                        }`}
                      >
                        {useCase}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FormSection>
        );
      case "ai-config":
        return (
          <FormSection title="AI Configuration" description="Control how AI agents behave.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ModelOption 
                name="GPT-4 Turbo" 
                desc="Most capable" 
                active={selectedModel === "gpt-4"} 
                onClick={() => setSelectedModel("gpt-4")} 
              />
              <ModelOption 
                name="GPT-3.5 Turbo" 
                desc="Fast and cost-effective" 
                active={selectedModel === "gpt-3.5"} 
                onClick={() => setSelectedModel("gpt-3.5")} 
              />
            </div>
          </FormSection>
        );
      case "assign-users":
        return (
          <FormSection 
            title="Assign Institute Users" 
            description="Assign users to this institute and define their roles."
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input 
                  label="User Email Address" 
                  value={assignEmail} 
                  onChange={setAssignEmail} 
                />
                <Select 
                  label="Assign Role" 
                  value={assignRole} 
                  onChange={setAssignRole}
                >
                  {rolesList.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex justify-start">
                <button
                  onClick={handleAssignUser}
                  disabled={isAssigning}
                  className={`px-8 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2 ${isAssigning ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isAssigning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Assigning...
                    </>
                  ) : (
                    "Assign User"
                  )}
                </button>
              </div>

              <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20">
                <h4 className="text-sm font-bold text-blue-800 dark:text-blue-400 mb-2">Instructions</h4>
                <p className="text-xs text-blue-600 dark:text-blue-500 leading-relaxed">
                  Enter the email address of the user you want to assign. The user must already have a SmartEdX account. 
                  Once assigned, the user will have access to this institute with the specified role.
                </p>
              </div>

              {/* Users List Section */}
              <div className="mt-12 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider">Assigned Users</h4>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                    {assignedUsers.length} TOTAL
                  </span>
                </div>

                {isUsersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : assignedUsers.length > 0 ? (
                  <div className="overflow-hidden border border-gray-100 dark:border-gray-800 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 dark:bg-gray-800/50">
                        <tr>
                          <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">User</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">Role</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignedUsers.map((user) => (
                          <tr key={user.id} className="border-t border-gray-100 dark:border-gray-800">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold">
                                  {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-gray-800 dark:text-white">{user.firstName} {user.lastName}</p>
                                  <p className="text-[10px] text-gray-500">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[10px]">
                              <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold uppercase">
                                {user.role?.name || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleToggleStatus(user.id)}
                                disabled={togglingIds.includes(user.id)}
                                className={`px-2 py-1 rounded-full text-[10px] font-bold transition-colors flex items-center gap-1 ${
                                  user.isActive
                                    ? "bg-green-100 text-green-600 hover:bg-green-200"
                                    : "bg-red-100 text-red-600 hover:bg-red-200"
                                } ${togglingIds.includes(user.id) ? "opacity-70 cursor-wait" : ""}`}
                              >
                                {togglingIds.includes(user.id) && (
                                  <div className="w-2 h-2 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                )}
                                {user.isActive ? "ACTIVE" : "INACTIVE"}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={deletingIds.includes(user.id)}
                                className={`p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all ${
                                  deletingIds.includes(user.id) ? "opacity-50 cursor-wait" : ""
                                }`}
                                title="Remove User"
                              >
                                {deletingIds.includes(user.id) ? (
                                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                    <p className="text-xs text-gray-400">No users specifically assigned to this institute yet.</p>
                  </div>
                )}
              </div>
            </div>
          </FormSection>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Customize Institute</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your institute settings and preferences.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="cursor-pointer hover:underline" onClick={() => router.push('/dashboard/institute')}>Institutes</span>
          <span>{">"}</span>
          <span className="text-gray-800 dark:text-white font-medium">{name}</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="p-5 border border-gray-200 rounded-2xl bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm sticky top-24">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <InstituteIcon />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white line-clamp-1">{name}</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-green-500/10 text-green-500">ACTIVE</span>
              </div>
            </div>

            <nav className="space-y-1.5">
              <SideNavItem active={activeTab === "settings"} onClick={() => handleTabChange("settings")}>General Settings</SideNavItem>
              <SideNavItem active={activeTab === "ai-config"} onClick={() => handleTabChange("ai-config")}>AI Config</SideNavItem>
              <SideNavItem active={activeTab === "assign-users"} onClick={() => handleTabChange("assign-users")}>Assign Users</SideNavItem>
              <SideNavItem disabled>Billing</SideNavItem>
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          <div className="min-h-[600px]">
            {renderTabContent()}
          </div>
          
          {activeTab !== "assign-users" && (
            <div className="flex items-center justify-end gap-3 p-6 border border-gray-200 rounded-2xl bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm">
              <button className="px-6 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors">Discard</button>
              <button 
                onClick={handleSave} 
                className="px-8 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25"
              >
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InstituteCustomizePage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading settings...</div>}>
      <InstituteCustomizeContent />
    </Suspense>
  );
}

// UI Components


function SideNavItem({ children, active, onClick, disabled }: { children: React.ReactNode; active?: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`px-4 py-3 text-sm font-semibold rounded-xl transition-all border ${
        active
          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 border-blue-600"
          : "text-gray-500 border-gray-100 dark:border-gray-800 " + (disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer")
      }`}
    >
      {children}
    </div>
  );
}

function FormSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="p-8 border border-gray-200 rounded-2xl bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm">
      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{label}</label>
      <input
        type="text"
        className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{label}</label>
      <div className="relative">
        <select
          className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50 appearance-none outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {children}
        </select>
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>
    </div>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{label}</label>
      <textarea
        rows={4}
        className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ModelOption({ name, desc, active, onClick }: { name: string; desc: string; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`p-5 border-2 rounded-2xl cursor-pointer transition-all ${
        active ? "border-blue-600 bg-blue-50/50 dark:bg-blue-600/5" : "border-gray-100 dark:border-gray-800 hover:border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <h4 className={`font-bold text-sm ${active ? "text-blue-600" : "text-gray-800 dark:text-white"}`}>{name}</h4>
        {active && <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center"><svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></div>}
      </div>
      <p className="text-xs text-gray-500">{desc}</p>
    </div>
  );
}

// Icons
const InstituteIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
const UploadIcon = () => <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;

