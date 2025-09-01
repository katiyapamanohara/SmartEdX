import { useState, useEffect, useCallback } from 'react';
import { llmService } from '@/services/llmService';
import type { LLMModel, LLMListParams } from '@/types/llm';

interface UseLLMModelsReturn {
  models: LLMModel[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useLLMModels = (params?: LLMListParams): UseLLMModelsReturn => {
  const [models, setModels] = useState<LLMModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await llmService.getLLMModels(params);
      setModels(response.data);
    } catch (err) {
      console.error('Failed to load LLM models from API:', err);
      setError(err instanceof Error ? err.message : 'Failed to load LLM models');
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const refetch = fetchModels;

  return {
    models,
    loading,
    error,
    refetch,
  };
};
