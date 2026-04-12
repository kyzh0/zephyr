import { useMemo } from 'react';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addStation,
  deleteStation,
  getStationById,
  listStations,
  patchStation
} from '@/services/station.service';
import { ApiError } from '@/services/api-error';
import type { Station } from '@/models/station.model';
import { getDistance, REFRESH_INTERVAL_MS } from '@/lib/utils';
import type { UseNearbyLocationsOptions, UseNearbyLocationsResult } from '.';

export const stationKeys = {
  all: ['stations'] as const,
  list: (opts?: { includeDisabled?: boolean }) =>
    opts?.includeDisabled ? (['stations', { includeDisabled: true }] as const) : stationKeys.all,
  detail: (id: string) => ['station', id] as const,
  data: (id: string, hr: boolean) => ['station', id, 'data', hr] as const
};

export interface UseStationsResult {
  stations: Station[];
  isLoading: boolean;
  error: Error | null;
}

interface UseStationsOptions {
  includeDisabled?: boolean;
}

export function useStations(options?: UseStationsOptions): UseStationsResult {
  const includeDisabled = options?.includeDisabled ?? false;

  const { data, isLoading, error } = useQuery({
    queryKey: stationKeys.list(includeDisabled ? { includeDisabled } : undefined),
    queryFn: () => listStations(includeDisabled),
    refetchInterval: REFRESH_INTERVAL_MS
  });

  return {
    stations: data ?? [],
    isLoading,
    error
  };
}

interface UseStationResult {
  station: Station | null;
  isLoading: boolean;
  error: Error | null;
}

export function useStation(id: string | undefined): UseStationResult {
  const { data, isLoading, error } = useQuery({
    queryKey: stationKeys.detail(id ?? ''),
    queryFn: id ? () => getStationById(id) : skipToken,
    refetchInterval: REFRESH_INTERVAL_MS,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2
  });

  return {
    station: data ?? null,
    isLoading,
    error
  };
}

export function useAddStation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addStation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: stationKeys.all })
  });
}

export function useUpdateStation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Station> }) =>
      patchStation(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: stationKeys.all });
      queryClient.invalidateQueries({ queryKey: stationKeys.detail(id) });
    }
  });
}

export function useDeleteStation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteStation,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: stationKeys.all });
      queryClient.removeQueries({ queryKey: stationKeys.detail(id) });
    }
  });
}

export function useNearbyStations({
  lat,
  lon,
  maxDistance = 5000,
  limit
}: UseNearbyLocationsOptions): UseNearbyLocationsResult<Station> {
  const { stations: allStations, isLoading, error } = useStations();

  const nearbyStations = useMemo(() => {
    if (isLoading || !allStations?.length || (lat === 0 && lon === 0)) {
      return [];
    }

    const stationsWithDistance: { data: Station; distance: number }[] = allStations
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
