import React from "react";
import Image from "next/image";


import { createPortal } from "react-dom";

interface TeacherDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: any | null;
  loading?: boolean;
}

const TeacherDetailsModal: React.FC<TeacherDetailsModalProps> = ({
  isOpen,
  onClose,
  teacher,
  loading,
}) => {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 p-4 backdrop-blur-sm transition-all">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800 modal-content">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <span className="sr-only">Close</span>
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Content */}
        {loading ? (
             <div className="flex items-center justify-center py-12">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
             </div>
        ) : teacher ? (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                {teacher.profilePicture ? (
                  <Image
                    src={teacher.profilePicture}
                    alt={`${teacher.firstName} ${teacher.lastName}`}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-bold text-gray-400 dark:text-gray-500">
                    {teacher.firstName?.charAt(0)}
                    {teacher.lastName?.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                  {teacher.firstName} {teacher.lastName}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {teacher.email}
                </p>
                <span
                    className={`inline-flex items-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium mt-1 ${
                    teacher.isActive
                        ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                    }`}
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${teacher.isActive ? "bg-green-600" : "bg-red-600"}`}></span>
                    {teacher.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-6 dark:border-gray-700">
              <div className="space-y-1">
                <span className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Role</span>
                <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{teacher.role}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Designation</span>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{teacher.designation || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Department</span>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{teacher.department || "N/A"}</p>
              </div>
               <div className="space-y-1">
                <span className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Employee ID</span>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{teacher.employeeId || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Joining Date</span>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : "N/A"}
                </p>
              </div>
               <div className="col-span-1 sm:col-span-2 space-y-1">
                <span className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Qualification</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">{teacher.qualification || "N/A"}</p>
              </div>
              <div className="col-span-1 sm:col-span-2 space-y-1">
                <span className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Experience</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">{teacher.experience || "N/A"}</p>
              </div>
            </div>
          </div>
        ) : (
             <div className="text-center py-8 text-gray-500">
                User details not found.
             </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default TeacherDetailsModal;
