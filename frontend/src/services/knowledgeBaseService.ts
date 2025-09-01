// API service for knowledge base operations
import { TokenManager } from '@/utils/tokenManager';
import { getErrorMessage, isApiError } from '@/utils/errorUtils';
import type { 
  KnowledgeBaseSourceTypesResponse,
  CreateKnowledgeBaseRequest,
  CreateKnowledgeBaseResponse,
  KnowledgeBaseListResponse,
  KnowledgeBaseResponse,
  UpdateKnowledgeBaseRequest
} from '@/types/knowledgebase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

class KnowledgeBaseService {
  async getSourceTypes(): Promise<KnowledgeBaseSourceTypesResponse> {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/knowledgebases/source-types`, {
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
          throw new Error('Failed to fetch knowledge base source types. Please try again.');
        }
      } catch {
        throw new Error('Failed to fetch knowledge base source types. Please try again.');
      }
    }

    const data = await response.json();

    // Handle direct array response from API (which is what we're getting)
    if (Array.isArray(data)) {
      return {
        sourceTypes: data,
        success: true,
        message: 'Source types loaded successfully'
      };
    }

    // Handle wrapped response format
    if (data && Array.isArray(data.sourceTypes)) {
      return {
        sourceTypes: data.sourceTypes,
        success: data.success ?? true,
        message: data.message
      };
    }

    // Handle response with data property
    if (data && data.data && Array.isArray(data.data)) {
      return {
        sourceTypes: data.data,
        success: data.success ?? true,
        message: data.message
      };
    }

    // Invalid response format
    return {
      sourceTypes: [],
      success: false,
      message: 'Invalid response format'
    };
  }

  async createKnowledgeBase(data: CreateKnowledgeBaseRequest): Promise<CreateKnowledgeBaseResponse> {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    const formData = new FormData();
    formData.append('knowledgeBaseName', data.knowledgeBaseName);
    formData.append('description', data.description);
    formData.append('sourceTypeName', data.sourceTypeName);

    data.files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await fetch(`${API_BASE_URL}/knowledgebases`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type header when using FormData - browser will set it with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();

        if (isApiError(errorData.error)) {
          throw new Error(getErrorMessage(errorData.error));
        } else if (errorData.message) {
          throw new Error(getErrorMessage(errorData));
        } else {
          throw new Error(`Failed to create knowledge base (${response.status}). Please try again.`);
        }
      } catch {
        throw new Error(`Failed to create knowledge base (${response.status}). Please try again.`);
      }
    }

    const result = await response.json();

    return {
      ...result,
      success: true,
      message: result.message || 'Knowledge base created successfully'
    };
  }

  async getKnowledgeBases(): Promise<KnowledgeBaseListResponse> {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/knowledgebases/user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error('Response not OK:', response.status, response.statusText);

        try {
          const errorText = await response.text();
          console.error('Error response text:', errorText);

          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            throw new Error(`Failed to fetch knowledge bases (${response.status}): ${errorText || response.statusText}`);
          }

          if (isApiError(errorData.error)) {
            throw new Error(getErrorMessage(errorData.error));
          } else if (errorData.message) {
            throw new Error(getErrorMessage(errorData));
          } else {
            throw new Error(`Failed to fetch knowledge bases (${response.status}). Please try again.`);
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          throw new Error(`Failed to fetch knowledge bases (${response.status}). Please try again.`);
        }
      }

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        throw new Error('Invalid JSON response from server');
      }

      // Handle the specific response format from the backend
      if (data && data.type === 'list' && Array.isArray(data.data)) {
        return {
          knowledgeBases: data.data,
          success: true,
          message: 'Knowledge bases loaded successfully',
          total: data.count
        };
      }

      // Handle single knowledge base response (shouldn't happen for list endpoint)
      if (data && data.type === 'single' && data.data) {
        return {
          knowledgeBases: [data.data],
          success: true,
          message: 'Knowledge base loaded successfully',
          total: 1
        };
      }

      // Handle direct array response (fallback)
      if (Array.isArray(data)) {
        return {
          knowledgeBases: data,
          success: true,
          message: 'Knowledge bases loaded successfully'
        };
      }

      // Invalid response format
      return {
        knowledgeBases: [],
        success: false,
        message: 'Invalid response format'
      };

    } catch (networkError) {
      console.error('Network error:', networkError);
      if (networkError instanceof Error && networkError.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to the server. Please check your connection.');
      }
      throw networkError;
    }
  }

  async getKnowledgeBaseById(id: string): Promise<KnowledgeBaseResponse> {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/knowledgebases/user?knowledgeBaseID=${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error('Response not OK:', response.status, response.statusText);

        try {
          const errorText = await response.text();
          console.error('Error response text:', errorText);

          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            throw new Error(`Failed to fetch knowledge base (${response.status}): ${errorText || response.statusText}`);
          }

          if (isApiError(errorData.error)) {
            throw new Error(getErrorMessage(errorData.error));
          } else if (errorData.message) {
            throw new Error(getErrorMessage(errorData));
          } else {
            throw new Error(`Failed to fetch knowledge base (${response.status}). Please try again.`);
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          throw new Error(`Failed to fetch knowledge base (${response.status}). Please try again.`);
        }
      }

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        throw new Error('Invalid JSON response from server');
      }

      // Handle the specific response format from the backend
      if (data && data.type === 'single' && data.data) {
        return {
          knowledgeBase: data.data,
          success: true,
          message: 'Knowledge base loaded successfully'
        };
      }

      // Handle list response when filtering for a single ID
      if (data && data.type === 'list' && Array.isArray(data.data) && data.data.length === 1) {
        return {
          knowledgeBase: data.data[0],
          success: true,
          message: 'Knowledge base loaded successfully'
        };
      }

      // Handle direct object response (fallback)
      if (data && data.knowledgeBaseID) {
        return {
          knowledgeBase: data,
          success: true,
          message: 'Knowledge base loaded successfully'
        };
      }

      // Invalid response format
      return {
        success: false,
        message: 'Invalid response format'
      };

    } catch (networkError) {
      console.error('Network error:', networkError);
      if (networkError instanceof Error && networkError.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to the server. Please check your connection.');
      }
      throw networkError;
    }
  }

  async updateKnowledgeBase(id: string, updateData: UpdateKnowledgeBaseRequest): Promise<KnowledgeBaseResponse> {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      // Create FormData for multipart/form-data request (supports file uploads)
      const formData = new FormData();

      // Add basic fields if provided
      if (updateData.knowledgeBaseName) {
        formData.append('knowledgeBaseName', updateData.knowledgeBaseName);
      }

      if (updateData.description) {
        formData.append('description', updateData.description);
      }

      if (updateData.sourceTypeName) {
        formData.append('sourceTypeName', updateData.sourceTypeName);
      }

      if (updateData.status) {
        formData.append('status', updateData.status);
      }

      // Add files if provided (for adding new files)
      if (updateData.files && updateData.files.length > 0) {
        updateData.files.forEach((file) => {
          formData.append('files', file);
        });
      }

      // Add sources information for removing files
      if (updateData.sources) {
        // The backend expects the sources field to be a JSON string
        // We need to ensure it's formatted exactly as expected
        if (typeof updateData.sources === 'string') {
          // If already a string, use it directly (but validate it's properly formatted)
          try {
            JSON.parse(updateData.sources); // Just to validate it's valid JSON
            formData.append('sources', updateData.sources);
          } catch (e) {
            console.error('Invalid sources JSON string provided:', e);
            throw new Error('Invalid sources JSON format');
          }
        } else {
          // Convert the sources object to the exact JSON string format required by the backend
          // The backend expects: {"remove":[{"knowledgeBaseSourceID":"id-here"}]}
          const sourcesJson = JSON.stringify(updateData.sources);
          formData.append('sources', sourcesJson);
        }
      }

      const response = await fetch(`${API_BASE_URL}/knowledgebases/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      for (const pair of formData.entries()) {
        if (pair[0] === 'sources') {
        } else if (typeof pair[1] === 'object') {
        } else {
        }
      }

      if (!response.ok) {
        console.error('Response not OK:', response.status, response.statusText);

        try {
          const errorText = await response.text();
          console.error('Error response text:', errorText);

          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            throw new Error(`Failed to update knowledge base (${response.status}): ${errorText || response.statusText}`);
          }

          if (isApiError(errorData.error)) {
            throw new Error(getErrorMessage(errorData.error));
          } else if (errorData.message) {
            throw new Error(getErrorMessage(errorData));
          } else {
            throw new Error(`Failed to update knowledge base (${response.status}). Please try again.`);
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          throw new Error(`Failed to update knowledge base (${response.status}). Please try again.`);
        }
      }

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        throw new Error('Invalid JSON response from server');
      }

      // Handle the specific response format from the backend
      if (data && data.type === 'single' && data.data) {
        return {
          knowledgeBase: data.data,
          success: true,
          message: 'Knowledge base updated successfully'
        };
      }

      // Handle direct object response (fallback)
      if (data && data.knowledgeBaseID) {
        return {
          knowledgeBase: data,
          success: true,
          message: 'Knowledge base updated successfully'
        };
      }

      // Invalid response format
      return {
        success: false,
        message: 'Invalid response format'
      };

    } catch (networkError) {
      console.error('Network error:', networkError);
      if (networkError instanceof Error && networkError.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to the server. Please check your connection.');
      }
      throw networkError;
    }
  }
}

// Create a named instance of the service before exporting
const knowledgeBaseService = new KnowledgeBaseService();

export default knowledgeBaseService;
