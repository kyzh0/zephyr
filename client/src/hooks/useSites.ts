import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSiteById, listSites } from '@/services/site.service';
import { ApiError } from '@/services/api-error';
import type { ISite } from '@/models/site.model';
import { getDistance } from '@/lib/utils';
import type { UseNearbyLocationsOptions, UseNearbyLocationsResult } from '.';

export interface UseSitesResult {
  sites: ISite[];
  isLoading: boolean;
  error: Error | null;
}

interface UseSitesOptions {
  includeDisabled?: boolean;
}

export function useSites(options?: UseSitesOptions): UseSitesResult {
  const includeDisabled = options?.includeDisabled ?? false;

  const { data, isLoading, error } = useQuery({
    queryKey: includeDisabled ? ['sites', { includeDisabled }] : ['sites'],
    queryFn: () => listSites(includeDisabled)
  });

  return {
    sites: data ?? [],
    isLoading,
    error
  };
}

export function useNearbySites({
  lat,
  lon,
  maxDistance = 5000,
  limit
}: UseNearbyLocationsOptions): UseNearbyLocationsResult<ISite> {
  const { sites: allSites, isLoading, error } = useSites();

  const nearbySites = useMemo(() => {
    if (isLoading || !allSites?.length || (lat === 0 && lon === 0)) {
      return [];
    }

    const sitesWithDistance: { data: ISite; distance: number }[] = allSites
      .map((site) => {
        const distance = getDistance(
          lon,
          lat,
          site.location.coordinates[0],
          site.location.coordinates[1]
        );
        return { data: site, distance };
      })
      .filter((site) => site.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    return limit ? sitesWithDistance.slice(0, limit) : sitesWithDistance;
  }, [allSites, lat, lon, maxDistance, limit, isLoading]);

  return {
    data: nearbySites,
    isLoading,
    error
  };
}

interface UseSiteResult {
  site: ISite | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSite(id: string | undefined): UseSiteResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['site', id],
    queryFn: () => getSiteById(id!),
    enabled: !!id,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2
  });

  return {
    site: data ?? null,
    isLoading,
    error,
    refetch: async () => {
      await refetch();
    }
  };
}

export function useInvalidateSites(): () => Promise<void> {
  const queryClient = useQueryClient();
  return useCallback(
    async () => await queryClient.invalidateQueries({ queryKey: ['sites'] }),
    [queryClient]
  );
}
