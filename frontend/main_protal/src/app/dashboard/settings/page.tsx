"use client";
import React, { useState } from 'react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("Profile");
  const [highContrast, setHighContrast] = useState(false);
  const [screenReader, setScreenReader] = useState(true);

  const tabs = ["Profile", "Security", "Notifications", "Accessibility", "Billing"];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Account Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your profile and preferences.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-200 dark:border-gray-700">
         {tabs.map(tab => (
             <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === tab 
                    ? "bg-white dark:bg-gray-800 text-indigo-600 border-b-2 border-indigo-600" 
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
             >
                {tab}
             </button>
         ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm min-h-[400px]">
          {activeTab === "Accessibility" && (
              <div className="max-w-xl space-y-8 animate-fadeIn">
                  <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Accessibility Preferences</h3>
                      <p className="text-sm text-gray-500 mb-6">Customize your experience to meet your needs.</p>
                  </div>
                  
                  <div className="space-y-6">
                      <div className="flex items-center justify-between">
                          <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">Screen Reader Optimization</h4>
                              <p className="text-xs text-gray-500">Adds extra ARIA labels and simplified structure.</p>
                          </div>
                          <button 
                            onClick={() => setScreenReader(!screenReader)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${screenReader ? "bg-indigo-600" : "bg-gray-300"}`}
                          >
                              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${screenReader ? "left-7" : "left-1"}`}></span>
                          </button>
                      </div>

                       <div className="flex items-center justify-between">
                          <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">High Contrast Mode</h4>
                              <p className="text-xs text-gray-500">Increases contrast for better visibility.</p>
                          </div>
                          <button 
                            onClick={() => setHighContrast(!highContrast)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${highContrast ? "bg-indigo-600" : "bg-gray-300"}`}
                          >
                              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${highContrast ? "left-7" : "left-1"}`}></span>
                          </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                          <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">Reduce Motion</h4>
                              <p className="text-xs text-gray-500">Minimizes animations and transitions.</p>
                          </div>
                          <button className="w-12 h-6 rounded-full bg-gray-300 relative">
                              <span className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"></span>
                          </button>
                      </div>
                  </div>
              </div>
          )}

           {activeTab === "Profile" && (
                <div className="flex items-start gap-8">
                     <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-4xl font-bold text-indigo-600 border-4 border-white shadow-lg">
                         YM
                     </div>
                     <div className="flex-1 space-y-4 max-w-md">
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">First Name</label>
                                 <input type="text" defaultValue="Yohan" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                             </div>
                              <div>
                                 <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Last Name</label>
                                 <input type="text" defaultValue="Manohara" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                             </div>
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Email</label>
                             <input type="email" defaultValue="yohan@example.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                         </div>
                         <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">Save Changes</button>
                     </div>
                </div>
           )}

            {activeTab !== "Accessibility" && activeTab !== "Profile" && (
                  <div className="text-center py-12 text-gray-400">
                      <p>Settings for <strong>{activeTab}</strong> would go here.</p>
                  </div>
            )}
      </div>
    </div>
  );
}
