import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStationById, listStations } from '@/services/station.service';
import { ApiError } from '@/services/api-error';
import type { IStation } from '@/models/station.model';
import { getDistance, REFRESH_INTERVAL_MS } from '@/lib/utils';
import type { UseNearbyLocationsOptions, UseNearbyLocationsResult } from '.';

export interface UseStationsResult {
  stations: IStation[];
  isLoading: boolean;
  error: Error | null;
}

interface UseStationsOptions {
  includeDisabled?: boolean;
}

export function useStations(options?: UseStationsOptions): UseStationsResult {
  const includeDisabled = options?.includeDisabled ?? false;

  const { data, isLoading, error } = useQuery({
    queryKey: includeDisabled ? ['stations', { includeDisabled }] : ['stations'],
    queryFn: () => listStations(includeDisabled),
    refetchInterval: includeDisabled ? undefined : REFRESH_INTERVAL_MS
  });

  return {
    stations: data ?? [],
    isLoading,
    error
  };
}

interface UseStationResult {
  station: IStation | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useStation(id: string | undefined): UseStationResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['station', id],
    queryFn: () => getStationById(id!),
    enabled: !!id,
    refetchInterval: REFRESH_INTERVAL_MS,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2
  });

  return {
    station: data ?? null,
    isLoading,
    error,
    refetch: async () => {
      await refetch();
    }
  };
}

export function useInvalidateStations(): () => Promise<void> {
  const queryClient = useQueryClient();
  return useCallback(
    async () => await queryClient.invalidateQueries({ queryKey: ['stations'] }),
    [queryClient]
  );
}

export function useNearbyStations({
  lat,
  lon,
  maxDistance = 5000,
  limit
}: UseNearbyLocationsOptions): UseNearbyLocationsResult<IStation> {
  const { stations: allStations, isLoading, error } = useStations();

  const nearbyStations = useMemo(() => {
    if (isLoading || !allStations?.length || (lat === 0 && lon === 0)) {
      return [];
    }

    const stationsWithDistance: { data: IStation; distance: number }[] = allStations
      .map((station) => {
        const distance = getDistance(
          lon,
          lat,
          station.location.coordinates[0],
          station.location.coordinates[1]
        );
        return { data: station, distance };
      })
      .filter((station) => station.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    return limit ? stationsWithDistance.slice(0, limit) : stationsWithDistance;
  }, [allStations, lon, lat, maxDistance, limit, isLoading]);

  return {
    data: nearbyStations,
    isLoading,
    error
  };
}
