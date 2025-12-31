"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, stagger, useAnimate } from "framer-motion";
import { setGlobalLoading } from "@/components/common/GlobalLoader";
import { useModal } from "@/hooks/useModal";
import CreateCoursePopup from "./CreateCoursePopup";

/**
 * Simple local courses hook (replace with API integration later)
 */
const STORAGE_KEY = "teacher_courses";

const useCourses = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          setCourses(JSON.parse(raw));
        } else {
          const defaults = [
            { id: "1", title: "Web Development", description: "HTML, CSS, JS fundamentals", students: 120 },
            { id: "2", title: "Advanced React", description: "Hooks, performance, patterns", students: 80 },
          ];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
          setCourses(defaults);
        }
      } catch (err) {
        console.error("Failed to load courses from storage", err);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    }, 600);
  };

  useEffect(() => {
    // only run on client
    if (typeof window !== "undefined") load();
  }, []);

  const refetch = () => load();

  const persist = (items: any[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error("Failed to persist courses", err);
    }
  };

  const addCourse = (course: { title: string; description?: string; students?: number }) => {
    const item = { id: Date.now().toString(), ...course };
    setCourses((prev) => {
      const next = [...prev, item];
      persist(next);
      return next;
    });
  };

  const removeCourse = (courseId: string) => {
    setCourses((prev) => {
      const next = prev.filter((c) => c.id !== courseId);
      persist(next);
      return next;
    });
  };

  const updateCourse = (courseId: string, updates: Partial<{ title: string; description: string; students: number }>) => {
    setCourses((prev) => {
      const next = prev.map((c) => (c.id === courseId ? { ...c, ...updates } : c));
      persist(next);
      return next;
    });
  };

  return { courses, loading, refetch, addCourse, removeCourse, updateCourse };
};

const Courses: React.FC = () => {
  const router = useRouter();
  const { courses, loading, addCourse, removeCourse } = useCourses();
  const [scope, animate] = useAnimate();

  /* global loader */
  useEffect(() => setGlobalLoading(loading), [loading]);

  /* small entry animations */
  useEffect(() => {
    const sequence = async () => {
      await animate([
        [".animated-border", { borderColor: "rgba(156,163,175,0.3)" }, { duration: 0.3, delay: stagger(0.02) }],
      ]);
      await animate([
        [".animated-card", { opacity: 1, y: 0 }, { type: "spring", stiffness: 500, damping: 28, delay: stagger(0.02) }],
      ]);
    };
    sequence();
  }, [animate]);

  const { isOpen, openModal, closeModal } = useModal();

  const [message, setMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete course "${name}"? This action cannot be undone.`)) return;

    try {
      setDeletingId(id);
      // Simulate API delay
      await new Promise((res) => setTimeout(res, 500));
      removeCourse(id);
      setMessage(`Course "${name}" deleted.`);
      setTimeout(() => setMessage(null), 2500);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="h-full" ref={scope}>
      <div className="mb-12">
        <div className="text-center animated-content">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Course Management</h2>
          <p className="text-gray-400 mb-4">Create and manage learning courses for students</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            className="flex items-center p-6 py-10 bg-white border border-gray-200 rounded-2xl dark:bg-white/[0.03] dark:border-gray-800 cursor-pointer animated-card animated-border"
            initial={{ opacity: 0, y: 30 }}
            whileHover={{ scale: 1.02 }}
            onClick={openModal}
          >
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mr-4">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5v14M5 12h14" stroke="#4F46E5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Course</h3>
              <p className="text-gray-500 text-sm">Add a new course with modules and content</p>
            </div>
          </motion.div>
        </div>

        {message && <div className="mt-4 text-sm text-center text-green-600 dark:text-green-400">{message}</div>}

        <CreateCoursePopup isOpen={isOpen} onClose={closeModal} onCreate={(course) => { addCourse(course); setMessage(`Course "${course.title}" created.`); setTimeout(() => setMessage(null), 2500); }} />
      </div>

      <div>
        {courses.length > 0 ? (
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-6">Your Courses</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {courses.map((course, idx) => (
                <motion.div key={course.id} className="bg-white border border-gray-200 rounded-2xl dark:bg-white/[0.03] dark:border-gray-800 flex flex-col" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}>
                  <div className="p-6 flex-grow">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{course.title}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{course.description}</p>
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">👥 {course.students ?? 0} Students</p>
                  </div>

                  <div className="px-6 py-4 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 flex justify-between items-center">
                    <button onClick={() => router.push(`/courses/${course.id}`)} className="text-indigo-600 dark:text-indigo-400 text-sm font-medium">Manage →</button>
                    <button onClick={() => handleDelete(course.id, course.title)} disabled={deletingId === course.id} className={`text-sm ${deletingId === course.id ? "text-gray-400 cursor-not-allowed" : "text-red-500"}`}>
                      {deletingId === course.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400">No courses created yet.</div>
        )}
      </div>
    </div>
  );
};

export default Courses;
