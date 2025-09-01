// API service for assistant services management
import { TokenManager } from '@/utils/tokenManager';
import { getErrorMessage, isApiError } from '@/utils/errorUtils';
import type {
  ServiceItem,
  ServiceListOutput,
  ServiceWithConfiguration,
  ServiceUpsertResult,
  ChatbotConfigurationUpdateData,
  ChatbotResponse,
  RawServiceData,
  RawAssistantServiceData
} from '@/types/services';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

class ServicesService {
  async getServices(): Promise<ServiceListOutput> {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    try {

      const response = await fetch(`${API_BASE_URL}/assistant-services/service`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });


      if (!response.ok) {
        try {
          const errorData = await response.json();
          console.error('Services API error:', errorData);

          if (isApiError(errorData.error)) {
            throw new Error(getErrorMessage(errorData.error));
          } else if (errorData.message) {
            throw new Error(getErrorMessage(errorData));
          } else {
            throw new Error('Failed to fetch services. Please try again.');
          }
        } catch (parseError) {
          if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
            throw parseError;
          }
          throw new Error('Failed to fetch services. Please try again.');
        }
      }

      const data = await response.json();

      // Handle different response formats from the API
      let servicesArray: RawServiceData[] = [];

      if (Array.isArray(data)) {
        servicesArray = data;
      } else if (data.services && Array.isArray(data.services)) {
        servicesArray = data.services;
      } else if (data.data && Array.isArray(data.data)) {
        servicesArray = data.data;
      } else {
        return { services: [] };
      }
      // Map the API response format to the internal format
      const mappedServices: ServiceItem[] = servicesArray
        .filter(item => item && typeof item === 'object')
        .map(item => ({
          id: (item.id || item.serviceID || item.service_id || '').toString(),
          serviceID: (item.serviceID || item.service_id || item.id || '').toString(),
          name: (item.serviceName || item.name || item.service_name || '').toString(),
          description: item.serviceDescription || item.description || `${item.serviceName || item.name || 'Service'} - AI-powered service for enhanced user experience`,
          icon: item.icon,
          color: item.color,
          category: item.category,
          isActive: item.isActive ?? item.is_active ?? true,
          createdAt: item.createdAt || item.created_at,
          updatedAt: item.updatedAt || item.updated_at,
        }));

