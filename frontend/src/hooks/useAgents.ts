import { useState, useEffect, useCallback } from 'react';
import { agentService } from '@/services/agentService';
import type { APIAgent } from '@/types/agent';

interface UseAgentsReturn {
  agents: APIAgent[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useAgents = (assistantID?: string): UseAgentsReturn => {
  const [agents, setAgents] = useState<APIAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    if (!assistantID) {
      setAgents([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await agentService.getAgentsByAssistant(assistantID);
      
      if (response.success) {
        setAgents(response.agents);
      } else {
        setError(response.message || 'Failed to load agents');
        setAgents([]);
      }
    } catch (err) {
      console.error('Failed to load agents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load agents');
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, [assistantID]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const refetch = fetchAgents;

  return {
    agents,
    loading,
    error,
    refetch,
  };
};
