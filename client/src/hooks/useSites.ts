import { useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
import { listSites } from '@/services/site.service';
import type { ISite } from '@/models/site.model';
import { getDistance, handleError } from '@/lib/utils';
import type { UseNearbyLocationsOptions, UseNearbyLocationsResult } from '.';

// Module-level singleton cache for sites
let cachedSites: ISite[] | null = null;
let cachedError: Error | null = null;
let cachedLoading = false;
let listeners: (() => void)[] = [];

async function fetchSitesAndNotify() {
  cachedLoading = true;
  notifyListeners();
  try {
    const result = await listSites();
    cachedSites = result ?? [];
    cachedError = null;
  } catch (err) {
    cachedError = handleError(err, 'Operation failed');
    cachedSites = [];
  } finally {
    cachedLoading = false;
    notifyListeners();
  }
}

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

interface UseSitesOptions {
  autoLoad?: boolean;
}

export interface UseSitesResult {
  sites: ISite[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function subscribeSites(callback: () => void) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((fn) => fn !== callback);
  };
}

function getSitesSnapshot() {
  return { sites: cachedSites, error: cachedError, isLoading: cachedLoading };
}

let lastSitesSnapshot = getSitesSnapshot();
function getStableSitesSnapshot() {
  const next = getSitesSnapshot();
  if (
    next.sites === lastSitesSnapshot.sites &&
    next.error === lastSitesSnapshot.error &&
    next.isLoading === lastSitesSnapshot.isLoading
  ) {
    return lastSitesSnapshot;
  }
  lastSitesSnapshot = next;
  return next;
}

/**
 * Hook for fetching all sites
 * @param options - Configuration options
 * @param options.autoLoad - Whether to automatically load sites (default: true)
 * @returns All sites with loading and error states
 */
export function useSites({ autoLoad = true }: UseSitesOptions = {}): UseSitesResult {
  const snapshot = useSyncExternalStore(subscribeSites, getStableSitesSnapshot);

  // Fetch once if needed
  useEffect(() => {
    if (autoLoad && cachedSites === null && !cachedLoading) {
      fetchSitesAndNotify();
    }
  }, [autoLoad]);

  const refetch = useCallback(async () => {
    await fetchSitesAndNotify();
  }, []);

  return {
    sites: snapshot.sites ?? [],
    isLoading: snapshot.isLoading || snapshot.sites === null,
    error: snapshot.error,
    refetch
  };
}

/**
 * Hook for fetching nearby sites filtered by distance
 * @param options - Configuration options
 * @param options.latitude - Center point latitude
 * @param options.longitude - Center point longitude
 * @param options.maxDistance - Maximum distance in meters (default: 5000m / 10km)
 * @param options.limit - Maximum number of results to return
 * @returns Nearby sites sorted by distance with loading and error states
 */
export function useNearbySites({
  lat,
  lon,
  maxDistance = 5000,
  limit
}: UseNearbyLocationsOptions): UseNearbyLocationsResult<ISite> {
  const { sites: allSites, isLoading, error, refetch } = useSites();

  // Filter and sort sites by distance
  const nearbySites = useMemo(() => {
    // Don't compute if sites haven't loaded yet or coordinates are invalid
    if (isLoading || !allSites?.length || (lat === 0 && lon === 0)) {
      return [];
    }

    const sitesWithDistance: { data: ISite; distance: number }[] = allSites
      .map((site) => {
        const distance = getDistance(
          lat,
          lon,
          site.location.coordinates[0],
          site.location.coordinates[1]
        );
        return {
          data: site,
          distance
        };
      })
      .filter((site) => site.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);
    return limit ? sitesWithDistance.slice(0, limit) : sitesWithDistance;
  }, [allSites, lat, lon, maxDistance, limit, isLoading]);

  return {
    data: nearbySites,
    isLoading,
    error,
    refetch
  };
}
