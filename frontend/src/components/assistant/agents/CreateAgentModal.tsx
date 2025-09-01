'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { useAgentTypes } from '@/hooks/useAgentTypes';
import { agentService } from '@/services/agentService';
import type { CreateAgentFormData, APIAgent } from '@/types/agent';
import posthog from 'posthog-js';

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAgent?: (agent: APIAgent) => void;
  assistantID: string;
}

export const CreateAgentModal: React.FC<CreateAgentModalProps> = ({
  isOpen,
  onClose,
  onCreateAgent,
  assistantID,
}) => {

  const { agentTypes, loading: agentTypesLoading, error: agentTypesError } = useAgentTypes();
  const [newAgent, setNewAgent] = useState<CreateAgentFormData>({
    name: '',
    description: '',
    type: '',
    isActive: true,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Clear error when user starts typing or making selections
  const clearError = () => {
    if (error) {
      setError(null);
    }
    if (success) {
      setSuccess(null);
    }
  };

  const handleCreateAgent = async () => {
    try {
      // Validate all required fields before proceeding

      // Check agent name
      if (!newAgent.name.trim()) {
        setError("Please enter an agent name");
        return;
      }

      // Check agent type selection
      if (!newAgent.type) {
        setError("Please select an agent type");
        return;
      }

      setIsCreating(true);

      const response = await agentService.createAgent({
        assistantID,
        agentName: newAgent.name,
        description: newAgent.description,
        agentTypeID: newAgent.type,
      });

      //Track agent creation
      posthog.capture('agent_created', {
        timestamp: new Date().toISOString(),
      });

      // Show success message first
      setSuccess(`Agent "${newAgent.name}" created successfully!`);

      // Wait 3 seconds to show the success message, then close
      setTimeout(() => {
        // Call the callback and close AFTER showing success message
        if (response.success && onCreateAgent) {
          onCreateAgent(response.agent);
        }
        setIsCreating(false);
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Failed to create agent:', error);
      setError(error instanceof Error ? error.message : 'Failed to create agent');
      setIsCreating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl p-0 overflow-hidden"
    >
      <div className="p-0">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Create New Agent</h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Agent Name
            </label>
            <input
              type="text"
              value={newAgent.name}
              onChange={(e) => {
                setNewAgent({ ...newAgent, name: e.target.value });
                clearError();
              }}
              placeholder="E.g., Patient Triage"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              disabled={isCreating} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={newAgent.description}
              onChange={(e) => {
                setNewAgent({ ...newAgent, description: e.target.value });
                clearError();
              }}
              placeholder="Describe what this agent will do..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              disabled={isCreating}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Agent Type
            </label>
            {agentTypesLoading ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                <span className="text-sm text-gray-500 dark:text-gray-400">Loading agent types</span>
              </div>
            ) : agentTypesError ? (
              <div className="w-full px-3 py-2 border border-red-300 rounded-md shadow-sm bg-red-50 dark:bg-red-900/20 dark:border-red-600">
                <span className="text-sm text-red-600 dark:text-red-400">Error loading agent types: {agentTypesError}</span>
              </div>
            ) : (<select
              value={newAgent.type}
              onChange={(e) => {
                setNewAgent({ ...newAgent, type: e.target.value });
                clearError();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              disabled={agentTypes.length === 0 || isCreating}
            >
              {agentTypes.length === 0 ? (
                <option value="">No agent types available</option>
              ) : (
                <>
                  <option value="">Select an agent type</option>
                  {agentTypes.map((agentType) => (
                    <option key={agentType.agentTypeID} value={agentType.agentTypeID}>
                      {agentType.agentTypeName}
                    </option>
                  ))}
                </>
              )}
            </select>)}
          </div>

          {/* Error/Success Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex justify-end space-x-3">          <button
          onClick={onClose}
          className="px-4 py-2 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors focus:ring-4 focus:ring-gray-200 dark:bg-transparent dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
          disabled={isCreating || success !== null}
        >
          Cancel
        </button>
          <button
            onClick={handleCreateAgent}
            className="px-4 py-2 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-colors focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isCreating || success !== null}
          >
            {success ? 'Agent Created' :
              isCreating ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create Agent'
              )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateAgentModal;