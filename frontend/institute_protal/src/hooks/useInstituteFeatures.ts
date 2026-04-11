"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { instituteService } from "@/services/instituteService";

interface UseInstituteFeatureOptions {
  requiredFeature?: string;
  redirectTo?: string;
}

/**
 * Returns the enabled features for the current institute.
 * If `requiredFeature` is provided and NOT in the enabled list,
 * redirects to `redirectTo` (default: institute dashboard).
 */
export function useInstituteFeatures(options: UseInstituteFeatureOptions = {}) {
  const params = useParams();
  const router = useRouter();
  const instituteId = params?.instituteId as string;

  const [enabledFeatures, setEnabledFeatures] = useState<string[] | null>(null); // null = still loading
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!instituteId) return;

    let cancelled = false;
    const fetch = async () => {
      setIsLoading(true);
      try {
        const data = await instituteService.getInstituteById(instituteId);
        if (cancelled) return;
        const features = data?.enabledFeatures ?? [];
        setEnabledFeatures(features);

        if (options.requiredFeature && !features.includes(options.requiredFeature)) {
          const target = options.redirectTo ?? `/${instituteId}`;
          router.replace(target);
        }
      } catch {
        if (!cancelled) setEnabledFeatures([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [instituteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFeature = (feature: string) =>
    enabledFeatures !== null && enabledFeatures.includes(feature);

  return { enabledFeatures, isLoading, hasFeature };
}
