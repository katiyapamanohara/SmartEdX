'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import GeneralTab from './tabs/GeneralTab';
import CommonTab from './tabs/CommonTab';
import IntegrationTab from './tabs/IntegrationTab';
import { servicesService } from '@/services/servicesService';
import type { ChatBotConfig, ServiceConfigResponse } from '@/types/services';

interface ChatBotProps {
  assistantId?: string;
  tab?: 'general' | 'integration';
}

export const ChatBot: React.FC<ChatBotProps> = ({ assistantId, tab = 'general' }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'integration'>(tab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [assistantServiceId, setAssistantServiceId] = useState<string | null>(null);
  const [settings, setSettings] = useState<{
    name: string;
    welcomeMessage: string;
    primaryColor: string;
    avatarUrl: string;
    avatarFile: File | null;
    displayIconFile: File | null;
    language: string;
    description: string;
    enableAttachments: boolean;
    enableUserFeedback: boolean;
    webWidgetFontSize: string;
    webWidgetBotMessageColor: string;
    webWidgetUserMessageColor: string;
    webWidgetThemeColor: string;
    webWidgetDisplayName: string;
    webWidgetDisplayIconURL: string;
    chatbotName: string;
    chatbotImageURL: string;
    [key: string]: string | boolean | File | null | number;
  }>({
    name: '',
    welcomeMessage: '',
    primaryColor: '',
    avatarUrl: '',
    avatarFile: null as File | null,
    displayIconFile: null as File | null,
    language: '',
    description: '',
    enableAttachments: true,
    enableUserFeedback: true,
    // Integration tab properties - no defaults
    webWidgetFontSize: '',
    webWidgetBotMessageColor: '',
    webWidgetUserMessageColor: '',
    webWidgetThemeColor: '',
    webWidgetDisplayName: '',
    webWidgetDisplayIconURL: '',
    chatbotName: '',
    chatbotImageURL: '',
  });

  // Fetch chatbot service when component mounts
  useEffect(() => {
    if (!assistantId) return;

    const fetchChatbotService = async () => {
      setLoading(true);
      setError(null);
      try {
        // First, get all assistant services to find the chatbot service
        const assistantServices = await servicesService.getAssistantServices(assistantId);

        // Get all services to find the chatbot service
        const allServices = await servicesService.getServices();

        // Find the chatbot service
        const chatbotService = allServices.services.find(service =>
          service.name.toLowerCase().includes('chat') &&
          assistantServices.includes(service.serviceID)
        );

        if (chatbotService) {
          // setChatbotServiceId(chatbotService.serviceID);

          // Construct the assistantServiceID in the correct format: assistantId-serviceID
          const formattedAssistantServiceId = `${assistantId}-chatbot`;
          setAssistantServiceId(formattedAssistantServiceId);
          // Fetch the specific service configuration
          try {
            const serviceConfig = await servicesService.getServiceConfiguration(
              assistantId,
              formattedAssistantServiceId
            );

            // Handle the API response structure correctly
            let actualServiceConfig;
            const apiResponse = serviceConfig as unknown as ServiceConfigResponse; // Cast to unknown first to resolve type incompatibility

            if (apiResponse.services && Array.isArray(apiResponse.services) && apiResponse.services.length > 0) {
              // API returns { assistantID, services: [...] } format
              actualServiceConfig = apiResponse.services[0];
            } else {
              // Direct service configuration
              actualServiceConfig = apiResponse;
            }

            // IMPORTANT: Store the assistantServiceID from the configuration
            if (actualServiceConfig && actualServiceConfig.assistantServiceID) {
              setAssistantServiceId(actualServiceConfig.assistantServiceID);
            }

            // Update the settings with the configuration data
            if (actualServiceConfig && actualServiceConfig.configuration) {
              // The configuration is nested inside the service object
              const chatbotConfig = actualServiceConfig.configuration as ChatBotConfig; setSettings(prevSettings => {
                const updatedSettings = {
                  ...prevSettings,
                  // General tab settings - only update from backend if user hasn't entered a value
                  name: prevSettings.name || chatbotConfig.chatbotName || '',
                  chatbotName: prevSettings.chatbotName || chatbotConfig.chatbotName || '',
                  avatarUrl: chatbotConfig.chatbotImageURL || '',
                  chatbotImageURL: chatbotConfig.chatbotImageURL || '',

                  // Integration tab settings - use values from backend directly without fallbacks
                  webWidgetDisplayName: chatbotConfig.webWidgetDisplayName || '',
                  primaryColor: chatbotConfig.webWidgetThemeColor || '',
                  webWidgetThemeColor: chatbotConfig.webWidgetThemeColor || '',
                  webWidgetFontSize: chatbotConfig.webWidgetFontSize || '',
                  webWidgetBotMessageColor: chatbotConfig.webWidgetBotMessageColor || '',
                  webWidgetUserMessageColor: chatbotConfig.webWidgetUserMessageColor || '',
                  webWidgetDisplayIconURL: chatbotConfig.webWidgetDisplayIconURL || '',                  // Keep existing values for properties not in the API
                  description: prevSettings.description || '',
                  language: prevSettings.language || 'en',
                };

                return updatedSettings;
              });

            }
          } catch (configError) {
            console.error('Error fetching chatbot configuration:', configError);
          }
        }
      } catch (err) {
        console.error('Error fetching assistant services:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chatbot service');
      } finally {
        setLoading(false);
      }
    };

    fetchChatbotService();
  }, [assistantId]);

  // Add effect to update activeTab when tab prop changes
  useEffect(() => {
    setActiveTab(tab);
  }, [tab]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : value;

    // Clear error when user starts typing in the name field
    if (name === 'name' && error) {
      setError(null);
    }

    // Clear success message when user makes changes
    if (success) {
      setSuccess(null);
    }

    setSettings(prev => {
      const updated = {
        ...prev,
        [name]: newValue
      };

      if (name === 'name') {
        updated.chatbotName = newValue as string;
      }

      return updated;
    });
  };

  const handleImageChange = (file: File | null) => {
    if (file) {
      setSettings(prev => ({
        ...prev,
        avatarFile: file,
        avatarUrl: URL.createObjectURL(file)
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        avatarFile: null,
        avatarUrl: ''
      }));
    }
  };

  const handleDisplayIconChange = (file: File | null) => {
    if (file) {
      const tempUrl = URL.createObjectURL(file);
      setSettings(prev => ({
        ...prev,
        displayIconFile: file,
        webWidgetDisplayIconURL: tempUrl
      }));
    } else {
      setSettings(prev => {
        const updated = {
          ...prev,
          displayIconFile: null,
          webWidgetDisplayIconURL: ''
        };
        return updated;
      });
    }
  };

  // Handle changes from IntegrationTab
  const handleIntegrationChange = (name: string, value: string | number) => {
    // Map integration tab field names to API field names
    const fieldMapping: Record<string, string> = {
      'name': 'webWidgetDisplayName',
      'fontSize': 'webWidgetFontSize',
      'botBubbleColor': 'webWidgetBotMessageColor',
      'userBubbleColor': 'webWidgetUserMessageColor',
      'primaryColor': 'webWidgetThemeColor'
    };

    const apiFieldName = fieldMapping[name] || name;

    // Check if the value is actually changing before updating state to prevent loops
    if (settings[name] === value && (!apiFieldName || settings[apiFieldName] === value)) {
      return;
    }

    // Clear success message when user makes changes
    if (success) {
      setSuccess(null);
    }

    let safeValue = value ?? '';

    // For color fields, ensure they're in hex format and not empty
    if ((name === 'botBubbleColor' || name === 'userBubbleColor' || name === 'primaryColor') &&
      (!safeValue || typeof safeValue !== 'string')) {
      // Default colors if missing
      if (name === 'botBubbleColor') safeValue = '#F0F0F0';
      else if (name === 'userBubbleColor') safeValue = '#E0E0FF';
      else if (name === 'primaryColor') safeValue = '#60A5FA';
    }

    // Update the state with the new value from the UI component
    setSettings(prev => {
      const newState = {
        ...prev,
        [name]: safeValue,
        // Also store in the original name for the API if needed
        ...(apiFieldName !== name ? { [apiFieldName]: safeValue } : {})
      };

      return newState;
    });
  };

  const saveSettings = async () => {
    if (!assistantId) {
      return;
    }

    if (!assistantServiceId) {
      return;
    }

    const enteredName = settings.name || '';
    const chatbotName = settings.chatbotName || enteredName;

    if (!chatbotName.trim()) {
      setError('Chatbot name is required. Please enter a name for your chatbot.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const configData: Record<string, string> = {};
      // Use the name the user entered directly
      configData.chatbotName = chatbotName;
      configData.chatbotImageURL = settings.chatbotImageURL || settings.avatarUrl || '';

      // Integration tab settings
      if (settings.webWidgetThemeColor || settings.primaryColor) {
        configData.webWidgetThemeColor = settings.webWidgetThemeColor || settings.primaryColor || '';
      }

      // Integration tab display name (webWidgetDisplayName)
      if (settings.webWidgetDisplayName) {
        configData.webWidgetDisplayName = settings.webWidgetDisplayName;
      }

      if (settings.webWidgetFontSize) {
        configData.webWidgetFontSize = settings.webWidgetFontSize;
      }

      if (settings.webWidgetBotMessageColor) {
        configData.webWidgetBotMessageColor = settings.webWidgetBotMessageColor;
      } if (settings.webWidgetUserMessageColor) {
        configData.webWidgetUserMessageColor = settings.webWidgetUserMessageColor;
      }
      configData.webWidgetDisplayIconURL = settings.webWidgetDisplayIconURL || '';

      // Prepare files if there are any
      const files: { chatbotImage?: File; webWidgetDisplayIcon?: File } = {};

      // If we have an avatarFile, add it to files
      if (settings.avatarFile) {
        files.chatbotImage = settings.avatarFile;
      }

      // If we have a displayIconFile, add it to files
      if (settings.displayIconFile) {
        files.webWidgetDisplayIcon = settings.displayIconFile;
      }

      try {
        await servicesService.updateChatbotConfiguration(
          assistantServiceId,
          configData,
          files);
        
        // Show success message
        setSuccess('Chatbot settings saved successfully!');
        
        // Auto-clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } catch (error) {
        console.error('Error saving chatbot settings:', error);

        // Show a more detailed error message
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('Failed to save chatbot settings');
        }
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error saving chatbot settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-white/[0.03] dark:border-gray-800 overflow-auto min-h-[42rem]">
      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <>
          {activeTab === 'general' ? (
            <>
              <div className="mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  Common Settings
                </h3>
                <CommonTab
                  language={settings.language}
                  description={settings.description}
                  onChange={handleChange}
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  General Settings
                </h3>
                <GeneralTab
                  settings={settings}
                  onChange={handleChange}
                  onImageChange={handleImageChange}
                />
              </div>
              {/* <GeneralTab settings={settings} onChange={handleChange} onImageChange={handleImageChange} /> */}
            </>) : (
            <>
              <IntegrationTab
                settings={{
                  name: settings.webWidgetDisplayName || '',
                  primaryColor: settings.primaryColor || settings.webWidgetThemeColor || '',
                  avatarUrl: settings.webWidgetDisplayIconURL || '', // Use webWidgetDisplayIconURL instead of avatarUrl
                  webWidgetFontSize: settings.webWidgetFontSize || '',
                  webWidgetBotMessageColor: settings.webWidgetBotMessageColor || '',
                  webWidgetUserMessageColor: settings.webWidgetUserMessageColor || '',
                  webWidgetDisplayName: settings.webWidgetDisplayName || '',
                  webWidgetThemeColor: settings.webWidgetThemeColor || settings.primaryColor || '',
                  webWidgetDisplayIconURL: settings.webWidgetDisplayIconURL || '',
                  chatbotName: settings.chatbotName || '',
                }}
                onChange={(name, value) => handleIntegrationChange(name, value.toString())}
                onImageChange={handleDisplayIconChange}
              />
            </>
          )}
        </>
      )}

      {/* Error Message */}
      {error && (
        <div className="col-span-12 mt-6 mb-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="col-span-12 mt-6 mb-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!loading && (
        <div className="flex justify-start mt-8">
          <button
            onClick={saveSettings}
            className="px-5 py-2.5 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-colors focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-800"
          >
            Save Settings
          </button>
          <Link href={`/assistant/customize?id=${assistantId}&tab=dashboard`}>
            <button className="ml-4 px-5 py-2.5 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors focus:ring-4 focus:ring-gray-200 dark:bg-transparent dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-700">
              Cancel
            </button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default ChatBot;