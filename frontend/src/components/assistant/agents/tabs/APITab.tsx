'use client';

import React, { useState } from 'react';

interface ApiConfig {
  id: string;
  title: string;
  description: string;
  endpoint: string;
  method: string;
  authorization: string;
  authToken?: string;
  body?: string;
}

interface APITabProps {
  integration: {
    endpoint: string;
    apiKey: string;
    isEnabled: boolean;
  };
  handleIntegrationChange: (field: string, value: string | boolean) => void;
}

const APITab = ({
  integration,
  handleIntegrationChange
}: APITabProps) => {
  const [isCreateSectionOpen, setIsCreateSectionOpen] = useState(false);
  const [currentApi, setCurrentApi] = useState<ApiConfig | null>(null);
  const [apis, setApis] = useState<ApiConfig[]>([
    {
      id: '1',
      title: 'Doctors',
      description: 'Start fresh and build a fully customized chatbot tailored to your unique needs—perfect for full control and creativity.',
      endpoint: '/api/doctors',
      method: 'GET',
      authorization: 'JWT',
      authToken: '',
    },
    {
      id: '2',
      title: 'Available Doctors',
      description: 'Start fresh and build a fully customized chatbot tailored to your unique needs—perfect for full control and creativity.',
      endpoint: '/api/doctors/available',
      method: 'GET',
      authorization: 'JWT',
      authToken: '',
    },
    {
      id: '3',
      title: 'Search by name',
      description: 'Start fresh and build a fully customized chatbot tailored to your unique needs—perfect for full control and creativity.',
      endpoint: '/api/doctors/search',
      method: 'GET',
      authorization: 'JWT',
      authToken: '',
    },
    {
      id: '4',
      title: 'Search doctor by hospital',
      description: 'Start fresh and build a fully customized chatbot tailored to your unique needs—perfect for full control and creativity.',
      endpoint: '/api/doctors/hospital',
      method: 'GET',
      authorization: 'JWT',
      authToken: '',
    },
  ]);

  const [formData, setFormData] = useState<ApiConfig>({
    id: '',
    title: '',
    description: '',
    endpoint: '',
    method: 'GET',
    authorization: 'JWT',
    authToken: '',
    body: '',
  });

  const handleCreateApiClick = () => {
    setCurrentApi(null);
    setFormData({
      id: '',
      title: '',
      description: '',
      endpoint: '',
      method: 'GET',
      authorization: 'JWT',
      authToken: '',
      body: '',
    });
    setIsCreateSectionOpen(true);
  };

  const handleEditApi = (api: ApiConfig) => {
    setCurrentApi(api);
    setFormData(api);
    setIsCreateSectionOpen(true);
  };

  const handleDeleteApi = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the card click event from triggering
    setApis(apis.filter(api => api.id !== id));
  };

  const handleInputChange = (field: keyof ApiConfig, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveApi = () => {
    if (currentApi) {
      // Edit existing API
      setApis(apis.map(api => api.id === currentApi.id ? formData : api));
    } else {
      // Create new API
      const newApi = {
        ...formData,
        id: Date.now().toString(),
      };
      setApis([...apis, newApi]);
    }
    setIsCreateSectionOpen(false);
  };

  const handleCancelEdit = () => {
    setIsCreateSectionOpen(false);
    setCurrentApi(null);
  };

  // Render the form for creating/editing APIs
  const renderForm = () => {
    if (!isCreateSectionOpen) return null;
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8 animate-fadeIn">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          {currentApi ? 'Edit API' : 'Create New API'}
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              placeholder="API Title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea 
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              rows={3}
              placeholder="API Description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
            ></textarea>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Endpoint
            </label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              placeholder="API Endpoint (e.g. /api/doctors)"
              value={formData.endpoint}
              onChange={(e) => {
                handleInputChange('endpoint', e.target.value);
                handleIntegrationChange('endpoint', e.target.value);
              }}
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="w-1/3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Authorization
              </label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                value={formData.authorization}
                onChange={(e) => handleInputChange('authorization', e.target.value)}
              >
                <option value="JWT">JWT</option>
                <option value="API Key">API Key</option>
                <option value="OAuth">OAuth</option>
                <option value="None">None</option>
              </select>
            </div>
            
            <div className="w-2/3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                &nbsp;
              </label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                placeholder="Authorization token"
                value={formData.authorization === 'API Key' ? integration.apiKey : formData.authToken || ''}
                onChange={(e) => {
                  if (formData.authorization === 'API Key') {
                    handleIntegrationChange('apiKey', e.target.value);
                  }
                  handleInputChange('authToken', e.target.value);
                }}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Method
            </label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              value={formData.method}
              onChange={(e) => handleInputChange('method', e.target.value)}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Body
            </label>
            <textarea 
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm font-mono"
              rows={5}
              placeholder={`{
  "key": "value"
}`}
              value={formData.body || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('body', e.target.value)}
            />
          </div>
        </div>
        
        <div className="mt-8 flex justify-end space-x-4">
          <button 
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-gray-300 dark:border-gray-600 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            onClick={handleCancelEdit}
          >
            Cancel
          </button>
          <button 
            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-800"
            onClick={handleSaveApi}
          >
            {currentApi ? 'Save Changes' : 'Add API'}
          </button>
        </div>
      </div>
    );
  };

  // Render the API cards
  const renderApiCards = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {apis.map((api) => (
          <div key={api.id} className="relative border border-indigo-100 dark:border-indigo-900/30 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors cursor-pointer" onClick={() => handleEditApi(api)}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{api.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {api.description}
              </p>
              {/* Delete button */}
              <button
                onClick={(e) => handleDeleteApi(api.id, e)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                aria-label="Delete API"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="mb-8" onClick={handleCreateApiClick}>
        <div className="flex justify-center items-center h-24 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">+ Add an API</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Start fresh and build a fully customized chatbot tailored to your unique needs—perfect for full control and creativity.
            </p>
          </div>
        </div>
      </div>
      
      {renderForm()}
      {renderApiCards()}
    </div>
  );
};

export default APITab;