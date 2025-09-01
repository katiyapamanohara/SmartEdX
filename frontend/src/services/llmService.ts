// API service for LLM management
import { TokenManager } from '@/utils/tokenManager';
import { getErrorMessage, isApiError } from '@/utils/errorUtils';
import type {
  LLMModel,
  LLMListParams,
  LLMListResponse,
  RawLLMModelData
} from '@/types/llm';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

class LLMService {
  async getLLMModels(params: LLMListParams = {}): Promise<LLMListResponse> {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (params.sort) queryParams.append('sort', params.sort);
    if (params.search) queryParams.append('search', params.search);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.page) queryParams.append('page', params.page.toString());

    const url = `${API_BASE_URL}/llm-mgts${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    try {
      const response = await fetch(url, {
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
            console.error('API Error:', errorData);
            throw new Error('Failed to fetch LLM models. Please try again.');
          }
        } catch (parseError) {
          if (parseError instanceof Error && parseError.message.includes('getErrorMessage')) {
            throw parseError;
          }
          console.error('Error parsing API response:', parseError);
          throw new Error('Failed to fetch LLM models. Please try again.');
        }
      }

      const data = await response.json();

      // Extract models from the docs array (API response format)
      const modelArray = data.docs || data.data || data.models || [];

      // Map the API response format to the internal format
      const mappedModels: LLMModel[] = modelArray.map((item: RawLLMModelData) => ({
        id: item.id || item.llmID || item._id,
        name: item.name || item.llmName || item.modelName,
        provider: item.provider || item.providerName,
        displayValue: item.displayValue || item.modelKey || item.name || `${item.provider || ''} ${item.name || ''}`.trim(),
        description: item.description,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

      return {
        data: mappedModels,
        total: data.totalDocs || data.total || mappedModels.length,
        page: data.page || 1,
        limit: data.limit || mappedModels.length,
      };
    } catch (error) {
      console.error('Error in LLM service:', error);

      // Return empty results instead of throwing to prevent infinite loops
      return {
        data: [],
        total: 0,
        page: 1,
        limit: 10
      };
    }
  }
}

export const llmService = new LLMService();
