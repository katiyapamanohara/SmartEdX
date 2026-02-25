import React from "react";
import { Course } from "@/services/instituteService";
import { FiEdit2, FiTrash2, FiBookOpen } from "react-icons/fi";

interface CourseListProps {
  courses: Course[];
  isLoading: boolean;
  onEdit: (course: Course) => void;
  onDelete: (courseId: string) => void;
}

const CourseList: React.FC<CourseListProps> = ({
  courses,
  isLoading,
  onEdit,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="w-full text-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading courses...</p>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">
          No courses found. Create one to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course) => (
        <div
          key={course.id}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
        >
          <div className="p-5 flex-grow flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-start gap-3 w-full">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1">
                  <FiBookOpen className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate" title={course.name}>
                    {course.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                      {course.code}
                    </span>
                    {course.batchNumber && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                        Batch: {course.batchNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-2 mb-4 flex-grow">
              {course.description || "No description provided."}
            </p>

            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-750">
              <div className="flex items-center">
                {course.assignedTeacher ? (
                  <>
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-300 mr-2.5 text-sm font-semibold border border-blue-200 dark:border-blue-800 flex-shrink-0">
                      {course.assignedTeacher.firstName[0]}
                      {course.assignedTeacher.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Lecturer</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate pr-2">
                        {course.assignedTeacher.firstName} {course.assignedTeacher.lastName}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center py-1">
                    <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 mr-2.5 border border-gray-200 dark:border-gray-700 flex-shrink-0">
                      ?
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">Unassigned</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800/50 px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <a
              href={`/institute/courses/${course.id}/modules`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-white dark:bg-gray-800 dark:text-blue-400 border border-blue-200 dark:border-blue-900 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors shadow-sm"
              onClick={(e) => {
                e.preventDefault();
                // Assumes we are passing down instituteId or extracting from params
                window.location.href = `/${course.instituteId || window.location.pathname.split('/')[1]}/institute/courses/${course.id}/modules`;
              }}
            >
              <FiBookOpen className="w-4 h-4" />
              Modules
            </a>
            <button
              onClick={() => onEdit(course)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm"
            >
              <FiEdit2 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => onDelete(course.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-red-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
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

export default CourseList;
