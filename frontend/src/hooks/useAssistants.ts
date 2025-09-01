"use client";

import { useState, useEffect, useCallback } from 'react';
import { assistantService } from '@/services/assistantService';
import { TokenManager } from '@/utils/tokenManager';
import type { Assistant, CreateAssistantFormData } from '@/types/assistant';

export function useAssistants() {
    const [assistants, setAssistants] = useState<Assistant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAssistants = useCallback(async () => {
        const token = TokenManager.getAccessToken();

        if (!token) {
            setAssistants([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await assistantService.getUserAssistants();
            setAssistants(data);
        } catch (err) {
            console.error('Failed to fetch assistants:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch assistants');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAssistants();
    }, [fetchAssistants]);

    const refetch = useCallback(() => {
        const token = TokenManager.getAccessToken();
        if (token) {
            setLoading(true);
            fetchAssistants();
        }
    }, [fetchAssistants]);

    const createAssistant = useCallback(async (data: CreateAssistantFormData) => {
        try {
            setError(null);
            const createdAssistant = await assistantService.createAssistant(data);

            // Update local state with the new assistant
            setAssistants(prev => [createdAssistant, ...prev]);

            return createdAssistant;
        } catch (err) {
            console.error('Failed to create assistant:', err);
            setError(err instanceof Error ? err.message : 'Failed to create assistant');
            throw err;

        }
    }, []);

    return {
        assistants,
        loading,
        error,
        refetch,
        createAssistant
    };
}
