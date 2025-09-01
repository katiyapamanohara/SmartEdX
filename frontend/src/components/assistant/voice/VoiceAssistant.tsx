'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useVoiceAssistantConfiguration } from '@/hooks/useVoiceAssistant';
import { voiceService } from '@/services/voiceService';
import GeneralTab from './tabs/GeneralTab';
import IntegrationTab from './tabs/IntegrationTab';

interface VoiceAssistantProps {
  assistantId?: string;
  tab?: 'general' | 'integrations';
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ assistantId }) => {
  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab');

  // Load voice assistant configuration
  const {
    configuration: voiceConfig,
    voiceAssistantServiceId,
    loading: configLoading
  } = useVoiceAssistantConfiguration(assistantId);

  // State to trigger save in IntegrationTab
  const [triggerVoiceSave, setTriggerVoiceSave] = useState(0);

  // State for general tab save operations
  const [saveSuccess, setSaveSuccess] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  // Wrap in useCallback to prevent recreation on each render
  const getActiveTabFromUrl = useCallback((): 'general' | 'integrations' => {
    if (urlTab === 'voice-integrations') return 'integrations';
    return 'general'; // Default to general tab
  }, [urlTab]);

  const [activeTab, setActiveTab] = useState<'general' | 'integrations'>(getActiveTabFromUrl());

  // Update active tab when URL changes
  useEffect(() => {
    setActiveTab(getActiveTabFromUrl());
  }, [getActiveTabFromUrl]);

  const [settings, setSettings] = useState({
    name: '',
    welcomePrompt: 'Hello! What can I help you with today?',
    voiceType: 'female',
    accentType: 'neutral',
    speechRate: 1.0,
    wakePhrases: ['Hey Assistant', 'Hello Articom'],
    enableMicAccess: true,
    enableContinuousListening: true,
    avatarUrl: '',
    language: 'en',
    description: 'Voice assistant to help users with various tasks'
  });

  // Update settings when voice configuration loads
  useEffect(() => {
    if (voiceConfig) {
      setSettings(prev => ({
        ...prev,
        name: voiceConfig.voiceAssistantName || '',
        avatarUrl: voiceConfig.voiceAssistantImageURL || '',
        // Map other voice config properties to settings as needed
      }));
    }
  }, [voiceConfig]);

  // Reset save messages
  const resetSaveMessages = () => {
    setSaveSuccess('');
    setSaveError('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : value;

    setSettings(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Reset save messages when settings change
    resetSaveMessages();
  };

  const handleImageChange = (file: File | null) => {
    if (file) {
      // Store the actual file for upload
      setSelectedImageFile(file);
      // Create a temporary URL for preview
      const imageUrl = URL.createObjectURL(file);
      setSettings(prev => ({
        ...prev,
        avatarUrl: imageUrl
      }));
      // Reset save messages when image changes
      setSaveSuccess('');
      setSaveError('');
    }
  };

  const saveSettings = async () => {
    try {
      if (activeTab === 'integrations') {
        // Trigger save in IntegrationTab by updating the trigger state
        setTriggerVoiceSave(prev => prev + 1);
      } else if (activeTab === 'general') {
        // Save general settings
        if (!voiceAssistantServiceId) {
          setSaveError('Voice assistant service not found. Please ensure the assistant is properly set up.');
          return;
        }

        // Validate required fields
        if (!settings.name.trim()) {
          setSaveError('Assistant name is required.');
          return;
        }

        resetSaveMessages();

        // Prepare the update data
        const updateData: {
          assistantServiceID: string;
          voiceAssistantName: string;
          voiceAssistantImage?: {
            file: File;
            fileName: string;
            contentType: string;
          };
        } = {
          assistantServiceID: voiceAssistantServiceId,
          voiceAssistantName: settings.name,
        };

        // Add image if a new one was selected
        if (selectedImageFile) {
          updateData.voiceAssistantImage = {
            file: selectedImageFile,
            fileName: selectedImageFile.name,
            contentType: selectedImageFile.type,
          };
        }

        console.log('Saving voice assistant general settings:', updateData);

        try {
          const result = await voiceService.updateVoiceAssistantConfiguration(updateData);
          console.log('General settings save result:', result);

          setSaveSuccess('Voice assistant settings updated successfully!');

          // Clear the selected image file since it's now saved
          setSelectedImageFile(null);

          // Auto-hide success message after 3 seconds
          setTimeout(() => {
            setSaveSuccess('');
          }, 3000);

        } catch (error) {
          console.error('Error saving general settings:', error);

          // Provide more specific error messages based on the error type
          if (error instanceof Error) {
            if (error.message.includes('configuration not found')) {
              setSaveError(
                'Voice configuration not found. This assistant may need to be initialized first. Please contact support if this issue persists.'
              );
            } else {
              setSaveError(error.message);
            }
          } else {
            setSaveError('Failed to save voice assistant settings. Please try again.');
          }
        }
      }
    } catch (error) {
      console.error('Error in saveSettings:', error);
      setSaveError('An unexpected error occurred. Please try again.');
    }
  };

  // Render the appropriate tab content based on activeTab state
  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralTab
          settings={settings}
          onChange={handleChange}
          onImageChange={handleImageChange}
          saveSuccess={saveSuccess}
          saveError={saveError}
        />;
      case 'integrations':
        return <IntegrationTab
          assistantId={assistantId}
          triggerSave={triggerVoiceSave}
        />;
      default:
        return <GeneralTab
          settings={settings}
          onChange={handleChange}
          onImageChange={handleImageChange}
          saveSuccess={saveSuccess}
          saveError={saveError}
        />;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-white/[0.03] dark:border-gray-800 overflow-auto min-h-[42rem]">
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Voice Assistant Settings</h2>

      {/* Loading State */}
      {/* {configLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          <span className="ml-3 text-gray-700 dark:text-gray-300">Loading voice assistant configuration...</span>
        </div>
      )} */}

      {/* Tab Content */}
      {!configLoading && renderTabContent()}

      {/* Action Buttons */}
      {!configLoading && (
        <div className="flex justify-start mt-8">
          <button
            onClick={saveSettings}
            className={`px-5 py-2.5 font-medium rounded-lg transition-colors focus:ring-4 bg-indigo-500 text-white hover:bg-indigo-600 focus:ring-indigo-300 dark:focus:ring-indigo-800`} 
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

export default VoiceAssistant;