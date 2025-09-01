import { useState, useEffect } from 'react';
import { servicesService } from '@/services/servicesService';
import type { ServiceItem, ServiceListOutput } from '@/types/services';

interface UseServicesReturn {
  services: ServiceItem[];
  loading: boolean;
  error: string | null;
  total: number;
  refetch: () => Promise<void>;
}

export const useServices = (): UseServicesReturn => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);

      const result: ServiceListOutput = await servicesService.getServices();
      
      setServices(result.services);
      setTotal(result.total || result.services.length);
    } catch (err) {
      console.error('Error in useServices:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch services';
      setError(errorMessage);
      setServices([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const refetch = async () => {
    await fetchServices();
  };

  return {
    services,
    loading,
    error,
    total,
    refetch,
  };
};
