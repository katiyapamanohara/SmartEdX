// API service for voice operations
import { TokenManager } from '@/utils/tokenManager';
import { getErrorMessage, isApiError } from '@/utils/errorUtils';
import type { 
  VoiceListResponse, 
  VoiceAssistantConfigurationUpdate, 
  VoiceAssistantConfigurationResponse 
} from '@/types/services';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

class VoiceService {
  async getVoices(): Promise<VoiceListResponse> {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/services/voice-assistant-configuration/voices?version=1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();

        if (isApiError(errorData.error)) {
          throw new Error(getErrorMessage(errorData.error));
        } else if (errorData.message) {
          throw new Error(getErrorMessage(errorData));
        } else {
          throw new Error('Failed to fetch voices. Please try again.');
        }
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
          throw parseError;
        }
        throw new Error('Failed to fetch voices. Please try again.');
      }
    }

    const data = await response.json();

    // Handle direct array response from API
    if (Array.isArray(data)) {
      return {
        voices: data,
        success: true,
        message: 'Voices loaded successfully'
      };
    }

    // Handle wrapped response format (data.voices)
    if (data && Array.isArray(data.voices)) {
      return {
        voices: data.voices,
        success: data.success ?? true,
        message: data.message
      };
    }

    // Handle response with data property
    if (data && data.data && Array.isArray(data.data)) {
      return {
        voices: data.data,
        success: data.success ?? true,
        message: data.message
      };
    }

    // Invalid response format
    return {
      voices: [],
      success: false,
      message: 'Invalid response format'
    };
  }

  private async createFormData(data: VoiceAssistantConfigurationUpdate): Promise<FormData> {
    const formData = new FormData();

    // Add all fields to FormData
    if (data.voiceAssistantName !== undefined) {
      formData.append('voiceAssistantName', data.voiceAssistantName);
    }
    if (data.selectedVoice !== undefined) {
      formData.append('selectedVoice', data.selectedVoice);
    }
    if (data.selectedVoiceLanguage !== undefined) {
      formData.append('selectedVoiceLanguage', data.selectedVoiceLanguage);
    }
    if (data.selectedVoiceAccent !== undefined) {
      formData.append('selectedVoiceAccent', data.selectedVoiceAccent);
    }
    if (data.pitch !== undefined) {
      formData.append('pitch', data.pitch.toString());
    }
    if (data.speed !== undefined) {
      formData.append('speed', data.speed.toString());
    }
    if (data.volume !== undefined) {
      formData.append('volume', data.volume.toString());
    }
    if (data.accentStrength !== undefined) {
      formData.append('accentStrength', data.accentStrength.toString());
    }
    if (data.telephonyIntegrationDetails !== undefined) {
      formData.append('telephonyIntegrationDetails', data.telephonyIntegrationDetails);
    }
    if (data.webWidgetEnabled !== undefined) {
      formData.append('webWidgetEnabled', data.webWidgetEnabled.toString());
    }
    if (data.voiceAssistantImage) {
      formData.append('voiceAssistantImage', data.voiceAssistantImage.file, data.voiceAssistantImage.fileName);
    }

    return formData;
  }

  async updateVoiceAssistantConfiguration(data: VoiceAssistantConfigurationUpdate): Promise<VoiceAssistantConfigurationResponse> {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    const formData = await this.createFormData(data);

    const updateUrl = `${API_BASE_URL}/services/voice-assistant-configuration/${data.assistantServiceID}?version=1`;
    console.log('Updating voice assistant configuration with URL:', updateUrl);

    const response = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type header when using FormData - browser will set it with boundary
      },
      body: formData,
    });

    // Handle 404 specifically - configuration doesn't exist yet
    if (response.status === 404) {
      console.log('Voice assistant configuration not found (404)');
      throw new Error('Voice assistant configuration not found. Please ensure the assistant is properly set up before configuring voice settings.');
    }

    if (!response.ok) {
      console.error('Failed to update voice assistant configuration:', response.status, response.statusText);
      try {
        const errorData = await response.json();
        console.error('Update configuration error details:', errorData);

        if (isApiError(errorData.error)) {
          throw new Error(getErrorMessage(errorData.error));
        } else if (errorData.message) {
          throw new Error(getErrorMessage(errorData));
        } else {
          throw new Error(`Failed to update voice assistant configuration (${response.status}). Please try again.`);
        }
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
          throw parseError;
        }
        throw new Error(`Failed to update voice assistant configuration (${response.status}). Please try again.`);
      }
    }

    const result = await response.json();

    return {
      ...result,
      success: true,
      message: result.message || 'Voice assistant configuration updated successfully'
    };
  }

  async saveVoiceAssistantConfiguration(data: VoiceAssistantConfigurationUpdate): Promise<VoiceAssistantConfigurationResponse> {
    // Since there's no create endpoint, we can only update existing configurations
    return this.updateVoiceAssistantConfiguration(data);
  }
}

export const voiceService = new VoiceService();
export default voiceService;

// Re-export types for convenience
export type { 
  Voice, 
  VoiceListResponse, 
  VoiceAssistantConfigurationUpdate, 
  VoiceAssistantConfigurationResponse 
} from '@/types/services';
