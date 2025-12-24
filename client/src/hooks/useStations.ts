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
export function useStations({
  autoLoad = true,
}: UseStationsOptions = {}): UseStationsResult {
  const [stations, setStations] = useState<IStation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedStations = await listStations(false);
      if (fetchedStations) {
        setStations(fetchedStations);
      }
    } catch (err) {
      setError(handleError(err, "Failed to load stations"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      void refetch();
    }
  }, [autoLoad, refetch]);

  return {
    stations,
    isLoading,
    error,
    refetch,
  };
}

interface UseNearbyStationsOptions {
  latitude: number;
  longitude: number;
  maxDistance?: number; // in meters, default 10km
  limit?: number; // max number of results
}

interface StationWithDistance extends IStation {
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
 * @param options.maxDistance - Maximum distance in meters (default: 10000m / 10km)
 * @param options.limit - Maximum number of results to return
 * @returns Nearby stations sorted by distance with loading and error states
 */
export function useNearbyStations({
  latitude,
  longitude,
  maxDistance = 10000,
  limit,
}: UseNearbyStationsOptions): UseNearbyStationsResult {
  const { stations: allStations, isLoading, error, refetch } = useStations();

  // Filter and sort stations by distance
  const nearbyStations = useMemo(() => {
    const stationsWithDistance: StationWithDistance[] = allStations
      .map((station) => {
        const distance = getDistance(
          latitude,
          longitude,
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
  }, [allStations, latitude, longitude, maxDistance, limit]);

  return {
    stations: nearbyStations,
    isLoading,
    error,
    refetch,
  };
}
