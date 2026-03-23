"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { instituteService, Course } from "@/services/instituteService";
import { BoxIconLine } from "@/icons";

export default function TeacherCoursesPage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!instituteId) return;
    (async () => {
      setLoading(true);
      try {
        const data = await instituteService.getMyTeacherCourses(instituteId);
        setCourses(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [instituteId]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Courses</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Courses currently assigned to you</p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] p-5 space-y-3">
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <BoxIconLine className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No courses assigned to you yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <div
              key={course.id}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] overflow-hidden hover:shadow-md transition-shadow"
            >
              {course.coverImage ? (
                <img src={course.coverImage} alt={course.name} className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-36 bg-gradient-to-br from-brand-500 to-purple-500" />
              )}
              <div className="p-5">
                <h3 className="font-semibold text-gray-800 dark:text-white text-base leading-snug">{course.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Code: {course.code}</p>
                {course.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{course.description}</p>
                )}
                <div className="mt-4">
                  <a
                    href={`/${instituteId}/teacher/courses/${course.id}/modules`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand-500 hover:underline"
                  >
                    View Modules →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
