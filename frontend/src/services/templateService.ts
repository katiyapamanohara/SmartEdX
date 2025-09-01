// API service for template management
import { TokenManager } from '@/utils/tokenManager';
import { getErrorMessage, isApiError } from '@/utils/errorUtils';
import type { Template, RawTemplateData } from '@/types/template';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

class TemplateService {
  async getTemplates(): Promise<Template[]> {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/template`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        try {
          const responseText = await response.text();
          
          try {
            const errorData = JSON.parse(responseText);
            console.error('Parsed error data:', errorData);
            
            if (isApiError(errorData.error)) {
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
          throw new Error(`Failed to fetch templates. Server returned status ${response.status}.`);
        }
      }

      const responseText = await response.text();
      
      // Handle empty response
      if (!responseText.trim()) {
        console.warn('Empty response from templates API');
        return [];
      }
      
      const data = JSON.parse(responseText);

      // Handle different response formats from the API
      let templatesArray: RawTemplateData[] = [];

      if (Array.isArray(data)) {
        templatesArray = data;
      } else if (data.templates && Array.isArray(data.templates)) {
        templatesArray = data.templates;
      } else {
        return [] as Template[];
      }

      // Map the API response format to the internal format
      const mappedTemplates: Template[] = templatesArray
        .filter(item => {
          const isValid = item && typeof item === 'object' && (item.templateID);
          if (!isValid) {
            console.warn('Filtered out invalid template item:', item);
          }
          return isValid;
        })
        .map(item => {
          return {
            id: item.templateID as string,
            templateID: item.templateID as string,
            name: item.templateName as string,
            templateName: item.templateName as string,
            description: item.templateDescription as string,
            templateDescription: item.templateDescription as string,
            icon: item.templateImageURL as string,
            templateImageURL: item.templateImageURL as string,
            version: item.version as string,
            isReadOnly: item.isReadOnly as boolean,
            ...item // Preserve any additional properties
          };
        });

      return mappedTemplates;
    } catch (error) {
      console.error('Unexpected error in getTemplates:', error);
      throw error;
    }
  }

  async getTemplateById(templateID: string): Promise<Template> {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/template/${templateID}`, {
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
          throw new Error('Failed to fetch template. Please try again.');
        }
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
        if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
          throw parseError;
        }
        throw new Error('Failed to fetch template. Please try again.');
      }
    } 
    
    const data = await response.json();

    // Handle the nested response structure where template data might be under 'template' key
    const templateData = data.template || data;

    // Map the API response to the internal format
    const mappedTemplate: Template = {
      id: templateData.templateID || templateData.id,
      templateID: templateData.templateID || templateData.id,
      name: templateData.name,
      description: templateData.description,
      category: templateData.category,
      icon: templateData.icon,
      createdAt: templateData.createdAt,
      updatedAt: templateData.updatedAt,
      status: templateData.status,
    };

    return mappedTemplate;
  }
}

export const templateService = new TemplateService();
