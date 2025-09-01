'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import AssistantSidebar from '@/components/assistant/AssistantSidebar';
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import { EcommerceMetrics } from '@/components/ecommerce/EcommerceMetrics';
import { Workflows } from '@/components/assistant/workflows';
import { Embed } from '@/components/assistant/embed';
import { Services } from '@/components/assistant/services';
import { ChatBot } from '@/components/assistant/chatbot/ChatBot';
import { VoiceAssistant } from '@/components/assistant/voice/VoiceAssistant';
import { KnowledgeBase } from '@/components/assistant/KnowledgeBase/KnowledgeBase';
import { Authentication } from '@/components/assistant/authentication/Authentication';
import { Deployment } from '@/components/assistant/deployment/Deployment';
import { Agents } from '@/components/assistant/agents/Agents';
import AgentConfigureTab from '@/components/assistant/agents/AgentConfigureTab';
import { assistantService } from '@/services/assistantService';
import { servicesService } from '@/services/servicesService';
import { setGlobalLoading } from '@/components/common/GlobalLoader';
import { Assistant } from '@/types/assistant';
import { useAgents } from '@/hooks/useAgents';

// Mobile navigation item type
interface MobileNavItem {
  name: string;
  tab: string;
  isActive: boolean;
  hasChildren?: boolean;
  isOpen?: boolean;
  children?: { name: string; tab: string, isActive: boolean }[];
}

// Agent type definition
interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
  icon: string;
  isActive: boolean;
  createdAt: string;
}

