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
  const [phoneNumber, setPhoneNumber] = useState("");
  const [primaryUseCases, setPrimaryUseCases] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Feature Gating State
  const [plan, setPlan] = useState("starter");
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const [isSavingFeatures, setIsSavingFeatures] = useState(false);

  const PLAN_DEFAULTS: Record<string, string[]> = {
    starter: ["live_sessions", "recordings"],
    pro: ["live_sessions", "recordings", "ai_tools", "exam_proctoring", "advanced_reports"],
    enterprise: ["live_sessions", "recordings", "ai_tools", "exam_proctoring", "advanced_reports", "virtual_labs", "voice_agent"],
  };

  const FEATURE_META: Record<string, { label: string; description: string; icon: string; plans: string[] }> = {
    virtual_labs: { label: "Virtual Labs", description: "Physics, chemistry, and engineering simulations embedded via PhET & GeoGebra.", icon: "🧪", plans: ["enterprise"] },
    ai_tools: { label: "AI Tools", description: "Lesson plan generator, AI essay grader, class insights, and at-risk alerts.", icon: "🤖", plans: ["pro", "enterprise"] },
    voice_agent: { label: "Voice Agent", description: "AI voice assistant for student Q&A and real-time tutoring.", icon: "🎙️", plans: ["enterprise"] },
    exam_proctoring: { label: "Exam Proctoring", description: "Face verification and integrity monitoring for online exams.", icon: "👁️", plans: ["pro", "enterprise"] },
    live_sessions: { label: "Live Classes", description: "Real-time video classes with screen sharing and chat.", icon: "📹", plans: ["starter", "pro", "enterprise"] },
    recordings: { label: "Recordings", description: "Record and replay live sessions for students.", icon: "🎬", plans: ["starter", "pro", "enterprise"] },
    advanced_reports: { label: "Advanced Reports", description: "Detailed performance analytics, CSV exports, and student insights.", icon: "📊", plans: ["pro", "enterprise"] },
  };

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Assign User State
  const [assignEmail, setAssignEmail] = useState("");
  const [assignRole, setAssignRole] = useState("instructor");
  const [rolesList, setRolesList] = useState<any[]>([
    { id: 'default-1', name: 'instructor' },
    { id: 'default-2', name: 'student' }
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
        setPhoneNumber(data.phoneNumber || "");
        setIsActive(data.isActive ?? true);
        setPlan(data.plan || "starter");
        setEnabledFeatures(Array.isArray(data.enabledFeatures) ? data.enabledFeatures : []);
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
        // Filter roles to only include 'instructor'
        const allowedRoles = ['instructor'];
        const filteredRoles = roles.filter((r: any) => allowedRoles.includes(r.name));
        
        setRolesList(filteredRoles);
        
        if (filteredRoles.length > 0) {
          // Default to instructor if available, otherwise first available
          const instructorRole = filteredRoles.find((r: any) => r.name === 'instructor');
          setAssignRole(instructorRole?.name || filteredRoles[0].name);
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
      
      // Filter users to only show those with allowed roles
      const allowedRoles = ['instructor'];
      const filteredUsers = Array.isArray(users) 
        ? users.filter((u: any) => u.role?.name && allowedRoles.includes(u.role.name))
        : [];
        
      setAssignedUsers(filteredUsers);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && instituteId) {
      try {
        setIsUploading(true);
        // Show preview immediately
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogo(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload to server
        const result = await authService.uploadInstituteLogo(instituteId, file);
        if (result && result.url) {
          setLogo(result.url);
          alert("Logo uploaded successfully!");
        }
      } catch (error) {
        console.error("Failed to upload logo:", error);
        alert("Failed to upload logo. Please try again.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) newErrors.name = "Institute Name is required";
    if (!category) newErrors.category = "Category is required";
    if (!country) newErrors.country = "Country is required";

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone Number is required";
    } else if (!/^\d{10}$/.test(phoneNumber.replace(/\D/g, ''))) {
      newErrors.phoneNumber = "Phone Number must be 10 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
       // Find the first error and scroll to it if possible, or just alert
       const firstError = Object.values(errors)[0];
       // alert("Please fix the errors before saving.");
       return;
    }

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
        phoneNumber,
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

  const handleSaveFeatures = async () => {
    try {
      setIsSavingFeatures(true);
      await authService.updateInstituteFeatures(instituteId, { plan, enabledFeatures });
      alert("Features updated successfully!");
    } catch (error) {
      console.error("Failed to update features:", error);
      alert("Failed to update features. Please try again.");
    } finally {
      setIsSavingFeatures(false);
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
              
              {/* Overlay for uploading */}
              {isUploading && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 z-10 flex items-center justify-center rounded-2xl">
                      <div className="flex flex-col items-center">
                          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-xs font-bold text-blue-600 mt-2">Uploading...</span>
                      </div>
                  </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Institute Name" value={name} onChange={setName} error={errors.name} />
                <Input label="Location" value={location} onChange={setLocation} />
                <div className="md:col-span-2">
                  <Select label="Category" value={category} onChange={setCategory} error={errors.category}>
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
                  
                  <Select label="Country" value={country} onChange={setCountry} error={errors.country}>
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
                  
                  <Input label="Phone Number" value={phoneNumber} onChange={setPhoneNumber} error={errors.phoneNumber} />
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
      case "features": {
        const planDefs = PLAN_DEFAULTS[plan] || [];
        const PLAN_DISPLAY: Record<string, { label: string; price: string; desc: string; badgeClass: string; gradientFrom: string; gradientTo: string }> = {
          starter: { label: "Starter", price: "$29/mo", desc: "Basic LMS features for small institutes", badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", gradientFrom: "from-blue-500", gradientTo: "to-blue-600" },
          pro: { label: "Pro", price: "$79/mo", desc: "AI tools, proctoring, and advanced analytics", badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", gradientFrom: "from-violet-500", gradientTo: "to-violet-600" },
          enterprise: { label: "Enterprise", price: "$199/mo", desc: "All features including virtual labs and voice agent", badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", gradientFrom: "from-amber-500", gradientTo: "to-amber-600" },
        };
        const currentPlan = PLAN_DISPLAY[plan] || PLAN_DISPLAY.starter;

        return (
          <FormSection title="Platform Features" description="Features available to this institute are determined by your subscription plan. You may only disable included features — to unlock more, upgrade your plan.">
            <div className="space-y-6">

              {/* Current Subscription Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currentPlan.gradientFrom} ${currentPlan.gradientTo} flex items-center justify-center text-white flex-shrink-0 shadow-lg`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-800 dark:text-white">{currentPlan.label} Plan</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${currentPlan.badgeClass}`}>{currentPlan.price}</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">ACTIVE</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{currentPlan.desc}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{planDefs.length} features included in this plan</p>
                  </div>
                </div>
                {plan !== "enterprise" && (
                  <button
                    onClick={() => router.push('/dashboard/billing')}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-violet-600 rounded-xl hover:from-violet-600 hover:to-violet-700 transition-all shadow-lg shadow-violet-500/25 shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Upgrade Plan
                  </button>
                )}
              </div>

              {/* Info notice */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30">
                <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                  Toggle any feature that is included in your plan on or off. Features outside your plan are locked — upgrade to unlock them.
                </p>
              </div>

              {/* Feature Toggles */}
              <div className="space-y-3">
                {Object.entries(FEATURE_META).map(([key, meta]) => {
                  const isInPlan = planDefs.includes(key);
                  const isEnabled = enabledFeatures.includes(key);
                  const requiredPlan = meta.plans[0];

                  return (
                    <div
                      key={key}
                      className={`relative flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        isInPlan && isEnabled
                          ? "border-blue-200 bg-blue-50/40 dark:bg-blue-500/10 dark:border-blue-800"
                          : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
                      }`}
                    >
                      {/* Feature info */}
                      <div className={`flex items-center gap-3 min-w-0 ${!isInPlan ? "blur-[1.5px] select-none pointer-events-none" : ""}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isInPlan && isEnabled
                            ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600"
                        }`}>
                          {getFeatureIcon(key)}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-bold ${isInPlan && isEnabled ? "text-gray-800 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
                            {meta.label}
                          </p>
                          <p className="text-xs text-gray-400 leading-relaxed">{meta.description}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {meta.plans.map(p => (
                              <span key={p} className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wide ${
                                p === "starter" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" :
                                p === "pro" ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" :
                                "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                              }`}>{p}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right side: toggle (in-plan) or upgrade CTA (out-of-plan) */}
                      <div className="shrink-0 ml-4">
                        {isInPlan ? (
                          <div className="flex flex-col items-center gap-1">
                            <button
                              onClick={() => {
                                setEnabledFeatures(prev =>
                                  prev.includes(key)
                                    ? prev.filter(f => f !== key)
                                    : [...prev, key]
                                );
                              }}
                              title={isEnabled ? "Click to disable" : "Click to enable"}
                              className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                                isEnabled
                                  ? "bg-blue-600 hover:bg-blue-700"
                                  : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                              }`}
                            >
                              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isEnabled ? "translate-x-7" : "translate-x-1"}`} />
                            </button>
                            <span className={`text-[9px] font-bold uppercase tracking-wide ${isEnabled ? "text-blue-500" : "text-gray-400"}`}>
                              {isEnabled ? "On" : "Off"}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => router.push('/dashboard/billing')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors border border-violet-200 dark:border-violet-800"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Upgrade to {requiredPlan}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary + Save */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-sm font-bold text-gray-800 dark:text-white">Active Features: {enabledFeatures.length}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{enabledFeatures.map(f => FEATURE_META[f]?.label || f).join(", ") || "None enabled"}</p>
                </div>
                <button
                  onClick={handleSaveFeatures}
                  disabled={isSavingFeatures}
                  className={`px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2 ${isSavingFeatures ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {isSavingFeatures ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : "Save Changes"}
                </button>
              </div>
            </div>
          </FormSection>
        );
      }
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
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                  isActive 
                    ? "bg-green-500/10 text-green-500" 
                    : "bg-red-500/10 text-red-500"
                }`}>
                  {isActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
            </div>

            <nav className="space-y-1.5">
              <SideNavItem active={activeTab === "settings"} onClick={() => handleTabChange("settings")}>General Settings</SideNavItem>
              <SideNavItem active={activeTab === "assign-users"} onClick={() => handleTabChange("assign-users")}>Assign Instructor</SideNavItem>
              <SideNavItem active={activeTab === "features"} onClick={() => handleTabChange("features")}>Features & Plan</SideNavItem>
              <SideNavItem disabled>Institute Bank Account Configurations</SideNavItem>
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          <div className="min-h-[600px]">
            {renderTabContent()}
          </div>
          
          {activeTab !== "assign-users" && activeTab !== "features" && (
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


function getFeatureIcon(key: string) {
  const cls = "w-5 h-5";
  switch (key) {
    case "virtual_labs":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      );
    case "ai_tools":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
        </svg>
      );
    case "voice_agent":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      );
    case "exam_proctoring":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case "live_sessions":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    case "recordings":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "advanced_reports":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
  }
}

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

function Input({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{label}</label>
      <input
        type="text"
        className={`w-full px-4 py-3 text-sm border rounded-xl bg-gray-50 dark:bg-gray-800/50 outline-none transition-all ${
             error 
             ? "border-red-500 focus:ring-2 focus:ring-red-500/20" 
             : "border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500/20"
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Select({ label, value, onChange, children, error }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{label}</label>
      <div className="relative">
        <select
          className={`w-full px-4 py-3 text-sm border rounded-xl bg-gray-50 dark:bg-gray-800/50 appearance-none outline-none transition-all ${
             error
             ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
             : "border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500/20"
          }`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {children}
        </select>
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
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

