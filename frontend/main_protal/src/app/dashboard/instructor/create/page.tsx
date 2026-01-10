"use client";
import React, { useState } from 'react';
import Link from 'next/link';

export default function CreateCoursePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
      title: "",
      category: "",
      description: "",
      aiProctoring: false,
      autoGrading: true,
      adaptiveLearning: false
  });

  const steps = [
      { id: 1, title: "Basic Info", icon: "📝" },
      { id: 2, title: "Curriculum", icon: "📚" },
      { id: 3, title: "AI Settings", icon: "🤖" },
      { id: 4, title: "Review", icon: "✅" }
  ];

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="max-w-4xl mx-auto p-6 md:py-12">
        <div className="mb-8">
            <Link href="/dashboard/instructor" className="text-gray-500 hover:text-gray-900 text-sm flex items-center gap-1 mb-4">
                ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create New Course</h1>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between items-center mb-12 relative">
             <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 rounded-full"></div>
             <div className="absolute top-1/2 left-0 h-1 bg-indigo-600 -z-10 rounded-full transition-all duration-500" style={{ width: `${((currentStep - 1) / 3) * 100}%` }}></div>
             
             {steps.map((step) => (
                 <div key={step.id} className="flex flex-col items-center gap-2 bg-white dark:bg-gray-900 px-2">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold transition-all ${
                         currentStep >= step.id 
                         ? "bg-indigo-600 border-indigo-600 text-white" 
                         : "bg-white border-gray-300 text-gray-400"
                     }`}>
                         {currentStep > step.id ? "✓" : step.id}
                     </div>
                     <span className={`text-xs font-semibold ${currentStep >= step.id ? "text-indigo-600" : "text-gray-400"}`}>
                         {step.title}
                     </span>
                 </div>
             ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 min-h-[400px]">
            
            {/* STEP 1: Basic Info */}
            {currentStep === 1 && (
                <div className="space-y-6 animate-fadeIn">
                    <h2 className="text-xl font-bold mb-4">Course Basics</h2>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Course Title</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="e.g. Advanced Machine Learning"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                             <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                             <select 
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                value={formData.category}
                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                             >
                                 <option value="">Select a category...</option>
                                 <option value="cs">Computer Science</option>
                                 <option value="business">Business</option>
                                 <option value="design">Design</option>
                             </select>
                        </div>
                        <div>
                             <label className="block text-sm font-bold text-gray-700 mb-2">Level</label>
                             <select className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                 <option>Beginner</option>
                                 <option>Intermediate</option>
                                 <option>Advanced</option>
                             </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                        <textarea 
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none"
                            placeholder="What will students learn in this course?"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        ></textarea>
                    </div>

                    <div>
                         <label className="block text-sm font-bold text-gray-700 mb-2">Course Thumbnail</label>
                         <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer group">
                             <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">🖼️</div>
                             <p className="text-sm font-medium text-gray-600">Click to upload or drag and drop</p>
                             <p className="text-xs text-gray-400">SVG, PNG, JPG or GIF (max. 800x400px)</p>
                         </div>
                    </div>
                </div>
            )}

            {/* STEP 2: Curriculum */}
            {currentStep === 2 && (
                 <div className="space-y-6 animate-fadeIn">
                     <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">Curriculum Builder</h2>
                        <button className="text-indigo-600 font-bold text-sm bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100">
                            + Add Module
                        </button>
                     </div>

                     <div className="space-y-4">
                         {/* Mock Module */}
                         <div className="border border-gray-200 rounded-xl overflow-hidden">
                             <div className="bg-gray-50 p-4 flex justify-between items-center border-b border-gray-100">
                                 <div className="font-bold flex items-center gap-2">
                                     <span className="text-gray-400">::</span>
                                     Module 1: Introduction
                                 </div>
                                 <div className="flex gap-2">
                                     <button className="p-1 hover:bg-gray-200 rounded">✏️</button>
                                     <button className="p-1 hover:bg-gray-200 rounded">🗑️</button>
                                 </div>
                             </div>
                             <div className="p-4 bg-white space-y-3">
                                 <div className="flex items-center gap-3 pl-4 text-sm text-gray-600">
                                     <span className="text-gray-300">└</span>
                                     <span>🎥 Video: Welcome to the course</span>
                                 </div>
                                  <div className="flex items-center gap-3 pl-4 text-sm text-gray-600">
                                     <span className="text-gray-300">└</span>
                                     <span>📄 Reading: Course Prerequisites</span>
                                 </div>
                                 <button className="ml-8 text-xs font-bold text-indigo-600 hover:underline">+ Add Lesson</button>
                             </div>
                         </div>
                         
                         <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center text-gray-400 text-sm">
                             Drag and drop modules to reorder
                         </div>
                     </div>
                 </div>
            )}

            {/* STEP 3: AI Settings */}
            {currentStep === 3 && (
                <div className="space-y-6 animate-fadeIn">
                    <h2 className="text-xl font-bold mb-6">AI Capabilities Configuration</h2>
                    <p className="text-gray-500 mb-8">Enable advanced AI features to enhance your course.</p>

                    <div className="space-y-6">
                        <label className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900">AI Exam Proctoring</h3>
                                <p className="text-sm text-gray-500">Enable webcam and screen monitoring with real-time anomaly detection for exams.</p>
                            </div>
                            <input 
                                type="checkbox" 
                                className="w-6 h-6 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                checked={formData.aiProctoring}
                                onChange={(e) => setFormData({...formData, aiProctoring: e.target.checked})}
                            />
                        </label>

                         <label className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900">Automated AI Grading</h3>
                                <p className="text-sm text-gray-500">Use NLP to automatically grade essay questions and coding assignments with detailed feedback.</p>
                            </div>
                            <input 
                                type="checkbox" 
                                className="w-6 h-6 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                checked={formData.autoGrading}
                                onChange={(e) => setFormData({...formData, autoGrading: e.target.checked})}
                            />
                        </label>

                         <label className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900">Adaptive Learning Path</h3>
                                <p className="text-sm text-gray-500">Allow AI to dynamically adjust the curriculum based on student performance in quizzes.</p>
                            </div>
                            <input 
                                type="checkbox" 
                                className="w-6 h-6 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                checked={formData.adaptiveLearning}
                                onChange={(e) => setFormData({...formData, adaptiveLearning: e.target.checked})}
                            />
                        </label>
                    </div>
                </div>
            )}

            {/* STEP 4: Review */}
            {currentStep === 4 && (
                <div className="space-y-6 animate-fadeIn text-center py-8">
                     <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
                         🚀
                     </div>
                     <h2 className="text-2xl font-bold text-gray-900">Ready to Publish!</h2>
                     <p className="text-gray-500 max-w-md mx-auto mb-8">
                         Your course <strong>"{formData.title || 'Untitled Course'}"</strong> is ready to be shared with the world.
                     </p>

                     <div className="bg-gray-50 p-6 rounded-xl text-left max-w-lg mx-auto mb-8 space-y-3">
                         <div className="flex justify-between">
                             <span className="text-gray-500">AI Proctoring:</span>
                             <span className="font-bold">{formData.aiProctoring ? "Enabled" : "Disabled"}</span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-gray-500">Auto Grading:</span>
                             <span className="font-bold">{formData.autoGrading ? "Enabled" : "Disabled"}</span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-gray-500">Adaptive Learning:</span>
                             <span className="font-bold">{formData.adaptiveLearning ? "Enabled" : "Disabled"}</span>
                         </div>
                     </div>
                </div>
            )}
        </div>

        {/* Footer Navigation */}
        <div className="flex justify-between mt-8">
            <button 
                onClick={handleBack}
                disabled={currentStep === 1}
                className={`px-6 py-3 font-bold rounded-xl transition-colors ${currentStep === 1 ? "opacity-0 pointer-events-none" : "text-gray-600 hover:bg-gray-100"}`}
            >
                Back
            </button>
            <button 
                onClick={currentStep === 4 ? () => alert("Course Published!") : handleNext}
                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1"
            >
                {currentStep === 4 ? "Publish Course" : "Next Step →"}
            </button>
        </div>
    </div>
  );
}
