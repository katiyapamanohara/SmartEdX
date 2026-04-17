"use client";
import React from "react";
import { useParams } from "next/navigation";
import { Course } from "@/services/instituteService";
import { FiEdit2, FiTrash2, FiBookOpen, FiLayers, FiUser } from "react-icons/fi";

interface CourseListProps {
  courses: Course[];
  isLoading: boolean;
  onEdit: (course: Course) => void;
  onDelete: (courseId: string) => void;
  currencySym?: string;
}

// Deterministic gradient per course so each card has a unique but consistent colour
const GRADIENTS = [
  "from-violet-600 via-purple-500 to-indigo-400",
  "from-blue-600 via-cyan-500 to-teal-400",
  "from-rose-500 via-pink-500 to-fuchsia-400",
  "from-amber-500 via-orange-400 to-yellow-300",
  "from-emerald-500 via-green-500 to-teal-400",
  "from-sky-600 via-blue-500 to-indigo-400",
];

const gradientFor = (id: string) =>
  GRADIENTS[id.charCodeAt(0) % GRADIENTS.length];

// ─── Skeleton card ────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-pulse">
    <div className="h-28 bg-gray-200 dark:bg-gray-700" />
    <div className="p-5 space-y-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
    </div>
    <div className="px-5 pb-5 flex gap-2">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex-1" />
      <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
    </div>
  </div>
);

// ─── Single course card ───────────────────────────────────────────
const CourseCard: React.FC<{
  course: Course;
  onEdit: (c: Course) => void;
  onDelete: (id: string) => void;
  currencySym: string;
}> = ({ course, onEdit, onDelete, currencySym }) => {
  const params = useParams();
  const instituteId =
    course.instituteId ||
    (params?.instituteId as string) ||
    window.location.pathname.split("/")[1];

  const handleOpenModules = () => {
    window.location.href = `/${instituteId}/institute/courses/${course.id}/modules`;
  };

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
      {/* Banner */}
      <div className="relative h-28 overflow-hidden">
        {course.coverImage ? (
          <img
            src={course.coverImage}
            alt={course.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div
            className={`w-full h-full bg-linear-to-br ${gradientFor(course.id)} group-hover:scale-105 transition-transform duration-500`}
          />
        )}
        {/* Batch badge overlay */}
        {course.batchNumber && (
          <span className="absolute top-3 right-3 px-2.5 py-1 text-xs font-semibold bg-black/30 text-white rounded-full backdrop-blur-sm">
            Batch {course.batchNumber}
          </span>
        )}
        {/* Code badge overlay */}
        <span className="absolute bottom-3 left-3 px-2.5 py-1 text-xs font-bold bg-white/20 text-white rounded-lg backdrop-blur-sm border border-white/30">
          {course.code}
        </span>
        {/* Price badge overlay */}
        {(() => {
          const isMonthly = (course as any).paymentType === "monthly";
          const activePrice = isMonthly ? (course as any).monthlyPrice : course.price;
          const hasPrice = activePrice != null && activePrice > 0;
          return (
            <span className={`absolute bottom-3 right-3 px-2.5 py-1 text-xs font-bold rounded-lg backdrop-blur-sm border ${
              hasPrice
                ? "bg-green-500/80 text-white border-green-400/40"
                : "bg-white/20 text-white border-white/30"
            }`}>
              {hasPrice
                ? isMonthly
                  ? `${currencySym}${parseFloat(String(activePrice)).toFixed(2)}/mo`
                  : `${currencySym}${parseFloat(String(activePrice)).toFixed(2)}`
                : "Free"}
            </span>
          );
        })()}
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col gap-3">
        <h3
          className="text-base font-bold text-gray-900 dark:text-white leading-snug line-clamp-2"
          title={course.name}
        >
          {course.name}
        </h3>

        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 flex-1">
          {course.description || "No description provided."}
        </p>

        {/* Teacher row */}
        <div className="flex items-center gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-700">
          {course.assignedTeacher ? (
            <>
              {course.assignedTeacher.profilePicture ? (
                <img
                  src={course.assignedTeacher.profilePicture}
                  alt={`${course.assignedTeacher.firstName} ${course.assignedTeacher.lastName}`}
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {course.assignedTeacher.firstName[0]}
                  {course.assignedTeacher.lastName[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs text-gray-400 dark:text-gray-500">Lecturer</p>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
                  {course.assignedTeacher.firstName} {course.assignedTeacher.lastName}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                <FiUser className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">No lecturer assigned</p>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-5 flex gap-2">
        <button
          onClick={handleOpenModules}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
        >
          <FiLayers className="w-3.5 h-3.5" />
          View Content
        </button>
        <button
          onClick={() => onEdit(course)}
          className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
          title="Edit"
        >
          <FiEdit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(course.id)}
          className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-colors"
          title="Delete"
        >
          <FiTrash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// ─── List ─────────────────────────────────────────────────────────
const CourseList: React.FC<CourseListProps> = ({
  courses,
  isLoading,
  onEdit,
  onDelete,
  currencySym = "$",
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
          <FiBookOpen className="w-8 h-8 text-blue-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">No courses found</h3>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Create your first course to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} onEdit={onEdit} onDelete={onDelete} currencySym={currencySym} />
      ))}
    </div>
  );
};

export default CourseList;