      return {
        services: mappedServices,
        total: data.total || mappedServices.length
      };
    } catch (error) {
      console.error('Error fetching services:', error);
      throw error;
    }
  }
  /**
   * Get services for a specific assistant
   * @param assistantID - The ID of the assistant
   * @returns Promise<string[]> - Array of service IDs enabled for the assistant
   */
  async getAssistantServices(assistantID: string): Promise<string[]> {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/assistant-services/${assistantID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          console.error('Get assistant services API error:', errorData);

          if (isApiError(errorData.error)) {
            throw new Error(getErrorMessage(errorData.error));
          } else if (errorData.message) {
            throw new Error(getErrorMessage(errorData));
          } else {
            throw new Error('Failed to fetch assistant services. Please try again.');
          }
        } catch (parseError) {
          if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
            throw parseError;
          }
          throw new Error('Failed to fetch assistant services. Please try again.');
        }
      }

      const data = await response.json();
      // Handle different response formats
      if (Array.isArray(data)) {
        return data
          .map((service: RawAssistantServiceData) => service.serviceID || service.service_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0);
      } else if (data.services && Array.isArray(data.services)) {
        return data.services.map((service: RawAssistantServiceData) => service.serviceID || service.service_id);
      } else if (data.data && Array.isArray(data.data)) {
        return data.data.map((service: RawAssistantServiceData) => service.serviceID || service.service_id);
      } else if (data.serviceIDs && Array.isArray(data.serviceIDs)) {
        return data.serviceIDs;
      }

      return [];
    } catch (error) {
      console.error('Error fetching assistant services:', error);
      throw error;
    }
  }

  /**
   * Get a specific service configuration for an assistant
   * @param assistantID - The ID of the assistant
   * @param assistantServiceID - The ID of the assistant service
   * @returns Promise<ServiceWithConfiguration> - The service configuration
   */
  async getServiceConfiguration(assistantID: string, assistantServiceID: string): Promise<ServiceWithConfiguration> {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/assistant-services/${assistantID}?assistantServiceID=${assistantServiceID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          console.error('Get service configuration API error:', errorData);

          if (isApiError(errorData.error)) {
            throw new Error(getErrorMessage(errorData.error));
          } else if (errorData.message) {
            throw new Error(getErrorMessage(errorData));
          } else {
            throw new Error('Failed to fetch service configuration. Please try again.');
          }
        } catch (parseError) {
          if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
            throw parseError;
          }
          throw new Error('Failed to fetch service configuration. Please try again.');
        }
      }

      const data = await response.json();

      // Log all available properties
      if (data && typeof data === 'object') {
        if (data.configuration && typeof data.configuration === 'object') {
        }
      }

      // If this is a chatbot configuration, make sure we're getting the chatbotName
      if (data.serviceID === 'chatbot' && data.configuration) {
      }
      // Handle different response formats
      let serviceConfig: ServiceWithConfiguration;

      if (Array.isArray(data) && data.length > 0) {
        serviceConfig = data[0];
      } else if (data.services && Array.isArray(data.services) && data.services.length > 0) {
        // Handle the API response format: { assistantID, services: [...] }
        serviceConfig = data.services[0];
      } else if (data.service) {
        serviceConfig = data.service;
      } else {
        serviceConfig = data;
      }

      return serviceConfig;
    } catch (error) {
      console.error('Error fetching service configuration:', error);
      throw error;
    }
  }

  /**
   * Upsert (create or update) services for an assistant
   * @param assistantID - The ID of the assistant
   * @param serviceIDs - Array of service IDs to enable
   * @returns Promise<ServiceUpsertResult> - The result of the upsert operation
   */
  async upsertServices(assistantID: string, serviceIDs: string[]): Promise<ServiceUpsertResult> {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    try {

      const payload = {
        assistantID,
        serviceIDs
      };

      const response = await fetch(`${API_BASE_URL}/assistant-services/upsert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });


      if (!response.ok) {
        try {
          const errorData = await response.json();
          console.error('Upsert services API error:', errorData);

          if (isApiError(errorData.error)) {
            throw new Error(getErrorMessage(errorData.error));
          } else if (errorData.message) {
            throw new Error(getErrorMessage(errorData));
          } else {
            throw new Error('Failed to upsert services. Please try again.');
          }
        } catch (parseError) {
          if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
            throw parseError;
          }
          throw new Error('Failed to upsert services. Please try again.');
        }
      }

      const data = await response.json();

      return {
        assistantID: data.assistantID || assistantID,
        services: data.services || []
      };
    } catch (error) {
      console.error('Error upserting services:', error);
      throw error;
    }
  }

  /**
   * Save a service configuration for an assistant
   * @param assistantID - The ID of the assistant
   * @param assistantServiceID - The ID of the assistant service
   * @param configuration - The configuration to save
   * @returns Promise<ServiceWithConfiguration> - The saved service configuration
   */
  async saveServiceConfiguration(
    assistantID: string,
    assistantServiceID: string,
    configuration: ChatbotConfigurationUpdateData
  ): Promise<ServiceWithConfiguration> {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    try {

      const payload = {
        assistantID,
        assistantServiceID,
        configuration
      };

      const response = await fetch(`${API_BASE_URL}/services/chatbot-configuration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          console.error('Save service configuration API error:', errorData);

          if (isApiError(errorData.error)) {
            throw new Error(getErrorMessage(errorData.error));
          } else if (errorData.message) {
            throw new Error(getErrorMessage(errorData));
          } else {
            throw new Error('Failed to save service configuration. Please try again.');
          }
        } catch (parseError) {
          if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
            throw parseError;
          }
          throw new Error('Failed to save service configuration. Please try again.');
        }
      }

      const data = await response.json();

      return data;
    } catch (error) {
      console.error('Error saving service configuration:', error);
      throw error;
    }
  }

  /**
   * Update chatbot configuration
   * @param assistantServiceID - The ID of the assistant service (in format {assistantId}-chatbot)
   * @param configData - Configuration data for the chatbot
   * @param files - Optional files (chatbot image and widget icon)
   * @returns Promise<any> - The updated chatbot configuration
   */
  async updateChatbotConfiguration(
    assistantServiceID: string,
    configData: ChatbotConfigurationUpdateData,
    files?: {
      chatbotImage?: File;
      webWidgetDisplayIcon?: File;
    }
  ): Promise<ChatbotResponse> {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    } try {
      const formData = new FormData();      // Only include fields that are defined and not null
      // This matches the backend controller's conditional property inclusion

      // Always include chatbotName regardless of value (required by the backend)
      if (configData.chatbotName !== undefined) {
        // Make sure it's never empty (backend requires at least 1 character)
        const nameToUse = configData.chatbotName.trim() || 'Unnamed Chatbot';
        formData.append('chatbotName', nameToUse);
      } else {
        // Default fallback in case it's undefined
        formData.append('chatbotName', 'Unnamed Chatbot');
      }// Special handling for image URLs - send null for clearing, value for keeping/updating
      if (configData.chatbotImageURL !== undefined) {
        const imageValue = configData.chatbotImageURL === '' ? 'null' : (configData.chatbotImageURL || 'null');
        formData.append('chatbotImageURL', imageValue);
      }

      if (configData.webWidgetThemeColor !== undefined && configData.webWidgetThemeColor !== null) {
        formData.append('webWidgetThemeColor', configData.webWidgetThemeColor);
      }

      if (configData.webWidgetDisplayName !== undefined && configData.webWidgetDisplayName !== null) {
        formData.append('webWidgetDisplayName', configData.webWidgetDisplayName);
      }      // Special handling for display icon URL - try different approaches for clearing
      if (configData.webWidgetDisplayIconURL !== undefined) {
        if (configData.webWidgetDisplayIconURL === '') {
          // Try multiple approaches to clear the field for maximum backend compatibility
          formData.append('webWidgetDisplayIconURL', '');
          formData.append('webWidgetDisplayIconURL_null', 'null');
          formData.append('clearDisplayIcon', 'true');
          // Additional approaches that different backends might expect
          formData.append('webWidgetDisplayIconURL_clear', 'true');
          formData.append('removeDisplayIcon', 'true');
        } else if (configData.webWidgetDisplayIconURL) {
          formData.append('webWidgetDisplayIconURL', configData.webWidgetDisplayIconURL);
        }
      }

      if (configData.webWidgetFontSize !== undefined && configData.webWidgetFontSize !== null) {
        formData.append('webWidgetFontSize', configData.webWidgetFontSize);
      }

      if (configData.webWidgetBotMessageColor !== undefined && configData.webWidgetBotMessageColor !== null) {
        formData.append('webWidgetBotMessageColor', configData.webWidgetBotMessageColor);
      }

      if (configData.webWidgetUserMessageColor !== undefined && configData.webWidgetUserMessageColor !== null) {
        formData.append('webWidgetUserMessageColor', configData.webWidgetUserMessageColor);
      }

      // Add files if provided
      if (files?.chatbotImage) {
        formData.append('chatbotImage', files.chatbotImage);
      }

      if (files?.webWidgetDisplayIcon) {
        formData.append('webWidgetDisplayIcon', files.webWidgetDisplayIcon);
      }
      // Use the exact URL structure from the controller
      const url = `${API_BASE_URL}/services/chatbot-configuration/${assistantServiceID}`;

      try {
        const response = await fetch(url, {
          method: 'PATCH', // Match the controller's @Patch annotation
          headers: {
            // Do not set Content-Type for FormData as the browser will set it with the correct boundary
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });


        if (response.ok) {
          try {
            const data = await response.json();
            return {
              assistantServiceID: data.assistantServiceID || assistantServiceID,
              ...data
            };
          } catch {
            return { assistantServiceID, success: true, message: 'Configuration updated successfully' };
          }
        }

        // If not successful, handle the error
        await this.handleChatbotConfigError(response);
      } catch (fetchError) {
        console.error('Fetch error in updateChatbotConfiguration:', fetchError);
        throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'}`);
      }

      // This should never be reached because handleApiError throws
      throw new Error('Failed to update chatbot configuration');
    } catch (error) {
      console.error('Error updating chatbot configuration:', error);
      throw error;
    }
  }

  /**
   * Update chatbot configuration without files (JSON-only version)
   * This is an alternative method that tries to update only the configuration fields
   * using a JSON body instead of FormData, which might be more compatible with some APIs
   */
  async updateChatbotConfigurationJson(
    assistantServiceID: string,
    configData: {
      assistantID?: string;
      assistantServiceID?: string;
      chatbotName?: string;
      webWidgetThemeColor?: string | null;
      webWidgetDisplayName?: string | null;
      webWidgetFontSize?: string | null;
      webWidgetBotMessageColor?: string | null;
      webWidgetUserMessageColor?: string | null;
    }
  ): Promise<ChatbotResponse> {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      // Clean up the payload by removing any null/undefined values
      const cleanedData = Object.fromEntries(
        Object.entries(configData).filter(([, v]) => v != null && v !== '')
      );

      // Create payload object
      const payload = {
        ...cleanedData,
        assistantServiceID: assistantServiceID
      };

      // Make request to the chatbot configuration endpoint 
      const url = `${API_BASE_URL}/services/chatbot-configuration`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        try {
          const data = await response.json();
          return {
            assistantServiceID: data.assistantServiceID || assistantServiceID,
            ...data
          };
        } catch (jsonError) {
          console.warn('Could not parse JSON response, but request was successful:', jsonError);
          // Even if we can't parse the response, consider it a success if status is OK
          return { assistantServiceID, success: true, message: 'Configuration updated successfully' };
        }
      }

      // If not successful, handle the error
      await this.handleChatbotConfigError(response);

      // This should never be reached because handleChatbotConfigError throws
      throw new Error('Failed to update chatbot configuration with JSON');
    } catch (error) {
      console.error('Error updating chatbot configuration with JSON:', error);
      throw error;
    }
  }
  /**
   * Helper method to handle API errors
   * @param response - The failed response object
   */
  private async handleApiError(response: Response): Promise<never> {
    console.error(`API error: Status ${response.status} - ${response.statusText}`);
    console.error('API error URL:', response.url);
    console.error('API error headers:', Object.fromEntries([...response.headers.entries()]));

    try {
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          console.error('JSON error details:', errorData);
          console.error('Full error data structure:', JSON.stringify(errorData, null, 2));

          if (isApiError(errorData.error)) {
            throw new Error(getErrorMessage(errorData.error));
          } else if (errorData.message) {
            throw new Error(getErrorMessage(errorData));
          } else {
            throw new Error(`API error (${response.status}): ${JSON.stringify(errorData)}`);
          }
        } catch (jsonError) {
          console.error('Error parsing JSON error response:', jsonError);
          throw new Error(`API error (${response.status}): Invalid JSON response`);
        }
      } else {
        // For non-JSON responses, try to get the text
        const errorText = await response.text();
        console.error('Non-JSON error response text:', errorText);
        console.error('Response URL:', response.url);
        throw new Error(`API error (${response.status}): ${errorText || response.statusText}`);
      }
    } catch (parseError) {
      if (parseError instanceof Error) {
        throw parseError;
      }
      throw new Error(`API error (${response.status}): ${response.statusText}`);
    }
  }
  // Extended error handling specifically for chatbot configuration updates
  private async handleChatbotConfigError(response: Response): Promise<never> {
    console.error(`Chatbot config API error: Status ${response.status} - ${response.statusText}`);
    console.error('API error URL:', response.url);
    console.error('API error headers:', Object.fromEntries([...response.headers.entries()]));

    try {
      const errorText = await response.text();
      console.error('Error response text:', errorText);

      try {
        // Try to parse as JSON
        const errorJson = JSON.parse(errorText);
        console.error('Error JSON:', errorJson);

        // Check for specific error patterns
        if (errorJson.message) {
          throw new Error(`API error (${response.status}): ${errorJson.message}`);
        } else if (errorJson.error) {
          throw new Error(`API error (${response.status}): ${typeof errorJson.error === 'string' ?
            errorJson.error : JSON.stringify(errorJson.error)}`);
        } else {
          throw new Error(`API error (${response.status}): ${JSON.stringify(errorJson)}`);
        }
      } catch (jsonError) {
        // If not valid JSON, use the text
        if (jsonError instanceof SyntaxError) {
          throw new Error(`API error (${response.status}): ${errorText || response.statusText}`);
        }
        throw jsonError; // Re-throw if it's our custom error
      }
    } catch (parseError) {
      if (parseError instanceof Error) {
        throw parseError;
      }
      throw new Error(`API error (${response.status}): ${response.statusText}`);
    }
  }

  /**
   * Delete/clear the web widget display icon
   * @param assistantServiceID - The ID of the assistant service
   * @returns Promise<any> - The updated configuration
   */
  async clearWebWidgetDisplayIcon(assistantServiceID: string): Promise<ChatbotResponse> {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      const url = `${API_BASE_URL}/services/chatbot-configuration/${assistantServiceID}/display-icon`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        try {
          const data = await response.json();
          return data;
        } catch (jsonError) {
          console.warn('Could not parse JSON response, but delete was successful:', jsonError);
          return { success: true, message: 'Display icon cleared successfully' };
        }
      }

      // If not successful, handle the error
      await this.handleChatbotConfigError(response);

      // This should never be reached because handleChatbotConfigError throws
      throw new Error('Failed to clear display icon');
    } catch (error) {
      console.error('Error clearing display icon:', error);
      throw error;
    }
  }

  /**
   * Delete/clear the chatbot image
   * @param assistantServiceID - The ID of the assistant service  
   * @returns Promise<any> - The updated configuration
   */
  async clearChatbotImage(assistantServiceID: string): Promise<ChatbotResponse> {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      const url = `${API_BASE_URL}/services/chatbot-configuration/${assistantServiceID}/chatbot-image`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        try {
          const data = await response.json();
          return data;
        } catch (jsonError) {
          console.warn('Could not parse JSON response, but delete was successful:', jsonError);
          return { success: true, message: 'Chatbot image cleared successfully' };
        }
      }

      // If not successful, handle the error
      await this.handleChatbotConfigError(response);

      // This should never be reached because handleChatbotConfigError throws
      throw new Error('Failed to clear chatbot image');
    } catch (error) {
      console.error('Error clearing chatbot image:', error);
      throw error;
    }
  }
}

export const servicesService = new ServicesService();
