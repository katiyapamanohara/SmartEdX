"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { instituteService, Course, Institute } from "@/services/instituteService";
import { FiBookOpen, FiUser, FiLoader } from "react-icons/fi";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", INR: "₹", AUD: "A$", CAD: "C$",
  SGD: "S$", AED: "د.إ", LKR: "Rs", JPY: "¥", CNY: "¥", BRL: "R$",
  MYR: "RM", NGN: "₦", PKR: "₨", ZAR: "R",
};

const GRADIENTS = [
  "from-violet-600 via-purple-500 to-indigo-400",
  "from-blue-600 via-cyan-500 to-teal-400",
  "from-rose-500 via-pink-500 to-fuchsia-400",
  "from-amber-500 via-orange-400 to-yellow-300",
  "from-emerald-500 via-green-500 to-teal-400",
  "from-sky-600 via-blue-500 to-indigo-400",
];

const gradientFor = (id: string) => GRADIENTS[id.charCodeAt(0) % GRADIENTS.length];

function PriceBadge({ course, currencySym }: { course: Course; currencySym: string }) {
  const isMonthly = course.paymentType === "monthly";
  const activePrice = isMonthly ? course.monthlyPrice : course.price;
  const hasPrice = activePrice != null && Number(activePrice) > 0;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
        hasPrice
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
      }`}
    >
      {hasPrice
        ? isMonthly
          ? `${currencySym}${parseFloat(String(activePrice)).toFixed(2)}/mo`
          : `${currencySym}${parseFloat(String(activePrice)).toFixed(2)}`
        : "Free"}
    </span>
  );
}

function CourseCard({ course, currencySym, instituteId }: { course: Course; currencySym: string; instituteId: string }) {
  return (
    <div className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
      {/* Banner */}
      <div className="relative h-36 overflow-hidden">
        {course.coverImage ? (
          <img
            src={course.coverImage}
            alt={course.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradientFor(course.id)} group-hover:scale-105 transition-transform duration-500`} />
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
      <div className="p-5 flex-1 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 flex-1">
            {course.name}
          </h3>
          <PriceBadge course={course} currencySym={currencySym} />
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 flex-1">
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
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {course.assignedTeacher.firstName[0]}{course.assignedTeacher.lastName[0]}
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

      {/* Enrol CTA */}
      <div className="px-5 pb-5">
        <a
          href={`/${instituteId}/enrol?courseId=${course.id}`}
          className="block w-full text-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          Enrol Now
        </a>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="h-36 bg-gray-200 dark:bg-gray-700" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-xl mt-2" />
      </div>
    </div>
  );
}

export default function PublicCoursesPage() {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const [institute, setInstitute] = useState<Institute | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [currencySym, setCurrencySym] = useState("$");

  useEffect(() => {
    if (!instituteId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [inst, courseList] = await Promise.all([
          instituteService.getPublicInstituteInfo(instituteId),
          instituteService.getPublicCourses(instituteId),
        ]);
        setInstitute(inst);
        setCourses(courseList);
        if (inst?.currency) {
          setCurrencySym(CURRENCY_SYMBOLS[inst.currency] ?? inst.currency);
        }
      } catch (err) {
        console.error("Failed to load public courses:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [instituteId]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center text-center gap-4">
            {institute?.logo ? (
              <img src={institute.logo} alt={institute.name} className="h-14 w-auto object-contain" />
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <FiBookOpen className="w-7 h-7 text-blue-500" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {institute?.name ?? "Courses"}
              </h1>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                Browse all available courses and enrol today
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Course grid */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
              <FiBookOpen className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">No courses available</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500">Check back soon for new courses.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {courses.length} course{courses.length !== 1 ? "s" : ""} available
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} currencySym={currencySym} instituteId={instituteId} />
              ))}
            </div>
          </>
        )}

        {/* Enrol link */}
        {!loading && courses.length > 0 && (
          <div className="mt-10 text-center">
            <a
              href={`/${instituteId}/enrol`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-md"
            >
              <FiBookOpen className="w-4 h-4" />
              Go to Enrollment Form
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
