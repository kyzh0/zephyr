import { useEffect, useState, useCallback, useMemo } from "react";
import { listStations } from "@/services/station.service";
import type { IStation } from "@/models/station.model";
import { getDistance, handleError } from "@/lib/utils";

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
    cachedStationsError = handleError(err, "Failed to load stations");
    cachedStations = [];
  } finally {
    cachedStationsLoading = false;
    notifyStationsListeners();
  }
}

function notifyStationsListeners() {
  stationsListeners.forEach((fn) => fn());
}

export function useStations({
  autoLoad = true,
}: UseStationsOptions = {}): UseStationsResult {
  const [, forceUpdate] = useState(0);

  // Subscribe to cache updates
  useEffect(() => {
    const update = () => forceUpdate((n) => n + 1);
    stationsListeners.push(update);
    return () => {
      stationsListeners = stationsListeners.filter((fn) => fn !== update);
    };
  }, []);

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
    stations: cachedStations ?? [],
    isLoading: cachedStationsLoading || cachedStations === null,
    error: cachedStationsError,
    refetch,
  };
}

interface UseNearbyStationsOptions {
  lon: number;
  lat: number;
  maxDistance?: number; // in meters, default 10km
  limit?: number; // max number of results
}

export interface StationWithDistance extends IStation {
  distance: number; // distance in meters
}

export interface UseNearbyStationsResult {
  stations: StationWithDistance[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
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
  lon,
  lat,
  maxDistance = 5000,
  limit,
}: UseNearbyStationsOptions): UseNearbyStationsResult {
  const { stations: allStations, isLoading, error, refetch } = useStations();

  // Filter and sort stations by distance
  const nearbyStations = useMemo(() => {
    const stationsWithDistance: StationWithDistance[] = allStations
      .map((station) => {
        const distance = getDistance(
          lon,
          lat,
          station.location.coordinates[0],
          station.location.coordinates[1]
        );
        return {
          ...station,
          distance,
        };
      })
      .filter((station) => station.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    return limit ? stationsWithDistance.slice(0, limit) : stationsWithDistance;
  }, [allStations, lon, lat, maxDistance, limit]);

  return {
    stations: nearbyStations,
    isLoading,
    error,
    refetch,
  };
}
