"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Course, instituteService } from "@/services/instituteService";
import CourseList from "./components/CourseList";
import CourseModal from "./components/CourseModal";
import { FiPlus, FiSearch } from "react-icons/fi";

const CoursesPage = () => {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [searchCode, setSearchCode] = useState("");
  const [searchBatch, setSearchBatch] = useState("");

  useEffect(() => {
    if (instituteId) {
      fetchCourses();
    }
  }, [instituteId]);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const data = await instituteService.getCourses(instituteId);
      setCourses(data);
    } catch (error) {
      console.error("Failed to fetch courses", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCourse = () => {
    setEditingCourse(null);
    setIsModalOpen(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setIsModalOpen(true);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (confirm("Are you sure you want to delete this course?")) {
      try {
        await instituteService.deleteCourse(instituteId, courseId);
        setCourses(courses.filter((c) => c.id !== courseId));
      } catch (error) {
        console.error("Failed to delete course", error);
        alert("Failed to delete course");
      }
    }
  };

  const handleModalSubmit = async (courseData: any) => {
    try {
      if (editingCourse) {
        const updatedCourse = await instituteService.updateCourse(
          instituteId,
          editingCourse.id,
          courseData
        );
        setCourses(
          courses.map((c) => (c.id === editingCourse.id ? updatedCourse : c))
        );
      } else {
        const newCourse = await instituteService.createCourse(
          instituteId,
          courseData
        );
        setCourses([...courses, newCourse]);
      }
    } catch (error) {
        console.error("Error saving course:", error);
        throw error; // Re-throw to let modal handle error state if needed
    }
  };

  const filteredCourses = courses.filter((course) => {
    const matchCode = course.code.toLowerCase().includes(searchCode.toLowerCase());
    const matchBatch = (course.batchNumber || "").toLowerCase().includes(searchBatch.toLowerCase());
    return matchCode && matchBatch;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Courses</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isLoading ? "Loading…" : `${courses.length} course${courses.length !== 1 ? "s" : ""} in your institute`}
          </p>
        </div>
        <button
          onClick={handleCreateCourse}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm whitespace-nowrap"
        >
          <FiPlus className="w-4 h-4" />
          Create Course
        </button>
      </div>

      {/* Search bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by course code…"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow shadow-sm"
          />
        </div>
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by batch number…"
            value={searchBatch}
            onChange={(e) => setSearchBatch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow shadow-sm"
          />
        </div>
      </div>

      <CourseList
        courses={filteredCourses}
        isLoading={isLoading}
        onEdit={handleEditCourse}
        onDelete={handleDeleteCourse}
      />

      <CourseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingCourse}
        instituteId={instituteId}
      />
    </div>
  );
};

export default CoursesPage;
