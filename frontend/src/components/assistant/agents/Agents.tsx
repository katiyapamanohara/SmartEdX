'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useModal } from '@/hooks/useModal';
import { useAgents } from '@/hooks/useAgents';
import { agentService } from '@/services/agentService';
import CreateAgentModal from './CreateAgentModal';
import type { APIAgent, Agent } from '@/types/agent';

interface AgentsProps {
  assistantId?: string;
  onAgentStatusChange?: (activeAgents: Agent[]) => void;
  scrollTo?: string;
}

export const Agents: React.FC<AgentsProps> = ({
  assistantId,
  onAgentStatusChange,
  scrollTo
}) => {
  // Fetch agents from API
  const { agents: apiAgents, loading, error, refetch } = useAgents(assistantId);
  // Convert API agents to local format
  const [agents, setAgents] = useState<Agent[]>([]);

  // Track which agent is being updated
  const [updatingAgentId, setUpdatingAgentId] = useState<string | null>(null);

  // Use a ref to track initial render
  const initialRenderDone = useRef(false);

  // Use the modal hook for the agent creation popup
  const { isOpen, openModal, closeModal } = useModal();
  useEffect(() => {
    const convertedAgents = apiAgents.map(apiAgent => ({
      id: apiAgent.workflowAgentID || 'unknown-id',
      name: apiAgent.agentName,
      description: apiAgent.description,
      type: apiAgent.agentTypeID,
      icon: getIconByType(apiAgent.agentTypeID),
      isActive: apiAgent.isEnabled ?? true,
      createdAt: apiAgent.createdAt || new Date().toISOString(),
      workflowAgentID: apiAgent.workflowAgentID,
    }));
    setAgents(convertedAgents);
  }, [apiAgents]);

  // Helper function to get icon based on agent type
  const getIconByType = (agentTypeID: string): string => {
    // Map agentTypeID to appropriate icon
    const typeMapping: Record<string, string> = {
      'e3f8b1a2-9c4d-4e5f-b6c7-8d9e0f1a2b3c': 'medical-services', // healthcare
      'f4a9c2b3-ad5e-4f60-c7d8-9e0f1a2b3c4d': 'support-agent', // customer service
      'a5b0d3c4-be6f-5071-d8e9-0f1a2b3c4d5e': 'trending-up', // sales
      'b6c1e4d5-cf70-6182-e9f0-1a2b3c4d5e6f': 'event-available', // booking
      'c7d2f5e6-d081-7293-f0a1-2b3c4d5e6f70': 'build', // technical support
    };
    return typeMapping[agentTypeID] || 'smart-toy';
  };

  // When component mounts, notify parent about initially active agents (only once)
  useEffect(() => {
    if (!initialRenderDone.current && onAgentStatusChange && agents.length > 0) {
      const activeAgents = agents.filter(agent => agent.isActive);
      onAgentStatusChange(activeAgents);
      initialRenderDone.current = true;
    }
  }, [onAgentStatusChange, agents]);

  // Reset initialRenderDone when assistantId changes
  useEffect(() => {
    initialRenderDone.current = false;
  }, [assistantId]);

  // Handle scroll to specific section
  useEffect(() => {
    if (scrollTo === 'your-agents') {
      // Small delay to ensure the component is fully rendered
      const timer = setTimeout(() => {
        const element = document.getElementById('your-agents');
        if (element) {
          // Get the element's position
          const elementRect = element.getBoundingClientRect();
          const absoluteElementTop = elementRect.top + window.pageYOffset;
          // Scroll to 80px above the element to ensure it's fully visible
          const scrollToPosition = absoluteElementTop - 80;
          
          window.scrollTo({
            top: scrollToPosition,
            behavior: 'smooth'
          });
          
          //Clean up the URL parameter after scrolling
          const url = new URL(window.location.href);
          url.searchParams.delete('scrollTo');
          window.history.replaceState({}, '', url.toString());
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [scrollTo, agents]); //ensure scrolled after agents are loaded

  const toggleAgentStatus = async (agentId: string) => {
    // Find the agent to update
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    // Find the corresponding API agent to get the workflowAgentID
    const apiAgent = apiAgents.find(a => {
      if (a.workflowAgentID && a.workflowAgentID === agentId)
        return true;
    });

    if (!apiAgent) {
      console.error('Could not find API agent for update');
      alert('Error: Could not find agent data for update');
      return;
    }

    const workflowAgentID = apiAgent.workflowAgentID;
    if (!workflowAgentID) {
      console.error('No workflowAgentID found for agent update');
      alert('Error: No agent ID found for update');
      return;
    }

    // Set loading state
    setUpdatingAgentId(agentId);

    try {
      // Update the agent status via API
      await agentService.updateAgent(workflowAgentID, {
        isEnabled: !agent.isActive
      });

      // Update the local state
      const updatedAgents = agents.map(a =>
        a.id === agentId
          ? { ...a, isActive: !a.isActive }
          : a
      );

      setAgents(updatedAgents);

      // Notify parent about active agents for sidebar update
      if (onAgentStatusChange) {
        const activeAgents = updatedAgents.filter(a => a.isActive);
        onAgentStatusChange(activeAgents);
      }

      // Optionally refetch to ensure data consistency
      // refetch();
    } catch (error) {
      console.error('Failed to update agent status:', error);

      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to update agent status';
      alert(`Error: ${errorMessage}`);

      // Don't update the UI state on error
    } finally {
      // Clear loading state
      setUpdatingAgentId(null);
    }
  }; const handleCreateAgent = (newAgent: APIAgent) => {
    // Convert the API Agent to our local Agent format
    const agent: Agent = {
      id: newAgent.workflowAgentID || crypto.randomUUID(),
      name: newAgent.agentName,
      description: newAgent.description,
      type: newAgent.agentTypeID,
      icon: getIconByType(newAgent.agentTypeID),
      isActive: true,
      createdAt: newAgent.createdAt || new Date().toISOString()
    };

    const updatedAgents = [...agents, agent];
    setAgents(updatedAgents);

    // Notify parent about active agents if the callback exists
    if (onAgentStatusChange) {
      const activeAgents = updatedAgents.filter(a => a.isActive);
      onAgentStatusChange(activeAgents);
    }

    // Refetch agents to ensure we have the latest data
    refetch();

    closeModal();
  };
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-white/[0.03] dark:border-gray-800 overflow-auto min-h-[42rem]">
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-center py-8">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md mb-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Create New Agent Card */}
          <div
            className="bg-white border border-gray-300 rounded-2xl overflow-hidden transition-all hover:border-indigo-400 dark:bg-white/[0.03] dark:border-gray-700 dark:hover:border-indigo-500 cursor-pointer flex items-center justify-center mb-8 max-w-2xl mx-auto"
            onClick={openModal}
          >
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Create New Agent
              </h3>
              <p className="text-gray-500 text-sm dark:text-gray-400 mt-2">
                Build a custom agent to enhance your assistant&apos;s capabilities
              </p>
            </div>
          </div>

          {/* Create Agent Modal */}
          <CreateAgentModal
            isOpen={isOpen}
            onClose={closeModal}
            onCreateAgent={handleCreateAgent}
            assistantID={assistantId || 'default-assistant-id'}
          />

          {agents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="text-sm">You haven&apos;t created any agents yet.</p>
            </div>
          ) : (
            <>
              <h2 id="your-agents" className="text-xl text-center font-semibold text-gray-900 dark:text-white mb-6">
                Your Agents
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                {agents.map(agent => (
                  <div
                    key={agent.id}
                    className="bg-white border border-gray-200 rounded-2xl overflow-hidden transition-all hover:shadow-md dark:bg-white/[0.03] dark:border-gray-800"
                  >
                    <div className="p-6 flex flex-col h-44">
                      <div className="w-14 h-14 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-2">
                        {agent.type === 'e3f8b1a2-9c4d-4e5f-b6c7-8d9e0f1a2b3c' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                        )}
                        {agent.type === 'f4a9c2b3-ad5e-4f60-c7d8-9e0f1a2b3c4d' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        )}
                        {agent.type === 'a5b0d3c4-be6f-5071-d8e9-0f1a2b3c4d5e' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {!['e3f8b1a2-9c4d-4e5f-b6c7-8d9e0f1a2b3c', 'f4a9c2b3-ad5e-4f60-c7d8-9e0f1a2b3c4d', 'a5b0d3c4-be6f-5071-d8e9-0f1a2b3c4d5e'].includes(agent.type) && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        )}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {agent.name}
                      </h3>
                      <p className="text-gray-500 text-sm dark:text-gray-400 mt-2 line-clamp-3">
                        {agent.description}
                      </p>
                      <div className="flex-grow"></div>
                    </div>

                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                      {agent.isActive && (
                        <Link
                          href={`/assistant/customize?id=${assistantId}&tab=agents-${agent.workflowAgentID || agent.id}`}
                          className="text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-500 dark:hover:text-indigo-300 text-sm"
                        >
                          Configure Agent →
                        </Link>
                      )}
                      {!agent.isActive && (
                        <span className="text-gray-500 dark:text-gray-400 text-sm">Inactive</span>
                      )}
                      <div className="flex items-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={agent.isActive}
                          onClick={() => toggleAgentStatus(agent.id)}
                          disabled={updatingAgentId === agent.id}
                          className={`relative inline-flex flex-shrink-0 h-6 transition-colors duration-200 ease-in-out border-2 border-transparent rounded-full cursor-pointer w-11 focus:outline-none ${agent.isActive ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                            } ${updatingAgentId === agent.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {updatingAgentId === agent.id ? (
                            <span className="pointer-events-none relative inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 translate-x-2.5">
                              <svg className="animate-spin h-3 w-3 text-indigo-600 absolute inset-0 m-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            </span>
                          ) : (
                            <span
                              className={`pointer-events-none relative inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${agent.isActive ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            >
                              <span
                                className={`absolute inset-0 h-full w-full flex items-center justify-center transition-opacity ${agent.isActive ? 'opacity-0 ease-out duration-100' : 'opacity-100 ease-in duration-200'
                                  }`}
                                aria-hidden="true"
                              >
                                <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 12 12">
                                  <path d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2-1.414 1.414z" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </span>
                              <span
                                className={`absolute inset-0 h-full w-full flex items-center justify-center transition-opacity ${agent.isActive ? 'opacity-100 ease-in duration-200' : 'opacity-0 ease-out duration-100'
                                  }`}
                                aria-hidden="true"
                              >
                                <svg className="h-3 w-3 text-indigo-600" fill="currentColor" viewBox="0 0 12 12">
                                  <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
                                </svg>
                              </span>
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Agents;