// Create a client component that uses the search params
function CustomizeAssistantContent() {
  const searchParams = useSearchParams();
  const assistantId = searchParams.get('id');
  const activeTab = searchParams.get('tab') || 'dashboard';
  const scrollTo = searchParams.get('scrollTo');
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [, setMobileNavItems] = useState<MobileNavItem[]>([]); const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [activeAgents, setActiveAgents] = useState<Agent[]>([]);

  // Load agents automatically using the useAgents hook
  const { agents: apiAgents, loading: agentsLoading } = useAgents(assistantId || '');

  // Use refs instead of state for fetch tracking to avoid re-renders
  const isFetchingRef = React.useRef(false);
  const hasFetchedRef = React.useRef<string | null>(null);
  const isServiceFetchingRef = React.useRef(false);
  const hasServicesFetchedRef = React.useRef<string | null>(null);

  const handleAgentStatusChange = (agents: Agent[]) => {
    setActiveAgents(agents);
  };

  useEffect(() => {
    const fetchAssistant = async () => {
      if (!assistantId) {
        setError('No assistant ID provided');
        setLoading(false);
        return;
      }
      // Prevent multiple simultaneous fetches
      if (isFetchingRef.current || hasFetchedRef.current === assistantId) {
        return;
      }

      try {
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
        setGlobalLoading(true);

        const fetchedAssistant = await assistantService.getAssistantById(assistantId);

        // Use the fetched assistant directly
        setAssistant({
          ...fetchedAssistant,
          active: fetchedAssistant.status === 'active',
        });
      } catch (err) {
        console.error('Error fetching assistant:', err);
        setError(err instanceof Error ? err.message : 'Failed to load assistant');
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
        setGlobalLoading(false);
        // Mark this assistantId as fetched
        hasFetchedRef.current = assistantId;
      }
    };
    fetchAssistant();

    // Cleanup effect - reset the fetch ref when assistantId changes
    return () => {
      if (hasFetchedRef.current === assistantId) {
        hasFetchedRef.current = null;
      }
    };
  }, [assistantId]);

  // Effect to update mobile navigation when activeTab changes
  useEffect(() => {
    if (assistant) {
      setMobileNavItems([
        {
          name: 'Dashboard',
          tab: 'dashboard',
          isActive: activeTab === 'dashboard',
        },
        {
          name: 'Manage Services',
          tab: 'services',
          isActive: activeTab === 'services',
        },
        {
          name: 'Agents',
          tab: 'agents',
          isActive: activeTab.startsWith('agents-'),
          hasChildren: true,
          isOpen: activeTab.startsWith('agents-'),
          children: [
            { name: 'Create', tab: 'agents-create', isActive: activeTab === 'agents-create' },
            { name: 'Doctors Searching', tab: 'agents-doctors', isActive: activeTab === 'agents-doctors' },
            { name: 'Find Hospitals', tab: 'agents-hospitals', isActive: activeTab === 'agents-hospitals' },
          ]
        },
        {
          name: 'ChatBot',
          tab: 'chatbot',
          isActive: activeTab.startsWith('chatbot-'),
          hasChildren: true,
          isOpen: activeTab.startsWith('chatbot-'),
          children: [
            { name: 'General', tab: 'chatbot-general', isActive: activeTab === 'chatbot-general' },
            { name: 'Integrations', tab: 'chatbot-integrations', isActive: activeTab === 'chatbot-integrations' },
          ]
        },
        {
          name: 'Voice Assistant',
          tab: 'voice',
          isActive: activeTab.startsWith('voice-'),
          hasChildren: true,
          isOpen: activeTab.startsWith('voice-'),
          children: [
            { name: 'General', tab: 'voice-general', isActive: activeTab === 'voice-general' },
            { name: 'Integrations', tab: 'voice-integrations', isActive: activeTab === 'voice-integrations' },
          ]
        },
        {
          name: 'Knowledge Base',
          tab: 'knowledge',
          isActive: activeTab.startsWith('knowledge-'),
          hasChildren: true,
          isOpen: activeTab.startsWith('knowledge-'),
          children: [
            { name: 'Sources', tab: 'knowledge-sources', isActive: activeTab === 'knowledge-sources' },
            { name: 'Upload', tab: 'knowledge-upload', isActive: activeTab === 'knowledge-upload' },
          ]
        },
        {
          name: 'Authentication',
          tab: 'authentication',
          isActive: activeTab === 'authentication',
        },
        {
          name: 'Deployment',
          tab: 'deployment',
          isActive: activeTab === 'deployment',
        },
        {
          name: 'Embed',
          tab: 'embed',
          isActive: activeTab === 'embed',
        },
        {
          name: 'Workflows',
          tab: 'workflows',
          isActive: activeTab === 'workflows',
        },
      ]);
    }
  }, [activeTab, assistant]);

  // Fetch services immediately on component mount (for sidebar display)
  useEffect(() => {
    if (assistantId) {
      const fetchAssistantServices = async () => {
        if (isServiceFetchingRef.current || hasServicesFetchedRef.current === assistantId) {
          return;
        }
        try {
          isServiceFetchingRef.current = true;

          // Get all services first
          const allServices = await servicesService.getServices();

          // Get the assistant's active services
          const assistantServiceIDs = await servicesService.getAssistantServices(assistantId);

          // Convert backend serviceIDs to UI/sidebar IDs
          const sidebarServiceIDs = assistantServiceIDs.map(serviceID => {
            // Find the service in all services
            const service = allServices.services.find(s => s.serviceID === serviceID);
            if (!service) return '';

            // Map to sidebar ID based on name (same logic as in Services.tsx)
            const serviceName = service.name.toLowerCase();
            if (serviceName.includes('chat')) {
              return 'chatbot-service';
            } else if (serviceName.includes('voice')) {
              return 'voice-service';
            } else if (serviceName.includes('call') || serviceName.includes('agent')) {
              return 'agent-calling-service';
            } else if (serviceName.includes('sms') || serviceName.includes('message')) {
              return 'sms-service';
            }
            return service.id;
          }).filter(id => id !== '');

          if (sidebarServiceIDs.length > 0) {
            setSelectedServices(sidebarServiceIDs);
          }
        } catch (error) {
          console.error('Error fetching assistant services:', error);
        } finally {
          isServiceFetchingRef.current = false;
          hasServicesFetchedRef.current = assistantId;
        }
      };

      fetchAssistantServices();

      // Cleanup effect - reset the service fetch ref when assistantId changes
      return () => {
        if (hasServicesFetchedRef.current === assistantId) {
          hasServicesFetchedRef.current = null;
        }
      };
    }
  }, [assistantId]);

  // Effect to update activeAgents when apiAgents are loaded
  useEffect(() => {
    if (apiAgents && apiAgents.length > 0 && !agentsLoading) {
      // Convert API agents to the format expected by the sidebar, only include enabled agents
      const formattedAgents: Agent[] = apiAgents
        .filter(agent => agent.isEnabled) // Only show enabled agents
        .map(agent => ({
          id: agent.workflowAgentID || '',
          name: agent.agentName || 'Unnamed Agent',
          description: agent.description || 'No description available',
          type: 'custom',
          icon: '/images/icons/agent.svg', // Default icon
          isActive: agent.isEnabled ?? true,
          createdAt: new Date().toISOString()
        }));
      
      setActiveAgents(formattedAgents);
    } else if (!agentsLoading && apiAgents.length === 0) {
      // Only clear if we're not loading and there are actually no agents
      setActiveAgents([]);
    }
  }, [apiAgents, agentsLoading]);

  // Loading state
  if (loading && isFetchingRef.current) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin mx-auto mb-4"></div>
        </div>
      </div>
    );
  }

  if (!assistant) {
    // If still fetching, show loading state
    if (isFetchingRef.current) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin mx-auto mb-4"></div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6 text-center">
        <h1 className="text-xl font-bold mb-4">Assistant not found</h1>
        <Link href="/assistant" className="text-indigo-500 hover:underline">
          Return to Assistants
        </Link>
      </div>
    );
  }
  // Render content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="p-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-white/[0.03] dark:border-gray-800 overflow-auto min-h-[42rem]">
              <div className="grid grid-cols-12 gap-4 md:gap-6">
                <div className="col-span-12 space-y-6 xl:col-span-7">
                  <EcommerceMetrics />

                  <MonthlySalesChart />
                </div>

                <div className="col-span-12 xl:col-span-5">
                  <MonthlyTarget />
                </div>
              </div>

            </div>
          </div>
        );

      case 'chatbot-general':
        return (
          <div className="p-6">
            <ChatBot assistantId={assistant?.id || ''} tab="general" />
          </div>
        );

      case 'chatbot-integrations':
        return (
          <div className="p-6">
            <ChatBot assistantId={assistant?.id || ''} tab="integration" />
          </div>
        );

      case 'voice':
      case 'voice-general':
      case 'voice-integrations':
        return (
          <div className="p-6">
            <VoiceAssistant
              assistantId={assistantId ?? undefined}
              tab={activeTab === 'voice-integrations' ? 'integrations' : 'general'}
            />
          </div>
        );

      case 'knowledge-base':
        return (
          <div className="p-6">
            <KnowledgeBase />
          </div>
        );

      case 'services':
      case 'manage-services':
        return (
          <div className="p-6">
            <Services
              assistantId={assistantId || ''}
              initialSelectedServices={selectedServices}
              onServicesChange={setSelectedServices}
            />
          </div>
        );

      case 'authentication':
        return (
          <div className="p-6">
            <Authentication assistantId={assistantId ?? undefined} />
          </div>
        );

      case 'agents-create':
        return (
          <div className="p-6">
            <Agents
              assistantId={assistantId ?? undefined}
              onAgentStatusChange={handleAgentStatusChange}
              scrollTo={scrollTo ?? undefined}
            />
          </div>
        );

      case 'agents-doctors':
        return (
          <div className="p-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-white/[0.03] dark:border-gray-800 text-center overflow-auto min-h-[42rem]">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Doctors Searching
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                This section is under development. Content for &quot;Doctors Searching&quot; will be available soon.
              </p>
            </div>
          </div>
        );

      case 'agents-hospitals':
        return (
          <div className="p-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-white/[0.03] dark:border-gray-800 text-center overflow-auto min-h-[42rem]">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Find Hospitals
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                This section is under development. Content for &quot;Find Hospitals&quot; will be available soon.
              </p>
            </div>
          </div>
        );

      // Handle agent configuration tabs based on the URL pattern
      case activeTab.startsWith('agents-') && !['agents-create', 'agents-doctors', 'agents-hospitals'].includes(activeTab) ? activeTab : '':
        return (
          <div className="p-6">
            <AgentConfigureTab />
          </div>
        );

      case 'workflows':
        return (
          <div className="p-6">
            <Workflows assistantId={assistantId ?? undefined} />
          </div>
        );

      case 'deployment':
        return (
          <div className="p-6">
            <Deployment assistantId={assistantId ?? undefined} />
          </div>
        );

      case 'embed':
        return (
          <div className="p-6">
            <Embed assistantId={assistantId ?? undefined} />
          </div>
        );

      default:
        return (
          <div className="p-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-white/[0.03] dark:border-gray-800 text-center overflow-auto min-h-[42rem]">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                {activeTab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                This section is under development. Content for &quot;{activeTab}&quot; will be available soon.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900/20">
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-2 flex flex-wrap md:flex-nowrap items-center justify-between gap-3">
        {/* Desktop title */}
        <div className="hidden md:block">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Customize Assistant
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Customize your assistant settings and preferences.
          </p>
        </div>

        {/* Mobile header with icon and toggle */}
        <div className="flex items-center space-x-3 md:hidden">
          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
            <Image
              src={getAssistantAvatar(assistant)}
              alt={getAssistantName(assistant)}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h2 className="font-medium text-gray-900 dark:text-white text-sm">{getAssistantName(assistant)}</h2>
            <div className="flex items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                {isAssistantActive(assistant) ? "ACTIVE" : "INACTIVE"}
              </span>
              <div
                className="relative inline-block w-8 h-4 rounded-full cursor-pointer"
                onClick={() => {
                  // Here you'd update the assistant active status
                  if (assistant) {
                    const updatedAssistant = { ...assistant, active: !isAssistantActive(assistant) };
                    setAssistant(updatedAssistant);
                  }
                }}
                role="switch"
                aria-checked={isAssistantActive(assistant)}
                tabIndex={0}
              >
                <div className={`
                  w-full h-full rounded-full transition-colors duration-200 ease-in-out
                  ${assistant.active ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}
                `}></div>
                <div className={`
                  absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full shadow transform transition-transform duration-200 ease-in-out
                  ${assistant.active ? 'translate-x-4' : ''}
                `}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Link href="/assistant" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            Assitants
          </Link>
          <span className="text-gray-400">&gt;</span>
          <span className="text-gray-700 dark:text-gray-300">{getAssistantName(assistant)}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block h-full">
          <AssistantSidebar
            assistantId={assistant?.id || ''}
            assistantName={getAssistantName(assistant)}
            assistantAvatar={getAssistantAvatar(assistant)}
            selectedServices={selectedServices}
            activeAgents={activeAgents}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto w-full flex flex-col">
          {/* Mobile Sidebar at the top */}
          <div className="md:hidden">
            <AssistantSidebar
              assistantId={assistant?.id || ''}
              assistantName={getAssistantName(assistant)}
              assistantAvatar={getAssistantAvatar(assistant)}
              selectedServices={selectedServices}
              activeAgents={activeAgents}
              isMobileView={true}
            />
          </div>
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

// Helper functions for safely accessing assistant properties
const getAssistantName = (assistant: Assistant | null): string =>
  assistant?.name || 'Unnamed Assistant';

const getAssistantAvatar = (assistant: Assistant | null): string =>
  assistant?.avatar || '/images/brand/brand-01.svg';

const isAssistantActive = (assistant: Assistant | null): boolean =>
  assistant?.status === 'active' || Boolean(assistant?.active);

// Main page component with Suspense boundary
export default function CustomizeAssistantPage() {
  return (
    <Suspense fallback={
      <div className="p-6 text-center">
        <div className="text-xl font-medium mb-4">Loading assistant...</div>
        <div className="animate-pulse h-4 bg-gray-200 rounded dark:bg-gray-700 w-3/4 mx-auto mb-2"></div>
        <div className="animate-pulse h-4 bg-gray-200 rounded dark:bg-gray-700 w-1/2 mx-auto"></div>
      </div>
    }>
      <CustomizeAssistantContent />
    </Suspense>
  );
}
