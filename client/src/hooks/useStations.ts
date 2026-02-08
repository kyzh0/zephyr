import { useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
import { listStations } from '@/services/station.service';
import type { IStation } from '@/models/station.model';
import { getDistance, handleError } from '@/lib/utils';
import type { UseNearbyLocationsOptions, UseNearbyLocationsResult } from '.';

interface UseStationsOptions {
  autoLoad?: boolean;
}

export interface UseStationsResult {
  stations: IStation[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching all stations
 * @param options - Configuration options
 * @param options.autoLoad - Whether to automatically load stations (default: true)
 * @returns All stations with loading and error states
 */

// Module-level singleton cache for stations
let cachedStations: IStation[] | null = null;
let cachedStationsError: Error | null = null;
let cachedStationsLoading = false;
let stationsListeners: (() => void)[] = [];

async function fetchStationsAndNotify() {
  cachedStationsLoading = true;
  notifyStationsListeners();
  try {
    const result = await listStations(false);
    cachedStations = result ?? [];
    cachedStationsError = null;
  } catch (err) {
    cachedStationsError = handleError(err, 'Failed to load stations');
    cachedStations = [];
  } finally {
    cachedStationsLoading = false;
    notifyStationsListeners();
  }
}

function notifyStationsListeners() {
  stationsListeners.forEach((fn) => fn());
}

function subscribeStations(callback: () => void) {
  stationsListeners.push(callback);
  return () => {
    stationsListeners = stationsListeners.filter((fn) => fn !== callback);
  };
}

function getStationsSnapshot() {
  return {
    stations: cachedStations,
    error: cachedStationsError,
    isLoading: cachedStationsLoading
  };
}

let lastStationsSnapshot = getStationsSnapshot();
function getStableStationsSnapshot() {
  const next = getStationsSnapshot();
  if (
    next.stations === lastStationsSnapshot.stations &&
    next.error === lastStationsSnapshot.error &&
    next.isLoading === lastStationsSnapshot.isLoading
  ) {
    return lastStationsSnapshot;
  }
  lastStationsSnapshot = next;
  return next;
}

export function useStations({ autoLoad = true }: UseStationsOptions = {}): UseStationsResult {
  const snapshot = useSyncExternalStore(subscribeStations, getStableStationsSnapshot);

  // Fetch once if needed
  useEffect(() => {
    if (autoLoad && cachedStations === null && !cachedStationsLoading) {
      fetchStationsAndNotify();
    }
  }, [autoLoad]);

  const refetch = useCallback(async () => {
    await fetchStationsAndNotify();
  }, []);

  return {
    stations: snapshot.stations ?? [],
    isLoading: snapshot.isLoading || snapshot.stations === null,
    error: snapshot.error,
    refetch
  };
}

/**
 * Hook for fetching nearby stations filtered by distance
 * @param options - Configuration options
 * @param options.latitude - Center point latitude
 * @param options.longitude - Center point longitude
 * @param options.maxDistance - Maximum distance in meters (default: 5000m / 10km)
 * @param options.limit - Maximum number of results to return
 * @returns Nearby stations sorted by distance with loading and error states
 */
export function useNearbyStations({
  lat,
  lon,
  maxDistance = 5000,
  limit
}: UseNearbyLocationsOptions): UseNearbyLocationsResult<IStation> {
  const { stations: allStations, isLoading, error, refetch } = useStations();

  // Filter and sort stations by distance
  const nearbyStations = useMemo(() => {
    // Don't compute if stations haven't loaded yet or coordinates are invalid
    if (isLoading || !allStations?.length || (lat === 0 && lon === 0)) {
      return [];
    }

    const stationsWithDistance: { data: IStation; distance: number }[] = allStations
      .map((station) => {
        const distance = getDistance(
          lat,
          lon,
          station.location.coordinates[0],
          station.location.coordinates[1]
        );
        return {
          data: station,
          distance
        };
      })
      .filter((station) => station.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    return limit ? stationsWithDistance.slice(0, limit) : stationsWithDistance;
  }, [allStations, lon, lat, maxDistance, limit, isLoading]);

  return {
    data: nearbyStations,
    isLoading,
    error,
    refetch
  };
}
