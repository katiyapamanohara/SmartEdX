"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { instituteService, Course } from "@/services/instituteService";
import { FiLayers, FiSearch, FiBookOpen } from "react-icons/fi";

const GRADIENTS = [
  "from-violet-600 via-purple-500 to-indigo-400",
  "from-blue-600 via-cyan-500 to-teal-400",
  "from-rose-500 via-pink-500 to-fuchsia-400",
  "from-amber-500 via-orange-400 to-yellow-300",
  "from-emerald-500 via-green-500 to-teal-400",
  "from-sky-600 via-blue-500 to-indigo-400",
];
const gradientFor = (id: string) => GRADIENTS[id.charCodeAt(0) % GRADIENTS.length];

const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-pulse">
    <div className="h-28 bg-gray-200 dark:bg-gray-700" />
    <div className="p-5 space-y-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
    </div>
    <div className="px-5 pb-5">
      <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-xl" />
    </div>
  </div>
);

function CourseCard({ course, instituteId }: { course: Course; instituteId: string }) {
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
        {course.batchNumber && (
          <span className="absolute top-3 right-3 px-2.5 py-1 text-xs font-semibold bg-black/30 text-white rounded-full backdrop-blur-sm">
            Batch {course.batchNumber}
          </span>
        )}
        <span className="absolute bottom-3 left-3 px-2.5 py-1 text-xs font-bold bg-white/20 text-white rounded-lg backdrop-blur-sm border border-white/30">
          {course.code}
        </span>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col gap-2">
        <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug line-clamp-2" title={course.name}>
          {course.name}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 flex-1">
          {course.description || "No description provided."}
        </p>
        {course.moduleCount !== undefined && (
          <p className="text-xs text-gray-400 dark:text-gray-500">{course.moduleCount} module{course.moduleCount !== 1 ? "s" : ""}</p>
        )}
      </div>

      {/* Action */}
      <div className="px-5 pb-5">
        <a
          href={`/${instituteId}/teacher/courses/${course.id}/modules`}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <FiLayers className="w-4 h-4" />
          Manage Content
        </a>
      </div>
    </div>
  );
}

export default function TeacherCoursesPage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const filtered = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Courses</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {loading ? "Loading…" : `${courses.length} course${courses.length !== 1 ? "s" : ""} assigned to you`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search by name or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
            <FiBookOpen className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {search ? "No courses match your search" : "No courses assigned yet"}
          </h3>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {search ? "Try a different keyword." : "Contact your institute admin to get courses assigned."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((course) => (
            <CourseCard key={course.id} course={course} instituteId={instituteId} />
          ))}
        </div>
      )}
    </div>
  );
}
