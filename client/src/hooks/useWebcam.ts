import { useMemo } from 'react';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Webcam, WebcamImage } from '@/models/webcam.model';
import { getDistance, REFRESH_INTERVAL_MS } from '@/lib/utils';
import type { UseNearbyLocationsOptions, UseNearbyLocationsResult } from '.';
import { ApiError } from '@/services/api-error';
import {
  addWebcam,
  deleteWebcam,
  getWebcamById,
  listWebcams,
  loadWebcamImages,
  patchWebcam
} from '@/services/webcam.service';

export const webcamKeys = {
  all: ['webcams'] as const,
  list: (opts?: { includeDisabled?: boolean }) =>
    opts?.includeDisabled ? (['webcams', { includeDisabled: true }] as const) : webcamKeys.all,
  detail: (id: string) => ['webcam', id] as const,
  images: (id: string) => ['webcam-images', id] as const
};

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface UseWebcamResult {
  webcam: Webcam | null;
  isLoading: boolean;
  error: Error | null;
}

export interface UseWebcamWithImagesResult extends UseWebcamResult {
  images: WebcamImage[];
  isStale: boolean;
}

function sortImages(imgs: WebcamImage[]): WebcamImage[] {
  return [...imgs].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

export function useWebcam(id: string | undefined): UseWebcamResult {
  const webcamQuery = useQuery({
    queryKey: webcamKeys.detail(id ?? ''),
    queryFn: id ? () => getWebcamById(id) : skipToken,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2
  });

  return {
    webcam: webcamQuery.data ?? null,
    isLoading: webcamQuery.isLoading,
    error: webcamQuery.error ?? null
  };
}

export function useWebcamWithImages(id: string | undefined): UseWebcamWithImagesResult {
  const webcamQuery = useQuery({
    queryKey: webcamKeys.detail(id ?? ''),
    queryFn: id ? () => getWebcamById(id) : skipToken,
    refetchInterval: REFRESH_INTERVAL_MS,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2
  });

  // Derive staleness from dataUpdatedAt
  const isStale = useMemo(() => {
    if (!webcamQuery.data) return false;
    const webcamTime = new Date(webcamQuery.data.currentTime).getTime();
    return webcamQuery.dataUpdatedAt - webcamTime >= STALE_THRESHOLD_MS;
  }, [webcamQuery.data, webcamQuery.dataUpdatedAt]);

  const imagesQuery = useQuery({
    queryKey: webcamKeys.images(id ?? ''),
    queryFn: async (): Promise<WebcamImage[]> => {
      const imgs = await loadWebcamImages(id!);
      return sortImages(imgs);
    },
    enabled: !!id && !!webcamQuery.data && !isStale,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2
  });

  return {
    webcam: webcamQuery.data ?? null,
    images: imagesQuery.data ?? [],
    isLoading: webcamQuery.isLoading || imagesQuery.isLoading,
    isStale,
    error: webcamQuery.error ?? imagesQuery.error ?? null
  };
}

interface UseWebcamsOptions {
  includeDisabled?: boolean;
}

export interface UseWebcamsResult {
  webcams: Webcam[];
  isLoading: boolean;
  error: Error | null;
}

export function useWebcams(options?: UseWebcamsOptions): UseWebcamsResult {
  const includeDisabled = options?.includeDisabled ?? false;

  const { data, isLoading, error } = useQuery({
    queryKey: webcamKeys.list(includeDisabled ? { includeDisabled } : undefined),
    queryFn: () => listWebcams(includeDisabled),
    refetchInterval: REFRESH_INTERVAL_MS
  });

  return {
    webcams: data ?? [],
    isLoading,
    error
  };
}

export function useAddWebcam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addWebcam,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: webcamKeys.all })
  });
}

export function useUpdateWebcam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof patchWebcam>[1] }) =>
      patchWebcam(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: webcamKeys.all });
      queryClient.invalidateQueries({ queryKey: webcamKeys.detail(id) });
    }
  });
}

export function useDeleteWebcam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWebcam,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: webcamKeys.all });
      queryClient.removeQueries({ queryKey: webcamKeys.detail(id) });
      queryClient.removeQueries({ queryKey: webcamKeys.images(id) });
    }
  });
}

export function useNearbyWebcams({
  lat,
  lon,
  maxDistance = 5000,
  limit
}: UseNearbyLocationsOptions): UseNearbyLocationsResult<Webcam> {
  const { webcams: allWebcams, isLoading, error } = useWebcams();

  const nearbyWebcams = useMemo(() => {
    if (isLoading || !allWebcams?.length || (lat === 0 && lon === 0)) {
      return [];
    }

    const webcamsWithDistance: { data: Webcam; distance: number }[] = allWebcams
      .map((webcam) => {
        const distance = getDistance(
          lon,
          lat,
          webcam.location.coordinates[0],
          webcam.location.coordinates[1]
        );
        return { data: webcam, distance };
      })
      .filter((webcam) => webcam.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    return limit ? webcamsWithDistance.slice(0, limit) : webcamsWithDistance;
  }, [allWebcams, lat, lon, maxDistance, limit, isLoading]);

  return {
    data: nearbyWebcams,
    isLoading,
    error
  };
}
