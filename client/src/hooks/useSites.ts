import { useMemo } from 'react';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addSite, deleteSite, getSiteById, listSites, updateSite } from '@/services/site.service';
import { ApiError } from '@/services/api-error';
import type { Site } from '@/models/site.model';
import { getDistance } from '@/lib/utils';
import type { UseNearbyLocationsOptions, UseNearbyLocationsResult } from '.';

export const siteKeys = {
  all: ['sites'] as const,
  list: (opts?: { includeDisabled?: boolean }) =>
    opts?.includeDisabled ? (['sites', { includeDisabled: true }] as const) : siteKeys.all,
  detail: (id: string) => ['site', id] as const
};

export interface UseSitesResult {
  sites: Site[];
  isLoading: boolean;
  error: Error | null;
}

interface UseSitesOptions {
  includeDisabled?: boolean;
}

export function useSites(options?: UseSitesOptions): UseSitesResult {
  const includeDisabled = options?.includeDisabled ?? false;

  const { data, isLoading, error } = useQuery({
    queryKey: siteKeys.list(includeDisabled ? { includeDisabled } : undefined),
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
}: UseNearbyLocationsOptions): UseNearbyLocationsResult<Site> {
  const { sites: allSites, isLoading, error } = useSites();

  const nearbySites = useMemo(() => {
    if (isLoading || !allSites?.length || (lat === 0 && lon === 0)) {
      return [];
    }

    const sitesWithDistance: { data: Site; distance: number }[] = allSites
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
  site: Site | null;
  isLoading: boolean;
  error: Error | null;
}

export function useSite(id: string | undefined): UseSiteResult {
  const { data, isLoading, error } = useQuery({
    queryKey: siteKeys.detail(id ?? ''),
    queryFn: id ? () => getSiteById(id) : skipToken,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2
  });

  return {
    site: data ?? null,
    isLoading,
    error
  };
}

export function useAddSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addSite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: siteKeys.all })
  });
}

export function useUpdateSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Site> }) =>
      updateSite(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(id) });
    }
  });
}

export function useDeleteSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSite,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
      queryClient.removeQueries({ queryKey: siteKeys.detail(id) });
    }
  });
}
