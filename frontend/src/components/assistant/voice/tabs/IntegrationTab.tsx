'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useVoiceAssistantConfiguration } from '@/hooks/useVoiceAssistant';
import { voiceService } from '@/services/voiceService';
import type { Voice } from '@/types/services';

interface VoiceOption {
  id: string;
  name: string;
  location: string;
  description: string;
  imageSrc: string;
  audioSrc: string; // Path to audio sample
  gender: string;
  accent: string;
  language: string;
}

interface VoiceSettings {
  pitch: number;
  speed: number;
  volume: number;
  accentStrength: number;
}

interface IntegrationTabProps {
  assistantId?: string;
  triggerSave?: number;
}

const IntegrationTab: React.FC<IntegrationTabProps> = ({ assistantId, triggerSave }) => {
  // Local state for tabs and voice selection
  const [activeSubTab, setActiveSubTab] = useState<'voice' | 'settings'>('voice');
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [playProgress, setPlayProgress] = useState<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ref to store the latest save configuration function
  const saveConfigurationRef = useRef<(() => Promise<void>) | null>(null);

  // Fetch voices and configuration from combined hook
  const { 
    // Configuration-related
    configuration: existingConfig, 
    voiceAssistantServiceId,
    loading: configLoading, 
    error: configError,
    // Voices-related  
    voices: apiVoices, 
    voicesLoading, 
    voicesError 
  } = useVoiceAssistantConfiguration(assistantId);

  // Voice settings with default values
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    pitch: 1.0,
    speed: 1.0,
    volume: 0.8,
    accentStrength: 0.5
  });

  // Save state
  const [saveSuccess, setSaveSuccess] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');

  // Reset save messages
  const resetSaveMessages = () => {
    setSaveSuccess('');
    setSaveError('');
  };

  // Load existing configuration into form
  useEffect(() => {
    if (existingConfig && !configLoading) {
      // Set voice selection if available
      if (existingConfig.selectedVoice) {
        setSelectedVoice(existingConfig.selectedVoice);
      }

      // Helper function to safely convert values to numbers with fallbacks
      const safeNumber = (value: unknown, fallback: number): number => {
        if (value === null || value === undefined) return fallback;
        const num = typeof value === 'string' ? parseFloat(value) : Number(value);
        return isNaN(num) ? fallback : num;
      };

      // Set voice settings if available, converting from API format (0-100) to component format (0-1) with safe number conversion
      setVoiceSettings({
        pitch: safeNumber(existingConfig.pitch, 1.0),
        speed: safeNumber(existingConfig.speed, 1.0),
        volume: existingConfig.volume ? safeNumber(existingConfig.volume, 80) / 100 : 0.8, // Convert from 0-100 to 0-1
        accentStrength: existingConfig.accentStrength ? safeNumber(existingConfig.accentStrength, 50) / 100 : 0.5, // Convert from 0-100 to 0-1
      });
    }
  }, [existingConfig, configLoading]);

  // Transform API voices to VoiceOption format
  const transformVoiceToOption = (voice: Voice): VoiceOption => {
    // Get a default avatar based on gender and accent
    const getAvatarImage = (gender: string, accent: string) => {
      const genderLower = gender.toLowerCase();
      const accentLower = accent.toLowerCase();

      if (genderLower === 'female') {
        if (accentLower.includes('usa') || accentLower.includes('american')) {
          return '/images/user/user-08.jpg';
        } else if (accentLower.includes('uk') || accentLower.includes('british')) {
          return '/images/user/user-09.jpg';
        } else {
          return '/images/user/user-27.jpg';
        }
      } else {
        if (accentLower.includes('uk') || accentLower.includes('british')) {
          return '/images/user/user-22.jpg';
        } else {
          return '/images/user/user-01.jpg';
        }
      }
    };

    return {
      id: voice.voiceID,
      name: `${voice.voiceName} (${voice.voiceAccent})`,
      location: voice.voiceAccent,
      description: `${voice.voiceGender} voice with ${voice.voiceAccent} accent, speaking ${voice.voiceLanguage}`,
      imageSrc: getAvatarImage(voice.voiceGender, voice.voiceAccent),
      audioSrc: voice.voiceSampleURL,
      gender: voice.voiceGender,
      accent: voice.voiceAccent,
      language: voice.voiceLanguage
    };
  };

  // Convert API voices to VoiceOption format
  const voiceOptions: VoiceOption[] = apiVoices.map(transformVoiceToOption);

  // Helper function to safely display numeric values
  const safeDisplayNumber = (value: unknown, fallback: number, decimals: number = 1): string => {
    let num: number;

    if (typeof value === 'number' && !isNaN(value)) {
      num = value;
    } else if (typeof value === 'string') {
      const parsed = parseFloat(value);
      num = isNaN(parsed) ? fallback : parsed;
    } else {
      num = fallback;
    }

    return num.toFixed(decimals);
  };

  // Helper function to safely display percentage values
  const safeDisplayPercentage = (value: unknown, fallback: number): string => {
    let num: number;

    if (typeof value === 'number' && !isNaN(value)) {
      num = value;
    } else if (typeof value === 'string') {
      const parsed = parseFloat(value);
      num = isNaN(parsed) ? fallback : parsed;
    } else {
      num = fallback;
    }

    return Math.round(num * 100).toString();
  };

  // Handle voice selection
  const handleSelectVoice = (voiceId: string) => {
    setSelectedVoice(voiceId);
    // If we're in voice tab and select a voice, auto-move to settings tab
    if (activeSubTab === 'voice') {
      setActiveSubTab('settings');
    }
  };

  // Handle voice playback
  const handlePlayVoice = (voiceId: string, audioSrc: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card selection

    // Stop any currently playing audio and progress tracking
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    // Reset progress for all voices
    setPlayProgress({});

    // If the same voice is clicked again while playing, just stop it
    if (isPlaying === voiceId) {
      setIsPlaying(null);
      return;
    }

    // Create and play the audio
    const audio = new Audio(audioSrc);
    audioRef.current = audio;

    // Apply current voice settings to audio playback
    audio.playbackRate = voiceSettings.speed;
    audio.volume = voiceSettings.volume;

    // Play the audio
    audio.play();
    setIsPlaying(voiceId);

    // Start progress tracking
    progressIntervalRef.current = setInterval(() => {
      if (audio && audio.duration > 0) {
        const progress = (audio.currentTime / audio.duration) * 100;
        setPlayProgress(prev => ({
          ...prev,
          [voiceId]: progress
        }));

        if (progress >= 100) {
          clearInterval(progressIntervalRef.current!);
          progressIntervalRef.current = null;
        }
      }
    }, 100);

    // When audio ends, reset playing state
    audio.onended = () => {
      setIsPlaying(null);
      clearInterval(progressIntervalRef.current!);
      progressIntervalRef.current = null;
    };
  };

  // Handle settings changes
  const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = parseFloat(value);
    // Ensure we always have a valid number, fallback to default values if NaN
    const safeValue = isNaN(numericValue) ?
      (name === 'pitch' || name === 'speed' ? 1.0 :
        name === 'volume' ? 0.8 : 0.5) : numericValue;

    setVoiceSettings(prev => ({
      ...prev,
      [name]: safeValue
    }));
    // Reset save messages when settings change
    resetSaveMessages();
  };

  // Handle saving voice configuration
  const handleSaveConfiguration = useCallback(async () => {
    if (!voiceAssistantServiceId) {
      setSaveError('Voice assistant service not found. Please ensure the assistant is properly set up.');
      return;
    }

    if (!selectedVoice) {
      setSaveError('Please select a voice before saving');
      return;
    }

    const selectedVoiceData = voiceOptions.find(v => v.id === selectedVoice);
    if (!selectedVoiceData) {
      setSaveError('Selected voice data not found');
      return;
    }

    try {
      resetSaveMessages();

      const updateData = {
        assistantServiceID: voiceAssistantServiceId,
        selectedVoice: selectedVoice,
        selectedVoiceLanguage: selectedVoiceData.language,
        selectedVoiceAccent: selectedVoiceData.accent,
        pitch: voiceSettings.pitch,
        speed: voiceSettings.speed,
        volume: voiceSettings.volume * 100, // Convert to 0-100 range for API
        accentStrength: voiceSettings.accentStrength * 100, // Convert to 0-100 range for API
      };

      await voiceService.saveVoiceAssistantConfiguration(updateData);

      setSaveSuccess('Voice configuration saved successfully!');

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess('');
      }, 3000);

    } catch (error) {
      console.error('Error saving voice configuration:', error);

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
        setSaveError('Failed to save voice configuration. Please try again.');
      }
    }
  }, [voiceAssistantServiceId, selectedVoice, voiceOptions, voiceSettings]);

  // Update the ref whenever the function changes
  useEffect(() => {
    saveConfigurationRef.current = handleSaveConfiguration;
  }, [handleSaveConfiguration]);

  // Watch for triggerSave changes to perform save
  useEffect(() => {
    if (triggerSave && triggerSave > 0 && saveConfigurationRef.current) {
      saveConfigurationRef.current();
    }
  }, [triggerSave]);

  // Render the voice selection tab with new card design
  const renderVoiceTab = () => (
    <div>
      <h2 className="text-xl font-semibold mb-1">Select Voice</h2>
      <p className="text-gray-500 mb-6">Choose a voice for your assistant</p>

      {/* Loading State */}
      {voicesLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      )}

      {/* Error State - Only show if voices fail to load, not configuration */}
      {voicesError && !voicesLoading && (
        <div className="text-center py-12">
          <div className="text-red-500 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Failed to Load Voices</h3>
          <p className="text-gray-500 mb-4">{voicesError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Configuration Error Warning - Non-blocking */}
      {configError && voiceOptions.length > 0 && !configError.includes('404') && !configError.includes('not found') && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <svg className="h-4 w-4 text-yellow-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-sm text-yellow-700">
                <strong>Configuration Notice:</strong> Could not load existing voice settings. You can still select and save a voice, but the assistant may need to be properly initialized first.
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                If you encounter issues saving, please ensure the assistant is fully set up or contact support.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!voicesLoading && !voicesError && voiceOptions.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Voices Available</h3>
          <p className="text-gray-500">No active voices are currently available.</p>
        </div>
      )}

      {/* Voice Options Grid */}
      {!voicesLoading && !voicesError && voiceOptions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {voiceOptions.map((voice) => (
            <div
              key={voice.id}
              onClick={() => handleSelectVoice(voice.id)}
              className={`border bg-white border-gray-200 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${selectedVoice === voice.id ? 'ring-2 ring-indigo-500' : ''
                }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 overflow-hidden rounded-lg bg-gray-100 flex-shrink-0">
                  <Image
                    src={voice.imageSrc}
                    alt={voice.name}
                    className="w-full h-full object-cover"
                    width={64}
                    height={64}
                  />
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{voice.name}</h3>
                  <p className="mt-1 text-sm text-gray-700 line-clamp-2">{voice.description}</p>

                  {/* Voice Details */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {voice.gender}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {voice.language}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center">
                    <button
                      onClick={(e) => handlePlayVoice(voice.id, voice.audioSrc, e)}
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                    >
                      {isPlaying === voice.id ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>

                    <div className="ml-3 flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 transition-all duration-100"
                        style={{ width: `${playProgress[voice.id] || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Success and Error Messages for Voice Tab */}
      {!voicesLoading && !voicesError && voiceOptions.length > 0 && (
        <>
          {/* Success Message */}
          {saveSuccess && (
            <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
              <div className="flex items-center">
                <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-green-700 dark:text-green-400">{saveSuccess}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {saveError && (
            <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
              <div className="flex items-center">
                <svg className="h-4 w-4 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700 dark:text-red-400">{saveError}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  // Render the voice settings tab
  const renderSettingsTab = () => {
    const selectedVoiceData = voiceOptions.find(v => v.id === selectedVoice);

    return selectedVoice ? (
      <div>
        <h2 className="text-xl font-semibold mb-1">Voice Settings</h2>
        <p className="text-gray-500 mb-6">Customize how your selected voice sounds</p>

        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex items-center">
            <div className="w-14 h-14 overflow-hidden rounded-full">
              <Image
                src={selectedVoiceData?.imageSrc || ''}
                alt={selectedVoiceData?.name || ''}
                className="w-full h-full object-cover"
                width={56}
                height={56}
              />
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-gray-900">{selectedVoiceData?.name}</h3>
              <div className="flex items-center mt-1">
                <button
                  onClick={(e) => selectedVoiceData && handlePlayVoice(selectedVoiceData.id, selectedVoiceData.audioSrc, e)}
                  className={`flex items-center text-sm ${isPlaying === selectedVoiceData?.id ? 'text-indigo-600' : 'text-gray-500'} hover:text-indigo-600`}
                >
                  <span className="mr-1">Listen to sample</span>
                  {isPlaying === selectedVoiceData?.id ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Pitch Control */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Pitch</label>
              <span className="text-sm text-gray-500">{safeDisplayNumber(voiceSettings.pitch, 1.0)}</span>
            </div>
            <input
              type="range"
              name="pitch"
              min="0.5"
              max="2"
              step="0.1"
              value={voiceSettings.pitch}
              onChange={handleSettingChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>Lower</span>
              <span>Higher</span>
            </div>
          </div>

          {/* Speed Control */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Speed</label>
              <span className="text-sm text-gray-500">{safeDisplayNumber(voiceSettings.speed, 1.0)}</span>
            </div>
            <input
              type="range"
              name="speed"
              min="0.5"
              max="2"
              step="0.1"
              value={voiceSettings.speed}
              onChange={handleSettingChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>Slower</span>
              <span>Faster</span>
            </div>
          </div>

          {/* Volume Control */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Volume</label>
              <span className="text-sm text-gray-500">{safeDisplayPercentage(voiceSettings.volume, 0.8)}%</span>
            </div>
            <input
              type="range"
              name="volume"
              min="0"
              max="1"
              step="0.05"
              value={voiceSettings.volume}
              onChange={handleSettingChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>Quieter</span>
              <span>Louder</span>
            </div>
          </div>

          {/* Accent Strength Control */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Accent Strength</label>
              <span className="text-sm text-gray-500">{safeDisplayPercentage(voiceSettings.accentStrength, 0.5)}%</span>
            </div>
            <input
              type="range"
              name="accentStrength"
              min="0"
              max="1"
              step="0.05"
              value={voiceSettings.accentStrength}
              onChange={handleSettingChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>Neutral</span>
              <span>Strong</span>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {saveSuccess && (
          <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
            <div className="flex items-center">
              <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-green-700 dark:text-green-400">{saveSuccess}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {saveError && (
          <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-center">
              <svg className="h-4 w-4 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700 dark:text-red-400">{saveError}</p>
            </div>
          </div>
        )}
      </div>
    ) : (
      <div className="text-center py-10">
        <div className="text-gray-400 mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Voice Selected</h3>
        <p className="text-gray-500">Please go back to the Voice tab and select a voice first.</p>
        <button
          onClick={() => setActiveSubTab('voice')}
          className="mt-4 px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
        >
          Select a Voice
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveSubTab('voice')}
          className={`px-6 py-3 font-medium rounded-lg transition-colors ${activeSubTab === 'voice'
              ? 'bg-indigo-500 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
        >
          Voice
        </button>
        <button
          onClick={() => setActiveSubTab('settings')}
          className={`px-6 py-3 font-medium rounded-lg transition-colors ${activeSubTab === 'settings'
              ? 'bg-indigo-500 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
        >
          Settings
        </button>
      </div>

      {/* Tab Content */}
      {activeSubTab === 'voice' ? renderVoiceTab() : renderSettingsTab()}
    </div>
  );
};

export default IntegrationTab;