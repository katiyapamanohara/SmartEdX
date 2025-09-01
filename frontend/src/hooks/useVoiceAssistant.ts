// Hook for managing voice assistant configuration and voices
import { useState, useEffect, useCallback } from 'react';
import { TokenManager } from '@/utils/tokenManager';
import { voiceService } from '@/services/voiceService';
import type { VoiceAssistantConfigurationResponse, Voice, VoiceListResponse } from '@/types/services';

interface AssistantService {
  assistantServiceID: string;
  serviceID: string;
  configuration?: unknown;
}

export interface UseVoiceAssistantConfigurationReturn {
  // Configuration-related
  configuration: VoiceAssistantConfigurationResponse['voiceAssistantConfiguration'] | null;
  voiceAssistantServiceId: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  
  // Voices-related
  voices: Voice[];
  voicesLoading: boolean;
  voicesError: string | null;
  refetchVoices: () => Promise<void>;
}

export const useVoiceAssistantConfiguration = (assistantId?: string): UseVoiceAssistantConfigurationReturn => {
  // Configuration state
  const [configuration, setConfiguration] = useState<VoiceAssistantConfigurationResponse['voiceAssistantConfiguration'] | null>(null);
  const [voiceAssistantServiceId, setVoiceAssistantServiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Voices state
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [voicesError, setVoicesError] = useState<string | null>(null);

  const fetchConfiguration = useCallback(async () => {
    if (!assistantId) {
      setError('Assistant ID is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch assistant service to get voice assistant configuration
      const token = TokenManager.getAccessToken();
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/assistant-services/${assistantId}?version=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // If it's a 404, it might just mean no assistant service exists yet (which is OK)
        if (response.status === 404) {
          console.log('No assistant service found - this is normal for new assistants');
          setConfiguration(null);
          setVoiceAssistantServiceId(null);
          setError(null); // Explicitly clear any previous errors
          return;
        }
        
        // For other HTTP errors, get more specific error info
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to fetch assistant service (${response.status})`);
        } catch {
          throw new Error(`Failed to fetch assistant service (${response.status})`);
        }
      }

      const data = await response.json();
      
      // Find the voice assistant service in the services array
      const voiceService = data.services?.find((service: AssistantService) => service.serviceID === 'voice-assistant');
      
      if (voiceService && voiceService.configuration) {
        // Extract voice assistant configuration from the voice assistant service
        const voiceConfig = voiceService.configuration;
        setConfiguration(voiceConfig);
        setVoiceAssistantServiceId(voiceService.assistantServiceID);
        console.log('Voice assistant service found:', voiceService);
        console.log('Voice assistant configuration loaded:', voiceConfig);
      } else {
        // No voice assistant service found or no configuration
        setConfiguration(null);
        setVoiceAssistantServiceId(null);
        console.log('No voice assistant service found in assistant services:', data.services?.map((s: AssistantService) => s.serviceID));
      }
    } catch (err) {
      console.error('Error fetching assistant service:', err);
      // Only set error for non-404 issues (404s are handled above and are normal)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch assistant service';
      console.log('Setting assistant service error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [assistantId]); // Add assistantId to dependencies

  const fetchVoices = useCallback(async () => {
    try {
      setVoicesLoading(true);
      setVoicesError(null);
      
      const response: VoiceListResponse = await voiceService.getVoices();
      
      if (response.success) {
        // Filter to only show active voices
        const activeVoices = response.voices.filter(voice => voice.isActive);
        setVoices(activeVoices);
      } else {
        setVoicesError(response.message || 'Failed to fetch voices');
      }
    } catch (err) {
      console.error('Error fetching voices:', err);
      setVoicesError(err instanceof Error ? err.message : 'Failed to fetch voices');
    } finally {
      setVoicesLoading(false);
    }
  }, []);

  useEffect(() => {
    // Auto-fetch configuration to check if it exists
    if (assistantId) { 
      fetchConfiguration(); 
    }
  }, [assistantId, fetchConfiguration]); // Include fetchConfiguration in dependencies

  useEffect(() => {
    // Fetch voices on mount
    fetchVoices();
  }, [fetchVoices]);

  return {
    // Configuration-related
    configuration,
    voiceAssistantServiceId,
    loading,
    error,
    refetch: fetchConfiguration,
    
    // Voices-related
    voices,
    voicesLoading,
    voicesError,
    refetchVoices: fetchVoices,
  };
};
