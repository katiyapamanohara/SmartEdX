'use client';

import React from 'react';
import Image from 'next/image';

interface ChatBotSettings {
  name: string;
  avatarUrl?: string;
  language?: string;
  description?: string;
  primaryColor?: string;
  welcomeMessage?: string;
  [key: string]: string | boolean | number | File | null | undefined;
}

interface GeneralTabProps {
  settings: ChatBotSettings;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onImageChange: (file: File | null) => void;
}

export const GeneralTab: React.FC<GeneralTabProps> = ({ settings, onChange, onImageChange }) => {
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageChange(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          ChatBot Name
        </label>
        <p className="text-xs text-gray-500 mb-2">What name will your chatbot go by.</p>
        <input
          type="text"
          name="name"
          value={settings.name}
          onChange={onChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Image
        </label>
        <p className="text-xs text-gray-500 mb-2">An optional image that will be displayed in your chatbots list.</p>
        <div className="flex items-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center">
              {settings.avatarUrl ? (
                <Image 
                  src={settings.avatarUrl} 
                  alt="ChatBot avatar" 
                  width={64} 
                  height={64} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-blue-500">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
                    <path d="M12,2A10,10,0,0,0,2,12a9.89,9.89,0,0,0,2.26,6.33l-2,2a1,1,0,0,0-.21,1.09A1,1,0,0,0,3,22h9A10,10,0,0,0,12,2Zm0,18H5.41l.93-.93a1,1,0,0,0,.3-.71,1,1,0,0,0-.3-.7A8,8,0,1,1,12,20Z"></path>
                  </svg>
                </div>
              )}
            </div>
          </div>
          <div className="ml-5">
            <div className="flex items-center">
              <span className="text-sm text-gray-500">Recommended size: 250x250px</span>
            </div>
            <button
              type="button"
              className="mt-1 flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              onClick={() => document.getElementById('avatar-upload')?.click()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
              </svg>
              Change Image
            </button>
            <input
              id="avatar-upload"
              name="avatarUrl"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Languages
        </label>
        <p className="text-xs text-gray-500 mb-2">Select language</p>
        <div className="relative">
          <select
            name="language"
            value={settings.language}
            onChange={onChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 appearance-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="en">English (English)</option>
            <option value="es">Spanish (Español)</option>
            <option value="fr">French (Français)</option>
            <option value="de">German (Deutsch)</option>
            <option value="ja">Japanese (日本語)</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
            <svg className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
            </svg>
          </div>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <p className="text-xs text-gray-500 mb-2">Description about your chatbot</p>
        <textarea
          name="description"
          value={settings.description}
          onChange={onChange}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>
    </div>
  );
};

export default GeneralTab;