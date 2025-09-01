'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { agentService } from '@/services/agentService';
import { useLLMModels } from '@/hooks/useLLMModels';
import type { APIAgent, AgentSettings } from '@/types/agent';
import AIModelTab from './tabs/AIModelTab';
import TrainTab from './tabs/TrainTab';
import APITab from './tabs/APITab';
import PromptsTab from './tabs/PromptsTab';

// Using React.FC without props
const AgentConfigureTab: React.FC = () => {
  const searchParams = useSearchParams();
  const assistantId = searchParams.get('id') || '';

  // Extract the full agent ID from the tab parameter
  const tabParam = searchParams.get('tab') || '';
  const agentId = tabParam.startsWith('agents-') ? tabParam.substring('agents-'.length) : '';

  // State for agent data fetched from API
  const [apiAgent, setApiAgent] = useState<APIAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load AI models
  const { models: llmModels, loading: modelsLoading, error: modelsError } = useLLMModels();

  // Fetch specific agent data
  useEffect(() => {
    const fetchAgentData = async () => {
      if (!assistantId || !agentId) {
        setError('Missing assistant ID or agent ID');
        setLoading(false);
        return;
      } try {
        setLoading(true);
        setError(null);

        // Directly fetch the specific agent using the single agent endpoint
        const response = await agentService.getAgentsByAssistant(assistantId, agentId);

        if (response.success && response.agents && response.agents.length > 0) {
          setApiAgent(response.agents[0]);
        } else {
          setError(response.message || 'Agent not found');
          setApiAgent(null);
        }
      } catch (err) {
        console.error('Failed to fetch agent data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch agent data');
      } finally {
        setLoading(false);
      }
    };

    fetchAgentData();
  }, [assistantId, agentId]);

  const workflowAgentID = apiAgent?.workflowAgentID;

  const [settings, setSettings] = useState<AgentSettings>({
    prompts: {
      systemPrompt: '',
      userPrompt: '',
      greetingMessage: '',
      errorMessage: '',
    },
    integration: {
      endpoint: '',
      apiKey: '',
      isEnabled: false,
    },
    parameters: {
      temperature: 0.7,
      maxTokens: 1024,
      model: 'gpt-4',
      apiKey: '',
    },
    training: {
      initialPrompt: '',
      instructions: [],
    }
  });

  const [activeTab, setActiveTab] = useState('aimodel');
  const [isSaving, setIsSaving] = useState(false);
  const [savedStatus, setSavedStatus] = useState('');  // Initialize default settings when component loads

  useEffect(() => {
    // Initialize default settings based on the agent data from API
    const defaultSettings: AgentSettings = {
      prompts: {
        systemPrompt: apiAgent?.systemPrompt || '',
        userPrompt: apiAgent?.defaultUserPrompt || 'How can I help you today?',
        greetingMessage: apiAgent?.greetingsMessage || '👋 Hello! I\'m your assistant. How can I help you today?',
        errorMessage: apiAgent?.errorMessage || 'I\'m sorry, I\'m having trouble processing your request. Please try again.',
      },
      integration: {
        endpoint: '',
        apiKey: '',
        isEnabled: apiAgent?.isEnabled ?? true,
      }, parameters: {
        temperature: 0.7,
        maxTokens: 1024,
        model: apiAgent?.aiModelID || '',
        apiKey: '',
      },
      training: {
        initialPrompt: apiAgent?.initialPrompt || '',
        instructions: [],
      }
    };
    setSettings(defaultSettings);
  }, [apiAgent, assistantId, workflowAgentID]);

  const handleSave = async () => {
    if (!workflowAgentID) {
      console.error('Agent resolution failed:', {
        agentId,
        apiAgent,
        workflowAgentID
      });
      setSavedStatus('Error: Unable to find agent ID for saving. Please refresh and try again.');
      setTimeout(() => setSavedStatus(''), 5000);
      return;
    }

    setIsSaving(true);
    setSavedStatus('');

    try {
      if (!workflowAgentID || workflowAgentID.length < 10) {
        throw new Error('Invalid workflow agent ID.');
      }
      const changedFields: Record<string, string | boolean> = {};

      // Compare integration status
      if (settings.integration.isEnabled !== apiAgent?.isEnabled) {
        changedFields.isEnabled = settings.integration.isEnabled;
      }

      // Compare AI model
      const currentModel = settings.parameters.model || '';
      const originalModel = apiAgent?.aiModelID || '';
      if (currentModel !== originalModel) {
        changedFields.aiModelID = settings.parameters.model;
      }

      // Compare prompts
      const currentSystemPrompt = settings.prompts.systemPrompt || '';
      const originalSystemPrompt = apiAgent?.systemPrompt || '';
      if (currentSystemPrompt !== originalSystemPrompt) {
        changedFields.systemPrompt = settings.prompts.systemPrompt;
      }

      const currentUserPrompt = settings.prompts.userPrompt || '';
      const originalUserPrompt = apiAgent?.defaultUserPrompt || '';
      if (currentUserPrompt !== originalUserPrompt) {
        changedFields.defaultUserPrompt = settings.prompts.userPrompt;
      }

      const currentGreetingMessage = settings.prompts.greetingMessage || '';
      const originalGreetingMessage = apiAgent?.greetingsMessage || '';
      if (currentGreetingMessage !== originalGreetingMessage) {
        changedFields.greetingsMessage = settings.prompts.greetingMessage;
      }

      const currentErrorMessage = settings.prompts.errorMessage || '';
      const originalErrorMessage = apiAgent?.errorMessage || '';
      if (currentErrorMessage !== originalErrorMessage) {
        changedFields.errorMessage = settings.prompts.errorMessage;
      }

      // Compare training
      const currentInitialPrompt = settings.training.initialPrompt || '';
      const originalInitialPrompt = apiAgent?.initialPrompt || '';
      if (currentInitialPrompt !== originalInitialPrompt) {
        changedFields.initialPrompt = settings.training.initialPrompt;
      }

      // If no fields changed, show message and return
      if (Object.keys(changedFields).length === 0) {
        setSavedStatus('No changes to save');
        setTimeout(() => setSavedStatus(''), 3000);
        setIsSaving(false);
        return;
      }

      try {
        // Update all changed fields
        await agentService.updateAgent(workflowAgentID, changedFields);
        setSavedStatus('Changes saved successfully');
      } catch (error) {
        console.error('Failed to update agent:', error);
        throw error;
      }

      // Clear the status message after 3 seconds
      setTimeout(() => {
        setSavedStatus('');
      }, 3000);

    } catch (error) {
      console.error('Failed to save agent settings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save changes';
      setSavedStatus(`Error: ${errorMessage}`);

      setTimeout(() => {
        setSavedStatus('');
      }, 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePromptChange = (field: string, value: string) => {
    setSettings((prev: AgentSettings) => ({
      ...prev,
      prompts: {
        ...prev.prompts,
        [field]: value
      }
    }));
  };

  const handleIntegrationChange = (field: string, value: string | boolean) => {
    setSettings((prev: AgentSettings) => ({
      ...prev,
      integration: {
        ...prev.integration,
        [field]: value
      }
    }));
  };

  const handleParameterChange = (field: string, value: string | number) => {
    setSettings((prev: AgentSettings) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [field]: value
      }
    }));
  };

  const handleTrainingChange = (field: string, value: string | string[]) => {
    setSettings((prev: AgentSettings) => ({
      ...prev,
      training: {
        ...prev.training,
        [field]: value
      }
    }));
  };

  const addInstruction = (instruction: string) => {
    if (instruction.trim()) {
      setSettings((prev: AgentSettings) => ({
        ...prev,
        training: {
          ...prev.training,
          instructions: [...prev.training.instructions, instruction.trim()]
        }
      }));
    }
  };

  const removeInstruction = (index: number) => {
    setSettings((prev: AgentSettings) => ({
      ...prev,
      training: {
        ...prev.training,
        instructions: prev.training.instructions.filter((_: string, i: number) => i !== index)
      }
    }));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-white/[0.03] dark:border-gray-800">      {(loading || modelsLoading) ? (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    ) : (error || modelsError) ? (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading data</p>
          <p className="text-gray-500 text-sm">{error || modelsError}</p>
        </div>
      </div>
    ) : !apiAgent ? (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-yellow-600 mb-2">Agent not found</p>
        </div>
      </div>
    ) : (
      <>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{apiAgent?.agentName || 'Agent'}</h2>
          <p className="text-gray-500 text-sm dark:text-gray-400 mt-1">{apiAgent?.description || 'No description available'}</p>
        </div>

        {/* Configuration Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-2">
            <button
              onClick={() => setActiveTab('aimodel')}
              className={`py-2 px-5 rounded-md text-sm font-medium ${activeTab === 'aimodel'
                ? 'bg-indigo-500 text-white'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
            >
              AI Model
            </button>
            <button
              onClick={() => setActiveTab('train')}
              className={`py-2 px-5 rounded-md text-sm font-medium ${activeTab === 'train'
                ? 'bg-indigo-500 text-white'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
            >
              Train
            </button>
            <button
              onClick={() => setActiveTab('apis')}
              className={`py-2 px-5 rounded-md text-sm font-medium ${activeTab === 'apis'
                ? 'bg-indigo-500 text-white'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
            >
              API
            </button>
            <button
              onClick={() => setActiveTab('prompts')}
              className={`py-2 px-5 rounded-md text-sm font-medium ${activeTab === 'prompts'
                ? 'bg-indigo-500 text-white'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
            >
              Prompts
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'aimodel' && (
            <AIModelTab
              parameters={{
                model: settings.parameters.model,
                apiKey: settings.parameters.apiKey
              }}
              handleParameterChange={handleParameterChange}
              models={llmModels}
              modelsLoading={false}
              modelsError={modelsError}
            />
          )}

          {activeTab === 'train' && (
            <TrainTab
              initialPrompt={settings.training.initialPrompt}
              instructions={settings.training.instructions}
              handleTrainingChange={handleTrainingChange}
              addInstruction={addInstruction}
              removeInstruction={removeInstruction}
            />
          )}

          {activeTab === 'apis' && (
            <APITab
              integration={settings.integration}
              handleIntegrationChange={handleIntegrationChange}
            />
          )}

          {activeTab === 'prompts' && (
            <PromptsTab
              prompts={settings.prompts}
              handlePromptChange={handlePromptChange}
            />
          )}
        </div>

        {/* Save Button */}
        <div className="mt-8 flex items-center justify-end">
          {savedStatus && (
            <p className={`mr-4 text-sm ${savedStatus.startsWith('Error:')
              ? 'text-red-500'
              : 'text-green-500'
              }`}>
              {savedStatus}
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors focus:ring-4 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed dark:focus:ring-indigo-800"
          >
            {isSaving ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </>
    )}
    </div>
  );
};

export default AgentConfigureTab;
