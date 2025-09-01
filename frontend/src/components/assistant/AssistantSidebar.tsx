'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface MenuItem {
  name: string;
  path?: string;
  items?: MenuItem[];
  isExpanded?: boolean;
  serviceId?: string; // Add service ID to identify which menu items belong to which service
}

// Define the Agent type to match with our Agents component
interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
  icon: string;
  isActive: boolean;
  createdAt: string;
}

interface AssistantSidebarProps {
  assistantId: string;
  assistantName: string;
  assistantAvatar: string;
  selectedServices?: string[]; // Services selected by the user
  activeAgents?: Agent[]; // Active agents to display in the sidebar
  isMobileView?: boolean; // Flag to indicate if it's being rendered in mobile view
}

const AssistantSidebar: React.FC<AssistantSidebarProps> = ({ 
  assistantId, 
  assistantName, 
  assistantAvatar,
  selectedServices = [],
  activeAgents = [],
  isMobileView = false
}) => {
  const [isActive, setIsActive] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  // Create base menu items and filter them based on selected services and active agents
  useEffect(() => {
    // Base menu items that are always shown
    const baseMenuItems: MenuItem[] = [
      {
        name: 'Dashboard',
        path: `/assistant/customize?id=${assistantId}&tab=dashboard`,
      },
      {
        name: 'Manage Services',
        path: `/assistant/customize?id=${assistantId}&tab=services`,
      },
      {
        name: 'Agents',
        isExpanded: activeTab.startsWith('agents-'),
        items: [
          { name: 'Create', path: `/assistant/customize?id=${assistantId}&tab=agents-create` },
            // Add dynamic agent items based on activeAgents prop (limited to 4)
            ...activeAgents.slice(0, 4).map(agent => ({
            name: agent.name,
            path: `/assistant/customize?id=${assistantId}&tab=agents-${agent.id}`
            })),
          // Add "Show More" link if there are more than 4 agents
          ...(activeAgents.length > 4 ? [{ 
            name: `Show More`, 
            path: `/assistant/customize?id=${assistantId}&tab=agents-create&scrollTo=your-agents` 
          }] : [])
        ]
      },
      {
        name: 'Knowledge Base',
        path: `/assistant/customize?id=${assistantId}&tab=knowledge-base`,
      },
      {
        name: 'Authentication',
        path: `/assistant/customize?id=${assistantId}&tab=authentication`,
      },
      {
        name: 'Workflows',
        path: `/assistant/customize?id=${assistantId}&tab=workflows`,
      },
      {
        name: 'Deployment',
        path: `/assistant/customize?id=${assistantId}&tab=deployment`,
      },
      {
        name: 'Embed',
        path: `/assistant/customize?id=${assistantId}&tab=embed`,
      },
    ];    
    // Service-specific menu items - dynamic based on available services
    const serviceMenuItems: MenuItem[] = [
      {
        name: 'ChatBot',
        isExpanded: activeTab.startsWith('chatbot-'),
        serviceId: 'chatbot-service', // This links the menu item to a specific service
        items: [
          { name: 'General', path: `/assistant/customize?id=${assistantId}&tab=chatbot-general` },
          { name: 'Integrations', path: `/assistant/customize?id=${assistantId}&tab=chatbot-integrations` },
        ]
      },
      {
        name: 'Voice Assistant',
        isExpanded: activeTab.startsWith('voice-'),
        serviceId: 'voice-service',
        items: [
          { name: 'General', path: `/assistant/customize?id=${assistantId}&tab=voice-general` },
          { name: 'Integrations', path: `/assistant/customize?id=${assistantId}&tab=voice-integrations` },
        ]
      },
      {
        name: 'Agent Calling',
        isExpanded: activeTab.startsWith('agent-calling-'),
        serviceId: 'agent-calling-service',
        items: [
          { name: 'General', path: `/assistant/customize?id=${assistantId}&tab=agent-calling-general` },
          { name: 'Integrations', path: `/assistant/customize?id=${assistantId}&tab=agent-calling-integrations` },
        ]
      },
      {
        name: 'SMS',
        isExpanded: activeTab.startsWith('sms-'),
        serviceId: 'sms-service',
        items: [
          { name: 'General', path: `/assistant/customize?id=${assistantId}&tab=sms-general` },
          { name: 'Integrations', path: `/assistant/customize?id=${assistantId}&tab=sms-integrations` },
        ]
      }
    ];

    // Filter service menu items based on selected services
    const filteredServiceMenuItems = serviceMenuItems.filter(
      item => item.serviceId && selectedServices.includes(item.serviceId)
    );

    // Sort the final menu items to insert service items after "Agents"
    let finalMenuItems = [...baseMenuItems];
    
    // Find the index of 'Agents' to insert service items after it
    const agentsIndex = finalMenuItems.findIndex(item => item.name === 'Agents');
    
    if (agentsIndex !== -1) {
      // Insert service items after 'Agents'
      finalMenuItems = [
        ...finalMenuItems.slice(0, agentsIndex + 1),
        ...filteredServiceMenuItems,
        ...finalMenuItems.slice(agentsIndex + 1)
      ];
    } else {
      // If 'Agents' not found, just append service items
      finalMenuItems = [...baseMenuItems, ...filteredServiceMenuItems];
    }

    setMenuItems(finalMenuItems);
  }, [assistantId, activeTab, selectedServices, activeAgents]);

  const toggleSubmenu = (index: number) => {
    setMenuItems(prevItems => {
      const newItems = [...prevItems];
      newItems[index] = {
        ...newItems[index],
        isExpanded: !newItems[index].isExpanded,
      };
      return newItems;
    });
  };

  const isActiveTab = (path: string) => {
    if (!path) return false;
    const pathTab = new URL(path, 'http://dummy.com').searchParams.get('tab');
    return pathTab === activeTab;
  };

  const handleToggleActive = () => {
    setIsActive(prev => !prev);
    // Here you could add an API call to update the assistant's active status
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(prev => !prev);
  };

  // Adjust the mobile menu based on the screen size
  useEffect(() => {
    const handleResize = () => {
      if (mobileMenuOpen && window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileMenuOpen]);

  return (
    isMobileView ? (
      // Mobile side menu toggle button
      <div className="w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between p-3">
          <button 
            onClick={toggleMobileMenu}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Current tab indicator - shows active section */}
          <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
            {activeTab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </div>
        </div>
        
        {/* Mobile Navigation - Slide in from left */}
        <div className={`fixed inset-0 z-[100] transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`} style={{ top: '60px', paddingTop: '60px' }}>
          {/* Backdrop with blur effect */}
          <div 
            className={`absolute inset-0 backdrop-blur-sm bg-gray-900/30 dark:bg-black/40 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
            onClick={toggleMobileMenu}
            style={{ top: '0px' }}
          ></div>
          
          {/* Sidebar */}
          <div className="absolute top-0 left-0 h-full w-4/5 max-w-xs bg-white dark:bg-gray-900 shadow-xl border-r border-gray-200 dark:border-gray-800 overflow-auto">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                  <Image 
                    src={assistantAvatar}
                    alt={assistantName}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h2 className="font-medium text-gray-900 dark:text-white">{assistantName}</h2>
                </div>
              </div>
              <button 
                onClick={toggleMobileMenu}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 focus:outline-none transition-colors"
                aria-label="Close navigation menu"
              >
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Active Services Tags */}
            {selectedServices.length > 0 && (
              <div className="px-4 pb-2 pt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Active Services:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedServices.includes('chatbot-service') && (
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full dark:bg-indigo-900/30 dark:text-indigo-300">
                      ChatBot
                    </span>
                  )}
                  {selectedServices.includes('voice-service') && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full dark:bg-purple-900/30 dark:text-purple-300">
                      Voice
                    </span>
                  )}
                  {selectedServices.includes('agent-calling-service') && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full dark:bg-blue-900/30 dark:text-blue-300">
                      Agent Calling
                    </span>
                  )}
                  {selectedServices.includes('sms-service') && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full dark:bg-green-900/30 dark:text-green-300">
                      SMS
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {/* Sidebar Content */}
            <nav className="px-4 py-2">
              <ul className="space-y-1">
                {menuItems.map((item, index) => (
                  <li key={item.name}>
                    {item.items ? (
                      <>
                        <button
                          onClick={() => toggleSubmenu(index)}
                          className={`flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                            item.isExpanded 
                              ? 'text-gray-900 dark:text-white' 
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <span className="flex-1 text-left">{item.name}</span>
                          <svg
                            className={`w-4 h-4 transition-transform ${item.isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                        {item.isExpanded && item.items && (
                          <ul className="mt-1 ml-3 space-y-1">
                            {item.items.map((subitem) => (
                              <li key={subitem.name} onClick={toggleMobileMenu}>
                                <Link
                                  href={subitem.path || '#'}
                                  className={`block px-4 py-2 text-sm rounded-lg transition-colors ${
                                    isActiveTab(subitem.path || '')
                                      ? 'bg-indigo-50 text-indigo-600 font-medium dark:bg-indigo-900/20 dark:text-white'
                                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50'
                                  }`}
                                >
                                  {subitem.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : (
                      <Link
                        href={item.path || '#'}
                        onClick={toggleMobileMenu}
                        className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                          isActiveTab(item.path || '')
                             ? 'bg-indigo-100 text-indigo-600 font-medium dark:bg-indigo-900/20 dark:text-white'
                              : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        {item.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
            
            
          </div>
        </div>
      </div>
    ) : (
      // Desktop sidebar
      <div className="w-64 bg-white border-r mt-6 rounded-2xl border-gray-200 dark:bg-gray-900 dark:border-gray-800 overflow-auto min-h-[42rem]">
        {/* Assistant Info Header */}
        <div className="p-4 flex items-center space-x-3">
          <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
            <Image 
              src={assistantAvatar}
              alt={assistantName}
              width={44}
              height={44}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <h2 className="font-medium text-gray-900 dark:text-white">{assistantName}</h2>
            <div className="flex items-center mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                {isActive ? "ACTIVE" : "INACTIVE"}
              </span>
              <div 
                className="relative inline-block w-8 h-4 rounded-full cursor-pointer"
                onClick={handleToggleActive}
                role="switch"
                aria-checked={isActive}
                tabIndex={0}
              >
                <div className={`
                  w-full h-full rounded-full transition-colors duration-200 ease-in-out
                  ${isActive ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}
                `}></div>
                <div className={`
                  absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full shadow transform transition-transform duration-200 ease-in-out
                  ${isActive ? 'translate-x-4' : ''}
                `}></div>
              </div>
            </div>
          </div>
        </div>
      

      {/* Selected Services Tags */}
      {selectedServices.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Active Services:</p>
          <div className="flex flex-wrap gap-1">
            {selectedServices.includes('chatbot-service') && (
              <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full dark:bg-indigo-900/30 dark:text-indigo-300">
                ChatBot
              </span>
            )}
            {selectedServices.includes('voice-service') && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full dark:bg-purple-900/30 dark:text-purple-300">
                Voice
              </span>
            )}
            {selectedServices.includes('agent-calling-service') && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full dark:bg-blue-900/30 dark:text-blue-300">
                Agent Calling
              </span>
            )}
            {selectedServices.includes('sms-service') && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full dark:bg-green-900/30 dark:text-green-300">
                SMS
              </span>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="px-4 py-2">
        <ul className="space-y-1">
          {menuItems.map((item, index) => (
            <li key={item.name}>
              {item.items ? (
                <>
                  <button
                    onClick={() => toggleSubmenu(index)}
                    className={`flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                      item.isExpanded 
                        ? 'text-gray-900 dark:text-white' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="flex-1 text-left">{item.name}</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${item.isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {item.isExpanded && item.items && (
                    <ul className="mt-1 ml-3 space-y-1">
                      {item.items.map((subitem) => (
                        <li key={subitem.name}>
                          <Link
                            href={subitem.path || '#'}
                            className={`block px-4 py-2 text-sm rounded-lg transition-colors ${
                              isActiveTab(subitem.path || '')
                                ? 'bg-indigo-50 text-black font-medium dark:bg-indigo-900/20 dark:text-white'
                                : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50'
                            }`}
                          >
                            {subitem.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <Link
                  href={item.path || '#'}
                  className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                    isActiveTab(item.path || '')
                       ? 'bg-indigo-100 text-indigo-600 font-medium dark:bg-indigo-900/20 dark:text-white'
                        : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50'
                  }`}
                >
                  {item.name}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
    )
  );
};

export default AssistantSidebar;