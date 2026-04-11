"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useParams } from "next/navigation";
import { instituteService } from "@/services/instituteService";

interface InstituteFeatureContextValue {
  enabledFeatures: string[];
  isLoading: boolean;
  hasFeature: (feature: string) => boolean;
}

const InstituteFeatureContext = createContext<InstituteFeatureContextValue>({
  enabledFeatures: [],
  isLoading: true,
  hasFeature: () => false,
});

export function InstituteFeatureProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const instituteId = params?.instituteId as string;
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!instituteId) return;
    let cancelled = false;
    const fetchFeatures = async () => {
      try {
        const data = await instituteService.getInstituteById(instituteId);
        if (!cancelled) setEnabledFeatures(data?.enabledFeatures ?? []);
      } catch {
        if (!cancelled) setEnabledFeatures([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchFeatures();
    return () => { cancelled = true; };
  }, [instituteId]);

  const hasFeature = (feature: string) => enabledFeatures.includes(feature);

  return (
    <InstituteFeatureContext.Provider value={{ enabledFeatures, isLoading, hasFeature }}>
      {children}
    </InstituteFeatureContext.Provider>
  );
}

export function useFeatures() {
  return useContext(InstituteFeatureContext);
}
