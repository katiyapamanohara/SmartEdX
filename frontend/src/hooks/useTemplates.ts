"use client";

import { useState, useEffect, useCallback } from 'react';
import { templateService } from '@/services/templateService';
import { TokenManager } from '@/utils/tokenManager';
import type { Template } from '@/types/template';

export function useTemplates() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTemplates = useCallback(async () => {
        try {
            const token = TokenManager.getAccessToken();

            if (!token) {
                console.warn('No authentication token found, using fallback templates');
                setTemplates([]);
                setLoading(false);
                setError('No authentication token found');
                return;
            }

            setLoading(true);
            setError(null);
            const data = await templateService.getTemplates();
            setTemplates(data);
        } catch (err) {
            console.error('Failed to fetch templates:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch templates');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const refetch = useCallback(() => {
        const token = TokenManager.getAccessToken();
        if (token) {
            setLoading(true);
            fetchTemplates();
        }
    }, [fetchTemplates]);

    return {
        templates,
        loading,
        error,
        refetch,
        fetchTemplates // Export the fetch function for direct use
    };
}
