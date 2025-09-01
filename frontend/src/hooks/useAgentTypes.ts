import { useState, useEffect, useCallback } from 'react';
import { agentService } from '@/services/agentService';
import type { AgentType } from '@/types/agent';

interface UseAgentTypesReturn {
  agentTypes: AgentType[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useAgentTypes = (): UseAgentTypesReturn => {
  const [agentTypes, setAgentTypes] = useState<AgentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgentTypes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await agentService.getAgentTypes();
      
      if (response.success) {
        setAgentTypes(response.data);
      } else {
        setError(response.message || 'Failed to load agent types');
        setAgentTypes([]);
      }
    } catch (err) {
      console.error('Failed to load agent types:', err);
      setError(err instanceof Error ? err.message : 'Failed to load agent types');
      setAgentTypes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgentTypes();
  }, [fetchAgentTypes]);

  const refetch = fetchAgentTypes;

  return {
    agentTypes,
    loading,
    error,
    refetch,
  };
};
