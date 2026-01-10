"use client";
import React, { useState } from 'react';

export default function AssessmentsPage() {
  const [examStarted, setExamStarted] = useState(false);
  const [systemCheck, setSystemCheck] = useState({
      webcam: false,
      mic: false,
      screen: false,
      browser: true
  });

  const startSystemCheck = () => {
      // Simulate checks
      setTimeout(() => setSystemCheck(prev => ({...prev, webcam: true})), 1000);
      setTimeout(() => setSystemCheck(prev => ({...prev, mic: true})), 2000);
      setTimeout(() => setSystemCheck(prev => ({...prev, screen: true})), 3000);
  };

  const allChecksPassed = Object.values(systemCheck).every(Boolean);

  if (examStarted) {
      return (
          <div className="fixed inset-0 bg-gray-900 z-[100] flex flex-col text-white">
              {/* Exam Header */}
              <div className="h-16 bg-gray-800 flex items-center justify-between px-6 border-b border-gray-700">
                  <div className="font-bold text-lg">Mid-Term: Advanced Algorithms</div>
                  <div className="flex items-center gap-4">
                      <div className="text-red-400 flex items-center gap-2">
                          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                          Recording
                      </div>
                      <div className="font-mono text-xl">01:29:55</div>
                  </div>
                  <button onClick={() => setExamStarted(false)} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm mb-auto mt-auto">
                      Submit Exam
                  </button>
              </div>

              {/* Exam Layout */}
              <div className="flex-1 flex overflow-hidden">
                  <div className="flex-1 p-8 overflow-y-auto">
                      <div className="max-w-4xl mx-auto bg-white text-gray-900 p-8 rounded-lg shadow-lg min-h-screen">
                          <h2 className="text-2xl font-bold mb-6">Question 1</h2>
                          <p className="mb-4 text-lg">Explain the time complexity differences between QuickSort and MergeSort in the worst-case scenario. When would you prefer one over the other?</p>
                          <textarea className="w-full h-64 border border-gray-300 rounded p-4 font-mono focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Type your answer here..."></textarea>
                          
                          <div className="flex justify-between mt-8">
                              <button className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50">Previous</button>
                              <button className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Next Question</button>
                          </div>
                      </div>
                  </div>

                  {/* Proctoring Sidebar */}
                  <div className="w-80 bg-gray-800 border-l border-gray-700 p-4 flex flex-col gap-4">
                      <div className="bg-black rounded-lg aspect-video mb-4 relative overflow-hidden border border-gray-600">
                           <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                               [Webcam Feed]
                           </div>
                           <div className="absolute bottom-2 left-2 flex gap-1">
                               <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                               <span className="text-[10px] text-green-500">AI Monitoring Active</span>
                           </div>
                      </div>
                       
                      <div className="space-y-2">
                          <h3 className="text-xs font-bold uppercase text-gray-500">AI Flags</h3>
                          <div className="bg-green-500/10 border border-green-500/20 p-3 rounded text-sm text-green-400">
                             No anomalies detected.
                          </div>
                      </div>

                      <div className="mt-auto">
                           <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded text-sm text-blue-400">
                              <p className="font-bold mb-1">Proctor Message:</p>
                              "Please keep your eyes on the screen."
                           </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Assessments & Exams</h1>
        <p className="text-gray-500 dark:text-gray-400">Upcoming exams and quizzes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Exam Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
               <div className="flex justify-between items-start mb-4">
                   <div>
                       <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase">Final Exam</span>
                       <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-2">Advanced Algorithms</h3>
                   </div>
                   <div className="text-center bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                       <span className="block text-xs text-gray-500">Duration</span>
                       <span className="block font-bold">90 min</span>
                   </div>
               </div>
               
               <div className="space-y-3 mb-6">
                   <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                       <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                       <span>Due: Today, 11:59 PM</span>
                   </div>
                   <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                       <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                       <span>AI Proctoring Enabled</span>
                   </div>
               </div>

               <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                   {!allChecksPassed ? (
                        <div className="space-y-4">
                            <h4 className="font-bold text-sm uppercase text-gray-500">System Check Required</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <CheckItem label="Webcam" status={systemCheck.webcam} />
                                <CheckItem label="Microphone" status={systemCheck.mic} />
                                <CheckItem label="Screen Share" status={systemCheck.screen} />
                                <CheckItem label="Browser" status={systemCheck.browser} />
                            </div>
                            <button onClick={startSystemCheck} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-indigo-600 transition-colors">
                                Run System Check
                            </button>
                        </div>
                   ) : (
                       <button onClick={() => setExamStarted(true)} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors animate-pulse">
                           Start Exam
                       </button>
                   )}
               </div>
          </div>
      </div>
    </div>
  );
}

function CheckItem({ label, status }: { label: string, status: boolean }) {
    return (
        <div className={`flex items-center gap-2 p-2 rounded border ${status ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
            {status ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : (
                <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
            )}
            <span className="text-sm font-medium">{label}</span>
        </div>
    )
}
