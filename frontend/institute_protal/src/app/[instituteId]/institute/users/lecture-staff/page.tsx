"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { instituteService } from "@/services/instituteService";
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import LectureStaffTable from "./components/LectureStaffTable";
import AddEditUserModal from "./components/AddEditUserModal";
import { PlusIcon, UserIcon } from "@/icons"; // Using UserIcon as temporary placeholder if SearchIcon doesn't exist

const LectureStaffPage = () => {
  const params = useParams();
  const instituteId = params.instituteId as string;

  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    const data = await instituteService.getInstituteUsers(instituteId, "teacher");
    setUsers(data || []);
    setFilteredUsers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (instituteId) {
      fetchUsers();
    }
  }, [instituteId]);

  useEffect(() => {
    if (users.length > 0) {
        const filtered = users.filter(user => 
            user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);


  const handleAddUser = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Are you sure you want to delete this staff member?")) {
      try {
        await instituteService.deleteInstituteUser(instituteId, userId);
        fetchUsers();
      } catch (error) {
        console.error("Failed to delete user:", error);
        alert("Failed to delete user. Please try again.");
      }
    }
  };

  const handleSaveUser = async (userData: any) => {
    try {
      if (selectedUser) {
        await instituteService.updateInstituteUser(
          instituteId,
          selectedUser.id,
          userData
        );
      } else {
        await instituteService.createInstituteUser(instituteId, {
          ...userData,
          role: "teacher", // Ensure role is set
        });
      }
      fetchUsers();
    } catch (error) {
      console.error("Failed to save user:", error);
      throw error; // Re-throw to be handled by modal
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Lecture Staff
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your institute's lecture staff</p>
        </div>
       
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button onClick={handleAddUser} className="flex items-center gap-2" size="sm">
             <PlusIcon className="w-5 h-5" />
            Add Lecture
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700">
        <div className="w-full sm:w-72">
          <InputField 
            placeholder="Search staff..." 
            // startIcon={<UserIcon className="w-5 h-5" />} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
         {/* Add more filters here if needed */}
      </div>

      <div className="bg-white rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : (
          <LectureStaffTable
            users={filteredUsers}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
          />
        )}
      </div>

      <AddEditUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUser}
        user={selectedUser}
      />
    </div>
  );
};

export default LectureStaffPage;
