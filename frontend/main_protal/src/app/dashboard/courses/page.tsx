"use client";
import React, { useState } from "react";
import Image from "next/image";

export default function CoursesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "Computer Science", "Web Development", "Marketing", "Data Science", "Design", "Finance"];

  const courses = [
    {
      id: 1,
      title: "Introduction to Artificial Intelligence",
      instructor: "Dr. Sarah Miller",
      avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
      rating: 4.8,
      students: 12050,
      price: 49.99,
      duration: "12h 30m",
      lessons: 24,
      image: "bg-purple-100",
      category: "Computer Science",
      level: "Beginner"
    },
     {
      id: 2,
      title: "Advanced Web Development with Next.js",
      instructor: "John Doe",
      avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
      rating: 4.9,
      students: 8540,
      price: 79.99,
      duration: "18h 45m",
      lessons: 42,
      image: "bg-blue-100",
      category: "Web Development",
      level: "Advanced"
    },
     {
      id: 3,
      title: "Digital Marketing Masterclass",
      instructor: "Emily Chen",
      avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024e",
      rating: 4.6,
      students: 23100,
      price: 39.99,
      duration: "8h 15m",
      lessons: 18,
      image: "bg-pink-100",
      category: "Marketing",
      level: "Intermediate"
    },
    {
      id: 4,
      title: "Data Science A-Z",
      instructor: "Michael Brown",
      avatar: "https://i.pravatar.cc/150?u=a042581f4e290260250",
      rating: 4.7,
      students: 15600,
      price: 89.99,
      duration: "22h 00m",
      lessons: 56,
      image: "bg-green-100",
      category: "Data Science",
      level: "All Levels"
    },
    {
      id: 5,
      title: "UX/UI Design Fundamentals",
      instructor: "Jessica Lee",
      avatar: "https://i.pravatar.cc/150?u=a042581f4e290260251",
      rating: 4.9,
      students: 9800,
      price: 59.99,
      duration: "14h 20m",
      lessons: 30,
      image: "bg-yellow-100",
      category: "Design",
      level: "Beginner"
    },
      {
      id: 6,
      title: "Financial Planning for Beginners",
      instructor: "Robert Wilson",
      avatar: "https://i.pravatar.cc/150?u=a042581f4e290260252",
      rating: 4.5,
      students: 5400,
      price: 29.99,
      duration: "6h 45m",
      lessons: 12,
      image: "bg-teal-100",
      category: "Finance",
      level: "Beginner"
    }
  ];

  const filteredCourses = courses.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) || course.instructor.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "All" || course.category === selectedCategory;
      return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Explore Courses</h1>
           <p className="text-gray-500 dark:text-gray-400">Expand your knowledge with our top-rated curriculum.</p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
            <input 
                type="text" 
                placeholder="Search courses, instructors..." 
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        </div>
      </div>

      {/* Categories */}
      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
        {categories.map(category => (
            <button 
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === category 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" 
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                }`}
            >
                {category}
            </button>
        ))}
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredCourses.map((course) => (
          <div key={course.id} className="group flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer" onClick={() => window.location.href = `/dashboard/courses/${course.id}`}>
            {/* Course Image */}
            <div className={`h-48 ${course.image} relative overflow-hidden`}>
                 <div className="absolute inset-0 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                     <span className="text-6xl drop-shadow-lg">📚</span>
                 </div>
                 <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-gray-800 shadow-sm">
                    {course.level}
                 </div>
            </div>

            <div className="p-6 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                 <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full uppercase tracking-wide">
                    {course.category}
                 </span>
                 <div className="flex items-center gap-1 text-yellow-400">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{course.rating}</span>
                 </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                {course.title}
              </h3>
              
              <div className="flex items-center gap-3 mb-4">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-200">
                     <Image src={course.avatar} alt={course.instructor} fill className="object-cover" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{course.instructor}</p>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-6 border-t border-gray-100 dark:border-gray-700 pt-4 mt-auto">
                 <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {course.duration}
                 </div>
                 <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    {course.lessons} Lessons
                 </div>
              </div>

              <div className="flex items-center justify-between">
                 <span className="text-2xl font-bold text-gray-900 dark:text-white">${course.price}</span>
                 <button className="px-5 py-2.5 bg-gray-900 hover:bg-indigo-600 dark:bg-white dark:text-gray-900 dark:hover:bg-indigo-500 dark:hover:text-white text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-indigo-500/25">
                    Enroll Now
                 </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
       {filteredCourses.length === 0 && (
            <div className="text-center py-24 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No courses found</h3>
                <p className="text-gray-500">Try adjusting your search or category filters.</p>
                <button 
                    onClick={() => {setSearchTerm(""); setSelectedCategory("All")}}
                    className="mt-6 text-indigo-600 font-semibold hover:text-indigo-800"
                >
                    Clear all filters
                </button>
            </div>
       )}
    </div>
  );
}
