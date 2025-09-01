'use client';

import React, { useState } from 'react';

interface AuthenticationProps {
  assistantId?: string;
}

export const Authentication: React.FC<AuthenticationProps> = () => {
  const [endpoint, setEndpoint] = useState<string>('');
  const [method, setMethod] = useState<string>('POST');
  const [queryParams, setQueryParams] = useState<Array<{ key: string; value: string }>>([
    { key: '', value: '' }
  ]);
  const [body, setBody] = useState<string>('');

  // Add a new empty row to the query parameters
  const addQueryParam = () => {
    setQueryParams([...queryParams, { key: '', value: '' }]);
  };

  // Handle changes in the query parameter inputs
  const handleQueryParamChange = (index: number, field: 'key' | 'value', value: string) => {
    const updatedParams = [...queryParams];
    updatedParams[index][field] = value;
    setQueryParams(updatedParams);
  };

  // Remove a query parameter row
  const removeQueryParam = (index: number) => {
    const updatedParams = [...queryParams];
    updatedParams.splice(index, 1);
    setQueryParams(updatedParams);
  };

  const handleSubmit = () => {
    // Form submission logic here
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-white/[0.03] dark:border-gray-800 overflow-auto min-h-[42rem]">
      <div className="space-y-6">
        {/* Endpoint Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Endpoint
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            An API key for the selected AI Model
          </p>
          <input
            type="text"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="https://articom.com/v1/chat/completions"
          />
        </div>

        {/* Method Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Method
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            An API key for the selected AI Model
          </p>
          <div className="relative">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white appearance-none pr-8"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Query Parameters Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Query Params
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            An API key for the selected AI Model
          </p>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="w-1/2 text-left py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">Key</th>
                  <th className="w-1/2 text-left py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">Value</th>
                  <th className="w-10 text-center py-2 px-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700"></th>
                </tr>
              </thead>
              <tbody>
                {queryParams.map((param, index) => (
                  <tr key={index} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={param.key}
                        onChange={(e) => handleQueryParamChange(index, 'key', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={param.value}
                        onChange={(e) => handleQueryParamChange(index, 'value', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      {queryParams.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQueryParam(index)}
                          className="inline-flex items-center justify-center w-6 h-6 text-red-500 hover:text-red-700 focus:outline-none"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <button 
                type="button"
                onClick={addQueryParam}
                className="inline-flex items-center px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-100 rounded-md hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Parameter
              </button>
            </div>
          </div>
        </div>

        {/* Body Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Body
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            An API key for the selected AI Model
          </p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="{}"
          ></textarea>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-start mt-8">
        <button
          type="button" 
          onClick={handleSubmit}
          className="px-5 py-2.5 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-colors focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-800"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Authentication;