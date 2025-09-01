'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface DeploymentProps {
  assistantId?: string;
}

export const Deployment: React.FC<DeploymentProps> = ({ assistantId }) => {
  const [settings, setSettings] = useState({
    environment: 'development',
    customDomain: '',
    useCustomDomain: false,
    deploymentRegion: 'us-east-1',
    scaleAutomatically: true,
    minInstances: 1,
    maxInstances: 5,
    deployToProduction: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    const newValue = type === 'checkbox' 
      ? checked 
      : type === 'number' 
        ? parseInt(value, 10) 
        : value;
    
    setSettings(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  const saveSettings = () => {
    // In a real app, you would save this to your backend
    console.log('Saving deployment settings:', settings);
    
    // Show a notification
    alert('Deployment settings updated successfully');
  };

  const deployAssistant = () => {
    // This would trigger the deployment process in a real app
    console.log('Deploying assistant:', assistantId, 'to', settings.environment);
    
    // Show a notification
    alert(`Assistant is being deployed to ${settings.environment} environment. This may take a few minutes.`);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-white/[0.03] dark:border-gray-800 overflow-auto min-h-[42rem]">
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Deployment</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Environment
          </label>
          <select
            name="environment"
            value={settings.environment}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="development">Development</option>
            <option value="staging">Staging</option>
            <option value="production">Production</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Select the environment where you want to deploy this assistant
          </p>
        </div>
        
        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">Use Custom Domain</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Deploy to your own domain instead of the default subdomain
            </p>
          </div>
          <div className="relative inline-block w-12 h-6 rounded-full cursor-pointer">
            <input 
              type="checkbox"
              id="useCustomDomain"
              name="useCustomDomain"
              checked={settings.useCustomDomain}
              onChange={handleChange}
              className="sr-only"
            />
            <div 
              className={`w-full h-full rounded-full transition-colors duration-200 ease-in-out ${
                settings.useCustomDomain ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            ></div>
            <div 
              className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200 ease-in-out ${
                settings.useCustomDomain ? 'translate-x-6' : 'translate-x-0'
              }`}
            ></div>
          </div>
        </div>
        
        {settings.useCustomDomain && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Custom Domain
            </label>
            <input
              type="text"
              name="customDomain"
              value={settings.customDomain}
              onChange={handleChange}
              placeholder="assistant.yourdomain.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              You&apos;ll need to configure DNS records for your domain after deployment
            </p>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Deployment Region
          </label>
          <select
            name="deploymentRegion"
            value={settings.deploymentRegion}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="us-east-1">US East (N. Virginia)</option>
            <option value="us-west-1">US West (N. California)</option>
            <option value="eu-central-1">EU (Frankfurt)</option>
            <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
            <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Choose the region closest to your users for better performance
          </p>
        </div>
        
        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">Auto-scaling</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Automatically scale instances based on traffic
            </p>
          </div>
          <div className="relative inline-block w-12 h-6 rounded-full cursor-pointer">
            <input 
              type="checkbox"
              id="scaleAutomatically"
              name="scaleAutomatically"
              checked={settings.scaleAutomatically}
              onChange={handleChange}
              className="sr-only"
            />
            <div 
              className={`w-full h-full rounded-full transition-colors duration-200 ease-in-out ${
                settings.scaleAutomatically ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            ></div>
            <div 
              className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200 ease-in-out ${
                settings.scaleAutomatically ? 'translate-x-6' : 'translate-x-0'
              }`}
            ></div>
          </div>
        </div>
        
        {settings.scaleAutomatically && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Instances
              </label>
              <input
                type="number"
                name="minInstances"
                value={settings.minInstances}
                onChange={handleChange}
                min="1"
                max="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Instances
              </label>
              <input
                type="number"
                name="maxInstances"
                value={settings.maxInstances}
                onChange={handleChange}
                min={settings.minInstances}
                max="20"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
        )}
        
        {settings.environment === 'production' && (
          <div className="flex items-center p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg">
            <input
              type="checkbox"
              id="deployToProduction"
              name="deployToProduction"
              checked={settings.deployToProduction}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="deployToProduction" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              I confirm that I want to deploy to production
            </label>
          </div>
        )}
      </div>
      
      {/* Deploy Button */}
      <div className="flex justify-start mt-8 space-x-4">
        <button 
          onClick={deployAssistant}
          disabled={settings.environment === 'production' && !settings.deployToProduction}
          className={`px-5 py-2.5 font-medium rounded-lg ${
            settings.environment === 'production' && !settings.deployToProduction
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
              : 'bg-indigo-500 text-white hover:bg-indigo-600 transition-colors focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-800'
          }`}
        >
          Deploy Assistant
        </button>
        
        <button 
          onClick={saveSettings}
          className="px-5 py-2.5 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors focus:ring-4 focus:ring-gray-200 dark:bg-transparent dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
        >
          Save Settings
        </button>
        
        <Link href={`/assistant/customize?id=${assistantId}&tab=dashboard`}>
          <button className="px-5 py-2.5 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors focus:ring-4 focus:ring-gray-200 dark:bg-transparent dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700">
            Cancel
          </button>
        </Link>
      </div>
    </div>
  );
};

export default Deployment;