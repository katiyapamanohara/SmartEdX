// API service for assistant management
import { TokenManager } from '@/utils/tokenManager';
import { getErrorMessage, isApiError } from '@/utils/errorUtils';
import type {
  Assistant,
  CreateAssistantFormData,
  RawAssistantData
} from '@/types/assistant';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

class AssistantService {

  async getUserAssistants(): Promise<Assistant[]> {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/assistants`, {
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
          throw new Error('Failed to fetch assistants. Please try again.');
        }
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
          throw parseError;
        }
        throw new Error('Failed to fetch assistants. Please try again.');
      }
    }

    const data = await response.json();

    // Handle different response formats from the API
    let assistantsArray: RawAssistantData[] = [];

    if (Array.isArray(data)) {
      assistantsArray = data;
    } else if (data.assistants && Array.isArray(data.assistants)) {
      assistantsArray = data.assistants;
    } else {
      return [] as Assistant[];
    }

    // Map the API response format to the internal format
    const mappedAssistants: Assistant[] = assistantsArray
      .filter(item => item && typeof item === 'object' && (item.assistantID || item.id))
      .map(item => ({
        id: (item.assistantID || item.id) as string,
        name: (item.assistantName || item.name) as string,
        description: item.description,
        avatar: item.assistantImageURL || item.avatar,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        userId: item.userId,
        status: item.status,
        ...item // Preserve any additional properties
      }));

    return mappedAssistants;
  }

  async createAssistant(formData: CreateAssistantFormData): Promise<Assistant> {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    // Validate inputs before sending to API
    const validatedFormData = {
      ...formData,
      description: formData.description?.trim() || "Your personal AI assistant powered by Articom."
    };

    try {
      return await this.createAssistantWithFormData(validatedFormData, token);
    } catch (error) {
      console.error('Error creating assistant:', error);
      throw error;
    }
  }

  private async createAssistantWithFormData(validatedFormData: CreateAssistantFormData, token: string): Promise<Assistant> {
    const formDataPayload = new FormData();

    formDataPayload.append('assistantName', validatedFormData.assistantName);
    formDataPayload.append('selectedLLMID', validatedFormData.selectedLLMID);
    formDataPayload.append('description', validatedFormData.description);

    // Handle languages
    const languageIDsValue = validatedFormData.languageIDs.length === 1
      ? validatedFormData.languageIDs[0]
      : JSON.stringify(validatedFormData.languageIDs);
    formDataPayload.append('languageIDs', languageIDsValue);

    // Add image file
    if (validatedFormData.assistantImage) {
      formDataPayload.append('assistantImage', validatedFormData.assistantImage);
    }
    
    // Add sourceTemplateID if provided
    if (validatedFormData.sourceTemplateID) {
      formDataPayload.append('sourceTemplateID', validatedFormData.sourceTemplateID);
    }

    const response = await fetch(`${API_BASE_URL}/assistants`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formDataPayload,
    });

    return this.handleCreateResponse(response);
  }

  // Helper method to handle response from create endpoint
  private async handleCreateResponse(response: Response): Promise<Assistant> {
    if (!response.ok) {
      try {
        // Try to get response as text first to see raw content
        const responseText = await response.text();
        console.error(`Error response from server (${response.status}):`, responseText);

        // Then try to parse as JSON if possible
        let errorData;
        try {
          errorData = JSON.parse(responseText);
          console.error('Parsed error data:', errorData);

          if (errorData.error && errorData.error.message) {
            const errorMessage = Array.isArray(errorData.error.message)
              ? errorData.error.message.join('; ')
              : errorData.error.message;
            throw new Error(`Server error: ${errorMessage}`);
          } else if (isApiError(errorData.error)) {
            throw new Error(getErrorMessage(errorData.error));
          } else if (errorData.message) {
            throw new Error(getErrorMessage(errorData));
          } else {
            throw new Error(`Server error (${response.status}): ${JSON.stringify(errorData).substring(0, 200)}`);
          }
        } catch (jsonParseError) {
          console.error('Could not parse error response as JSON:', jsonParseError);
          throw new Error(`Server error (${response.status}): ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
        }
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
          throw parseError;
        }
        if (parseError instanceof Error) {
          throw parseError;
        }
        throw new Error(`Failed to create assistant. Server returned status ${response.status}.`);
      }
    }

    const data = await response.json();

    const assistantData = data.assistant || data;

    const mappedAssistant = {
      id: assistantData.assistantID || assistantData.id,
      name: assistantData.assistantName || assistantData.name,
      description: assistantData.description,
      avatar: assistantData.assistantImageURL || assistantData.avatar,
      createdAt: assistantData.createdAt,
      updatedAt: assistantData.updatedAt,
      userId: assistantData.userID || assistantData.userId,
      status: assistantData.status,
      selectedLLMID: assistantData.selectedLLMID,
      creationMode: assistantData.creationMode,
    };

    return mappedAssistant;
  }

  async getAssistantById(assistantID: string): Promise<Assistant> {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/assistants/${assistantID}`, {
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
          throw new Error('Failed to fetch assistant. Please try again.');
        }
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
        if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
          throw parseError;
        }
        throw new Error('Failed to fetch assistant. Please try again.');
      }
    } const data = await response.json();

    // Handle the nested response structure where assistant data is under 'assistant' key
    const assistantData = data.assistant || data;

    // Map the API response to the internal format
    const mappedAssistant = {
      id: assistantData.assistantID || assistantData.id,
      name: assistantData.assistantName || assistantData.name,
      description: assistantData.description,
      avatar: assistantData.assistantImageURL || assistantData.avatar,
      createdAt: assistantData.createdAt,
      updatedAt: assistantData.updatedAt,
      userId: assistantData.userID || assistantData.userId,
      status: assistantData.status,
      settings: assistantData.settings || {
        model: assistantData.selectedLLMID || 'gpt-4',
        temperature: assistantData.temperature || 0.7,
        contextLength: assistantData.contextLength || 4000,
      },
      instructions: assistantData.instructions || assistantData.systemPrompt || '',
      selectedLLMID: assistantData.selectedLLMID,
      creationMode: assistantData.creationMode,
      languages: data.languages || [],
    };

    return mappedAssistant;
  }
}

export const assistantService = new AssistantService();
