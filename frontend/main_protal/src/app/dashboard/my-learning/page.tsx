"use client";
import Link from 'next/link';
import React, { useState } from 'react';

export default function MyLearningPage() {
  const [activeTab, setActiveTab] = useState("All");

  const enrolledCourses = [
     {
      id: 1,
      title: "Introduction to Artificial Intelligence",
      instructor: "Dr. Sarah Miller",
      progress: 35,
      totalHours: 12,
      hoursWatched: 4.2,
      image: "bg-purple-100",
      lastResult: "Module 3: Neural Networks",
      status: "In Progress"
    },
     {
      id: 4,
      title: "Data Science A-Z",
      instructor: "Michael Brown",
      progress: 12,
      totalHours: 22,
      hoursWatched: 2.5,
      image: "bg-green-100",
      lastResult: "Module 1: Python Basics",
      status: "In Progress"
    },
    {
      id: 5,
      title: "React Native for Mobile Dev",
      instructor: "David Wilson",
      progress: 100,
      totalHours: 15,
      hoursWatched: 15,
      image: "bg-orange-100",
      lastResult: "Final Project Submitted",
      status: "Completed"
    }
  ];

  const filteredCourses = activeTab === "All" 
    ? enrolledCourses 
    : enrolledCourses.filter(c => c.status === activeTab);

  const heroCourse = enrolledCourses[0]; // Just showing first as hero for simplicity

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Leaning</h1>
        <p className="text-gray-500 dark:text-gray-400">Track your progress and achieve your goals.</p>
      </div>

        {/* Hero Section - Resume Learning */}
        {heroCourse && (
            <div className="relative bg-gradient-to-r from-indigo-900 to-indigo-700 rounded-3xl p-8 md:p-12 text-white overflow-hidden shadow-2xl">
                 <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
                 <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-purple-500 opacity-20 rounded-full blur-3xl"></div>
                 
                 <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex-1 space-y-4">
                        <div className="inline-block px-3 py-1 bg-white/20 rounded-lg text-xs font-bold uppercase tracking-wider">
                            Resume Learning
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                            {heroCourse.title}
                        </h2>
                        <div className="flex items-center gap-4 text-indigo-100">
                             <span className="flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                {heroCourse.instructor}
                             </span>
                             <span className="w-1 h-1 bg-current rounded-full"></span>
                             <span>{heroCourse.lastResult}</span>
                        </div>
                        
                        <div className="pt-4 max-w-lg">
                             <div className="flex justify-between text-sm mb-2 font-medium">
                                <span>{heroCourse.progress}% Completed</span>
                                <span>{heroCourse.hoursWatched}/{heroCourse.totalHours} hrs</span>
                             </div>
                             <div className="w-full bg-black/20 rounded-full h-3 backdrop-blur-sm">
                                <div className="bg-white h-3 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-1000" style={{ width: `${heroCourse.progress}%` }}></div>
                             </div>
                        </div>

                         <div className="pt-6">
                            <button className="px-8 py-3.5 bg-white text-indigo-900 rounded-xl font-bold text-lg hover:bg-gray-50 transition-colors shadow-lg flex items-center gap-2">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                Continue Lesson
                            </button>
                        </div>
                    </div>
                     <div className="hidden md:flex flex-shrink-0 w-80 h-48 bg-white/10 rounded-xl backdrop-blur-md items-center justify-center border border-white/10">
                        <span className="text-8xl">⏯️</span>
                    </div>
                 </div>
            </div>
        )}

        {/* Tabs */}
        <div className="flex gap-8 border-b border-gray-200 dark:border-gray-700">
            {["All", "In Progress", "Completed"].map(tab => (
                 <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-4 text-sm font-medium transition-all relative ${
                        activeTab === tab 
                        ? "text-indigo-600 dark:text-indigo-400" 
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                 >
                    {tab}
                    {activeTab === tab && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full"></span>
                    )}
                 </button>
            ))}
        </div>

      <div className="space-y-6">
        {filteredCourses.map((course) => (
          <div key={course.id} className="group flex flex-col md:flex-row bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className={`w-full md:w-64 h-48 md:h-auto ${course.image} flex items-center justify-center flex-shrink-0 relative`}>
                <span className="text-5xl group-hover:scale-110 transition-transform">🎓</span>
                 {course.status === "Completed" && (
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center backdrop-blur-[1px]">
                         <div className="bg-white/90 p-2 rounded-full shadow-lg">
                            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                         </div>
                    </div>
                 )}
            </div>
            <div className="p-6 flex-1 flex flex-col justify-center">
              <div className="flex justify-between items-start mb-2">
                 <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                    {course.title}
                 </h3>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      course.status === "Completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                  }`}>
                      {course.status}
                  </div>
              </div>
              
              <p className="text-sm text-gray-500 mb-6 flex items-center gap-2">
                  <span>{course.instructor}</span>
                  <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                  <span>Total: {course.totalHours}h</span>
              </p>
              
              <div className="space-y-2 mb-6">
                 <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-400">
                    <span>{course.progress}% Completed</span>
                    <span>{course.lastResult}</span>
                 </div>
                 <div className="w-full bg-gray-100 rounded-full h-2 dark:bg-gray-700 overflow-hidden">
                    <div className={`h-2 rounded-full transition-all duration-500 ${course.status === "Completed" ? "bg-green-500" : "bg-indigo-600"}`} style={{ width: `${course.progress}%` }}></div>
                 </div>
              </div>

              <div className="flex justify-end">
                   {course.status === "Completed" ? (
                       <button className="text-gray-600 font-semibold hover:text-gray-900 text-sm flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50">
                            Download Certificate
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                       </button>
                   ) : (
                       <button className="text-indigo-600 font-bold hover:text-indigo-700 text-sm flex items-center gap-1 group/btn">
                            Continue Learning 
                            <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
                       </button>
                   )}
              </div>
            </div>
          </div>
        ))}

        {filteredCourses.length === 0 && (
            <div className="text-center py-20">
                <p className="text-gray-500">No courses found in "{activeTab}".</p>
                <button onClick={() => setActiveTab("All")} className="mt-2 text-indigo-600 font-medium">Clear filter</button>
            </div>
        )}
      </div>
    </div>
  );
}
