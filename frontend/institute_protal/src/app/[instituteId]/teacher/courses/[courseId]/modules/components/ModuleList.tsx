import React from "react";
import { useRouter, useParams } from "next/navigation";
import { CourseModule } from "@/services/instituteService";
import { FiEdit2, FiTrash2, FiBookOpen } from "react-icons/fi";

interface ModuleListProps {
  modules: CourseModule[];
  isLoading: boolean;
  onEdit: (module: CourseModule) => void;
  onDelete: (moduleId: string) => void;
}

const ModuleList: React.FC<ModuleListProps> = ({
  modules,
  isLoading,
  onEdit,
  onDelete,
}) => {
  const router = useRouter();
  const params = useParams();
  const instituteId = params?.instituteId as string;
  const courseId = params?.courseId as string;
  if (isLoading) {
    return (
      <div className="w-full text-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading modules...</p>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">
          No modules found. Create one to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {modules.map((module) => (
        <div
          key={module.id}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1">
              <span className="font-bold text-sm w-5 h-5 flex items-center justify-center">
                {module.order}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {module.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {module.description || "No description provided."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/${instituteId}/institute/courses/${courseId}/modules/${module.id}/contents`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              <FiBookOpen className="w-4 h-4" />
              Contents
            </button>
            <button
              onClick={() => onEdit(module)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FiEdit2 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => onDelete(module.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-red-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FiTrash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ModuleList;
