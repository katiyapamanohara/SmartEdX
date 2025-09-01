import { useState, useEffect } from 'react';
import { Language } from '@/types/assistant';
import { getLanguages } from '@/services/languageService';

/**
 * Hook for fetching and managing languages
 * @returns Object containing languages, loading state, and error state
 */
export const useLanguages = () => {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        setIsLoading(true);
        const fetchedLanguages = await getLanguages();
        setLanguages(fetchedLanguages);
        setError(null);
      } catch (err) {
        console.error('Error in useLanguages hook:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch languages'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchLanguages();
  }, [refetchTrigger]);

  return { languages, isLoading, error, refetch };
};
