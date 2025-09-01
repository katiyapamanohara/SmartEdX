// Hook for managing knowledge base operations
import { useState, useEffect, useCallback } from 'react';
import knowledgeBaseService from '@/services/knowledgeBaseService';
import type {
  KnowledgeBaseSourceType,
  KnowledgeBaseSourceTypesResponse,
  CreateKnowledgeBaseRequest,
  CreateKnowledgeBaseResponse,
  KnowledgeBase,
  KnowledgeBaseListResponse,
  KnowledgeBaseResponse,
  UpdateKnowledgeBaseRequest
} from '@/types/knowledgebase';
import posthog from 'posthog-js';

export interface UseKnowledgeBaseSourceTypesReturn {
  sourceTypes: KnowledgeBaseSourceType[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useKnowledgeBaseSourceTypes = (): UseKnowledgeBaseSourceTypesReturn => {
  const [sourceTypes, setSourceTypes] = useState<KnowledgeBaseSourceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSourceTypes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response: KnowledgeBaseSourceTypesResponse = await knowledgeBaseService.getSourceTypes();

      if (response.success) {
        // Since the API response doesn't include isActive field, we'll show all types
        setSourceTypes(response.sourceTypes);
      } else {
        setError(response.message || 'Failed to fetch source types');
      }
    } catch (err) {
      console.error('Error fetching knowledge base source types:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch source types');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSourceTypes();
  }, [fetchSourceTypes]);

  return {
    sourceTypes,
    loading,
    error,
    refetch: fetchSourceTypes,
  };
};

export interface UseCreateKnowledgeBaseReturn {
  createKnowledgeBase: (data: CreateKnowledgeBaseRequest) => Promise<CreateKnowledgeBaseResponse>;
  loading: boolean;
  error: string | null;
}

export const useCreateKnowledgeBase = (): UseCreateKnowledgeBaseReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createKnowledgeBase = useCallback(async (data: CreateKnowledgeBaseRequest): Promise<CreateKnowledgeBaseResponse> => {
    try {
      setLoading(true);
      setError(null);

      const response = await knowledgeBaseService.createKnowledgeBase(data);

      if (!response.success) {
        setError(response.message || 'Failed to create knowledge base');
      }

      //Track in PostHog
      posthog.capture('knowledge_base_created', {
        knowledgeBaseId: response.knowledgeBase?.knowledgeBaseID,
        title: response.knowledgeBase?.sources?.length,
        sourceType: data.sourceTypeName,            
        documentCount: response.knowledgeBase?.sources?.length ?? 0,
      });

      return response;
    } catch (err) {
      console.error('Error creating knowledge base:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create knowledge base';
      setError(errorMessage);

      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createKnowledgeBase,
    loading,
    error,
  };
};

export interface UseKnowledgeBasesReturn {
  knowledgeBases: KnowledgeBase[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useKnowledgeBases = (): UseKnowledgeBasesReturn => {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKnowledgeBases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response: KnowledgeBaseListResponse = await knowledgeBaseService.getKnowledgeBases();

      if (response.success) {
        setKnowledgeBases(response.knowledgeBases);
      } else {
        setError(response.message || 'Failed to fetch knowledge bases');
      }
    } catch (err) {
      console.error('Error fetching knowledge bases:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch knowledge bases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKnowledgeBases();
  }, [fetchKnowledgeBases]);

  return {
    knowledgeBases,
    loading,
    error,
    refetch: fetchKnowledgeBases,
  };
};

export interface UseKnowledgeBaseByIdReturn {
  knowledgeBase: KnowledgeBase | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useKnowledgeBaseById = (id: string): UseKnowledgeBaseByIdReturn => {
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKnowledgeBase = useCallback(async () => {
    if (!id) {
      setError('Knowledge base ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await knowledgeBaseService.getKnowledgeBaseById(id);

      if (response.success && response.knowledgeBase) {
        setKnowledgeBase(response.knowledgeBase);
      } else {
        setError(response.message || 'Failed to fetch knowledge base');
      }
    } catch (err) {
      console.error('Error fetching knowledge base:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch knowledge base');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchKnowledgeBase();
  }, [fetchKnowledgeBase]);

  return {
    knowledgeBase,
    loading,
    error,
    refetch: fetchKnowledgeBase,
  };
};

export interface UseUpdateKnowledgeBaseReturn {
  updateKnowledgeBase: (id: string, data: UpdateKnowledgeBaseRequest) => Promise<KnowledgeBaseResponse>;
  loading: boolean;
  error: string | null;
}

export const useUpdateKnowledgeBase = (): UseUpdateKnowledgeBaseReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateKnowledgeBase = useCallback(async (id: string, data: UpdateKnowledgeBaseRequest): Promise<KnowledgeBaseResponse> => {
    try {
      setLoading(true);
      setError(null);

      const response = await knowledgeBaseService.updateKnowledgeBase(id, data);

      if (!response.success) {
        setError(response.message || 'Failed to update knowledge base');
      }

      return response;
    } catch (err) {
      console.error('Error updating knowledge base:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update knowledge base';
      setError(errorMessage);

      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    updateKnowledgeBase,
    loading,
    error,
  };
};
