"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { instituteService, Course } from "@/services/instituteService";
import { BoxIconLine } from "@/icons";
import { useFeatures } from "@/context/InstituteFeatureContext";

export default function StudentMyCoursesPage() {
  const params = useParams();
  const router = useRouter();
  const instituteId = params?.instituteId as string;
  const { hasFeature } = useFeatures();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!instituteId) return;
    (async () => {
      setLoading(true);
      try {
        const data = await instituteService.getMyEnrolledCourses(instituteId);
        setCourses(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [instituteId]);

  function openAiTutor(course: Course) {
    const params = new URLSearchParams({
      courseId:   course.id,
      courseName: course.name,
      courseCode: course.code ?? "",
    });
    router.push(`/${instituteId}/student/ai-chat?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Courses</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View all courses you are enrolled in</p>
      </div>

      {/* Stat bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">Enrolled</span>
          <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">
            {loading ? "—" : courses.length}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">Total Modules</span>
          <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">
            {loading ? "—" : courses.reduce((sum, c) => sum + (c.moduleCount ?? 0), 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 p-5">
          <span className="text-sm text-gray-500 dark:text-gray-400">Instructors</span>
          <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">
            {loading ? "—" : new Set(courses.filter(c => c.assignedTeacher).map(c => c.assignedTeacher!.id)).size}
          </p>
        </div>
      </div>

      {/* Course grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 p-5 space-y-3">
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <BoxIconLine className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">No courses yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Your enrolled courses will appear here once assigned by your institute.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <div
              key={course.id}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 overflow-hidden hover:shadow-md transition-shadow"
            >
              {course.coverImage ? (
                <img src={course.coverImage} alt={course.name} className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-36 bg-linear-to-br from-brand-500 to-purple-500" />
              )}
              <div className="p-5">
                <h3 className="font-semibold text-gray-800 dark:text-white text-base leading-snug">{course.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Code: {course.code}</p>
                {course.assignedTeacher && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Instructor: {course.assignedTeacher.firstName} {course.assignedTeacher.lastName}
                  </p>
                )}
                {course.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{course.description}</p>
                )}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                    {course.moduleCount ?? 0} module{(course.moduleCount ?? 0) !== 1 ? "s" : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    {hasFeature("ai_tutor") && (
                    <button
                      onClick={() => openAiTutor(course)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                      </svg>
                      AI Tutor
                    </button>
                    )}
                    <a
                      href={`/${instituteId}/student/my-courses/${course.id}/modules`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-brand-500 hover:underline"
                    >
                      View →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
