import { useState, useEffect, useCallback } from 'react';
import { workflowService } from '@/services/workflowService';
import type { Workflow, GetSingleWorkflowCompleteResponse } from '@/types/workflow';

interface UseWorkflowsReturn {
  workflows: Workflow[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useWorkflows = (assistantID?: string): UseWorkflowsReturn => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    if (!assistantID) {
      setWorkflows([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await workflowService.getWorkflows(assistantID);
      
      if (response.success) {
        setWorkflows(response.flows || []);
      } else {
        setError(response.message || 'Failed to load workflows');
        setWorkflows([]);
      }
    } catch (err) {
      console.error('Failed to load workflows:', err);
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  }, [assistantID]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const refetch = fetchWorkflows;

  return {
    workflows,
    loading,
    error,
    refetch,
  };
};

interface UseSingleWorkflowReturn {
  workflow: GetSingleWorkflowCompleteResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useSingleWorkflow = (flowID?: string): UseSingleWorkflowReturn => {
  const [workflow, setWorkflow] = useState<GetSingleWorkflowCompleteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflow = useCallback(async () => {
    if (!flowID) {
      setWorkflow(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await workflowService.getSingleWorkflow(flowID);
      
      if (response.success) {
        setWorkflow(response);
      } else {
        setError(response.message || 'Failed to load workflow');
        setWorkflow(null);
      }
    } catch (err) {
      console.error('Failed to load workflow:', err);
      setError(err instanceof Error ? err.message : 'Failed to load workflow');
      setWorkflow(null);
    } finally {
      setLoading(false);
    }
  }, [flowID]);

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  const refetch = fetchWorkflow;

  return {
    workflow,
    loading,
    error,
    refetch,
  };
};
