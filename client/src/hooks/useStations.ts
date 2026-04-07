import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addStation,
  deleteStation,
  getStationById,
  listStations,
  patchStation
} from '@/services/station.service';
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
    refetchInterval: includeDisabled ? undefined : REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: true
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
}

export function useStation(id: string | undefined): UseStationResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['station', id],
    queryFn: () => getStationById(id!),
    enabled: !!id,
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: true,
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stations'] })
  });
}

export function useUpdateStation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<IStation> }) =>
      patchStation(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      queryClient.invalidateQueries({ queryKey: ['station', id] });
    }
  });
}

export function useDeleteStation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteStation,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['stations'] });
      queryClient.removeQueries({ queryKey: ['station', id] });
    }
  });
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
