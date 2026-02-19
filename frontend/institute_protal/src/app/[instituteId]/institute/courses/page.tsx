"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Course, instituteService } from "@/services/instituteService";
import CourseList from "./components/CourseList";
import CourseModal from "./components/CourseModal";
import { FiPlus } from "react-icons/fi";

const CoursesPage = () => {
  const params = useParams();
  const instituteId = params?.instituteId as string;

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Courses
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your institute's courses and assignments
          </p>
        </div>
        <button
          onClick={handleCreateCourse}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
        >
          <FiPlus className="w-5 h-5" />
          <span>Create Course</span>
        </button>
      </div>

      <CourseList
        courses={courses}
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
