import React, { useState, useEffect } from 'react';
import { useLLMModels } from '@/hooks/useLLMModels';
import type { LLMModel } from '@/types/llm';

interface AIModelTabProps {
  parameters?: {
    model: string;
    apiKey?: string;
  };
  handleParameterChange?: (field: string, value: string) => void;
  models?: LLMModel[]; // Allow models to be passed from parent
  modelsLoading?: boolean; // Allow loading state to be passed from parent
  modelsError?: string | null; // Allow error state to be passed from parent
}

const AIModelTab: React.FC<AIModelTabProps> = ({
  parameters = { model: '', apiKey: '' },
  handleParameterChange = () => { },
  models: propModels,
  modelsLoading: propModelsLoading,
  modelsError: propModelsError
}) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<null | 'success' | 'error'>(null);

  // Fetch LLM models from backend only if not provided by parent
  const {
    models: hookModels,
    loading: hookModelsLoading,
    error: hookModelsError
  } = useLLMModels();

  // Use models from props if available, otherwise use hook
  const models = propModels || hookModels;
  const modelsLoading = propModelsLoading !== undefined ? propModelsLoading : hookModelsLoading;
  const modelsError = propModelsError !== undefined ? propModelsError : hookModelsError;

  // Update selected model when parameters change
  useEffect(() => {
    setSelectedModel(parameters.model);
  }, [parameters.model]);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const model = e.target.value;
    setSelectedModel(model);
    handleParameterChange('model', model);
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleParameterChange('apiKey', e.target.value);
    // Reset verification status when API key changes
    setVerificationStatus(null);
  };

  const verifyApiKey = () => {
    // Mock API key verification
    setIsVerifying(true);
    setTimeout(() => {
      // In a real implementation, this would make an API call to verify the key
      const isValidKey = parameters.apiKey && parameters.apiKey.length > 10;
      setVerificationStatus(isValidKey ? 'success' : 'error');
      setIsVerifying(false);
    }, 1000);
  };

  return (
    <div>
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">Model Settings</h3>
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
            <div>
              <label htmlFor="modelSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                AI Model
              </label>
              <select
                id="modelSelect"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
                value={selectedModel}
                onChange={handleModelChange}
                disabled={modelsLoading}
              >
                <option value="" disabled>Select a model...</option>
                {modelsLoading && <option value="">Loading models...</option>}
                {modelsError && <option value="">Error loading models</option>}
                {!modelsLoading && !modelsError && models.length === 0 && (
                  <option value="">No models available</option>
                )}
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.id} - {model.name}
                  </option>
                ))}
                <option value="custom">Custom API</option>
              </select>
              {modelsError && (
                <p className="mt-1 text-xs text-red-500">
                  Failed to load models: {modelsError}
                </p>
              )}
            </div>

            {selectedModel === 'custom' && (
              <div className="mt-3">
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="customModel"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Custom Model
                  </label>
                </div>
                <input
                  type="text"
                  id="customModel"
                  placeholder="Enter model identifier (e.g., gpt-4, llama-2-13b)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
                />

                <div className="mt-3">
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="apiKey"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      API Key
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-xs text-indigo-600 hover:text-indigo-500"
                    >
                      {showApiKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      id="apiKey"
                      placeholder="Enter your API key"
                      value={parameters.apiKey || ''}
                      onChange={handleApiKeyChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white text-sm
                        ${verificationStatus === 'success' ? 'border-green-500 dark:border-green-500' :
                          verificationStatus === 'error' ? 'border-red-500 dark:border-red-500' :
                            'border-gray-300 dark:border-gray-700'}`}
                    />
                    <button
                      type="button"
                      onClick={verifyApiKey}
                      disabled={isVerifying || !parameters.apiKey}
                      className={`absolute right-2 top-1/2 transform -translate-y-1/2 text-xs py-1 px-2 rounded
                        ${isVerifying ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                    >
                      {isVerifying ? 'Verifying...' : 'Verify Key'}
                    </button>
                  </div>

                  {verificationStatus === 'success' && (
                    <p className="mt-1 text-xs text-green-500">
                      API key verified successfully
                    </p>
                  )}
                  {verificationStatus === 'error' && (
                    <p className="mt-1 text-xs text-red-500">
                      Invalid API key. Please check and try again.
                    </p>
                  )}
                  {!verificationStatus && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Your API key is securely stored and never shared
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIModelTab;