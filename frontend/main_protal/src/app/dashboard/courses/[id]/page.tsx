"use client";
import React, { useState } from 'react';
import Image from 'next/image';

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState("Curriculum");

  return (
    <div className="max-w-7xl mx-auto">
       {/* Hero Section */}
       <div className="bg-gray-900 text-white py-12 px-6 lg:px-12">
           <div className="flex flex-col lg:flex-row gap-8 items-start">
               <div className="flex-1">
                   <div className="flex gap-2 text-indigo-300 text-sm font-bold mb-4">
                       <span>Development</span>
                       <span>•</span>
                       <span>Computer Science</span>
                   </div>
                   <h1 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight">Introduction to Artificial Intelligence: From Theory to Practice</h1>
                   <p className="text-gray-300 text-lg mb-6 max-w-2xl">
                       Master the fundamentals of AI, Machine Learning, and Neural Networks. Build real-world projects and launch your career in Data Science.
                   </p>
                   
                   <div className="flex items-center gap-6 text-sm mb-8">
                       <div className="flex items-center gap-1">
                          <span className="text-yellow-400">★★★★★</span>
                          <span className="font-bold">4.8</span>
                          <span className="text-gray-400">(1,240 ratings)</span>
                       </div>
                       <div>
                           <span className="font-bold">12,050</span> Students
                       </div>
                        <div className="flex items-center gap-2">
                           <span>Created by</span>
                           <span className="text-indigo-400 underline cursor-pointer">Dr. Sarah Miller</span>
                       </div>
                   </div>

                   <div className="flex items-center gap-4 text-sm text-gray-400">
                       <span className="flex items-center gap-1">
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                           Last updated 2 weeks ago
                       </span>
                       <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                           English, Spanish
                       </span>
                   </div>
               </div>

               {/* Video Preview / Sticky Card */}
               <div className="w-full lg:w-96 bg-white rounded-xl overflow-hidden shadow-2xl text-gray-900 flex-shrink-0 lg:mt-6 border border-gray-100">
                   <div className="h-48 bg-gray-200 relative group cursor-pointer">
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            </div>
                        </div>
                   </div>
                   <div className="p-6">
                       <div className="flex items-center gap-2 mb-4">
                           <span className="text-3xl font-bold">$49.99</span>
                           <span className="text-lg text-gray-400 line-through">$199.99</span>
                           <span className="text-xs font-bold text-white bg-indigo-600 px-2 py-1 rounded">75% OFF</span>
                       </div>
                       <button className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 mb-3">
                           Add to Cart
                       </button>
                       <button className="w-full py-3 border border-gray-300 font-bold rounded-lg hover:bg-gray-50 transition-colors">
                           Buy Now
                       </button>
                       <p className="text-xs text-center text-gray-500 mt-4">30-Day Money-Back Guarantee</p>
                       
                       <div className="mt-6 space-y-3">
                           <h4 className="font-bold text-sm">This course includes:</h4>
                           <ul className="text-sm text-gray-600 space-y-2">
                               <li className="flex gap-2"><span>🎥</span> 12.5 hours on-demand video</li>
                               <li className="flex gap-2"><span>📂</span> 24 downloadable resources</li>
                               <li className="flex gap-2"><span>✅</span> Full lifetime access</li>
                               <li className="flex gap-2"><span>📱</span> Access on mobile and TV</li>
                               <li className="flex gap-2"><span>🏆</span> Certificate of completion</li>
                           </ul>
                       </div>
                   </div>
               </div>
           </div>
       </div>

        {/* Content Tabs */}
       <div className="px-6 lg:px-12 py-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
                 <div className="flex gap-8 border-b border-gray-200 mb-6">
                     {["Overview", "Curriculum", "Instructor", "Reviews"].map(tab => (
                         <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-4 font-bold text-sm ${activeTab === tab ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-500 hover:text-gray-800"}`}
                         >
                             {tab}
                         </button>
                     ))}
                 </div>

                 {/* Curriculum Content */}
                 <div className="space-y-6">
                     <h3 className="text-2xl font-bold">Course Curriculum</h3>
                     <div className="space-y-4">
                         {[
                             { title: "Module 1: Introduction to AI", lessons: 4, time: "45m" },
                             { title: "Module 2: Python for Data Science", lessons: 8, time: "2h 10m" },
                             { title: "Module 3: Neural Networks Basics", lessons: 6, time: "1h 30m" },
                             { title: "Module 4: Deep Learning with TensorFlow", lessons: 10, time: "3h 15m" },
                             { title: "Module 5: Final Project", lessons: 2, time: "5h 00m" },
                         ].map((module, i) => (
                             <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                                 <div className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors">
                                     <div className="flex items-center gap-3">
                                         <span className="text-gray-400">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                         </span>
                                         <span className="font-bold text-gray-800">{module.title}</span>
                                     </div>
                                     <span className="text-xs text-gray-500">{module.lessons} lessons • {module.time}</span>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
                 
                 {/* Instructor Bio */}
                 <div className="mt-12">
                     <h3 className="text-2xl font-bold mb-6">Instructor</h3>
                     <div className="flex gap-6 items-start">
                         <div className="w-24 h-24 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden relative">
                             <img src="https://i.pravatar.cc/150?u=a042581f4e29026024d" className="absolute inset-0 w-full h-full object-cover" />
                         </div>
                         <div>
                             <h4 className="text-xl font-bold">Dr. Sarah Miller</h4>
                             <p className="text-indigo-600 font-medium mb-2">PhD in Computer Science, AI Researcher</p>
                             <div className="flex gap-4 text-xs text-gray-500 mb-4">
                                 <span>★ 4.8 Rating</span>
                                 <span>• 12,050 Students</span>
                                 <span>• 5 Courses</span>
                             </div>
                             <p className="text-gray-600 leading-relaxed text-sm">
                                 Dr. Sarah Miller is a leading researcher in Artificial Intelligence and Machine Learning. 
                                 She has over 10 years of experience teaching at top universities and has helped thousands of students launch their careers in Data Science.
                             </p>
                         </div>
                     </div>
                 </div>
            </div>
       </div>
    </div>
  );
}
