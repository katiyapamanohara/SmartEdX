import React from "react";

interface CommonTabProps {
  language: string;
  description?: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => void;
}

const CommonTab: React.FC<CommonTabProps> = ({ language, description, onChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Languages
        </label>
        <p className="text-xs text-gray-500 mb-2">Select language</p>
        <div className="relative">
          <select
            name="language"
            value={language}
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
          value={description}
          onChange={onChange}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>
    </div>
  );
};

export default CommonTab;