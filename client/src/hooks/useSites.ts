import { useEffect, useState, useCallback, useMemo } from "react";
import { listSites } from "@/services/site.service";
import type { ISite } from "@/models/site.model";
import { getDistance, handleError } from "@/lib/utils";

// Hook for managing async data fetching with loading/error states
const useAsyncData = <T>(
  fetchFn: () => Promise<T>,
  initialData: T,
  autoFetch = true
) => {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(autoFetch); // Start loading if autoFetch is true
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result ?? initialData);
    } catch (err) {
      setError(handleError(err, "Operation failed"));
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, initialData]);

  useEffect(() => {
    if (autoFetch) {
      void refetch();
    }
  }, [autoFetch, refetch]);

  return { data, isLoading, error, refetch };
};

interface UseSitesOptions {
  autoLoad?: boolean;
}

export interface UseSitesResult {
  sites: ISite[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching all sites
 * @param options - Configuration options
 * @param options.autoLoad - Whether to automatically load sites (default: true)
 * @returns All sites with loading and error states
 */
export function useSites({
  autoLoad = true,
}: UseSitesOptions = {}): UseSitesResult {
  const {
    data: sites,
    isLoading,
    error,
    refetch,
  } = useAsyncData(listSites, [] as ISite[], autoLoad);

  return {
    sites: sites ?? [],
    isLoading,
    error,
    refetch,
  };
}

interface UseNearbySitesOptions {
  latitude: number;
  longitude: number;
  maxDistance?: number; // in meters, default 10km
  limit?: number; // max number of results
}

interface SiteWithDistance extends ISite {
  distance: number; // distance in meters
}

export interface UseNearbySitesResult {
  sites: SiteWithDistance[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching nearby sites filtered by distance
 * @param options - Configuration options
 * @param options.latitude - Center point latitude
 * @param options.longitude - Center point longitude
 * @param options.maxDistance - Maximum distance in meters (default: 10000m / 10km)
 * @param options.limit - Maximum number of results to return
 * @returns Nearby sites sorted by distance with loading and error states
 */
export function useNearbySites({
  latitude,
  longitude,
  maxDistance = 10000,
  limit,
}: UseNearbySitesOptions): UseNearbySitesResult {
  const { sites: allSites, isLoading, error, refetch } = useSites();

  // Filter and sort sites by distance
  const nearbySites = useMemo(() => {
    // Don't compute if sites haven't loaded yet or coordinates are invalid
    if (isLoading || !allSites?.length || (latitude === 0 && longitude === 0)) {
      return [];
    }

    const sitesWithDistance: SiteWithDistance[] = allSites
      .map((site) => {
        const distance = getDistance(
          latitude,
          longitude,
          site.takeoffLocation.coordinates[0], // lat
          site.takeoffLocation.coordinates[1] // lng
        );
        return {
          ...site,
          distance,
        };
      })
      .filter((site) => site.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);
    return limit ? sitesWithDistance.slice(0, limit) : sitesWithDistance;
  }, [allSites, latitude, longitude, maxDistance, limit, isLoading]);

  return {
    sites: nearbySites,
    isLoading,
    error,
    refetch,
  };
}
