import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addCam,
  deleteCam,
  getCamById,
  listCams,
  loadCamImages,
  patchCam
} from '@/services/cam.service';
import type { ICam, ICamImage } from '@/models/cam.model';
import { getDistance, REFRESH_INTERVAL_MS } from '@/lib/utils';
import type { UseNearbyLocationsOptions, UseNearbyLocationsResult } from '.';
import { ApiError } from '@/services/api-error';

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

interface UseWebcamOptions {
  id?: string;
}

export interface UseWebcamResult {
  webcam: ICam | null;
  isLoading: boolean;
  error: Error | null;
}

export interface UseWebcamWithImagesResult extends UseWebcamResult {
  images: ICamImage[];
  isStale: boolean;
}

function sortImages(imgs: ICamImage[]): ICamImage[] {
  return [...imgs].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

export function useWebcam({ id }: UseWebcamOptions = {}): UseWebcamResult {
  const webcamQuery = useQuery({
    queryKey: ['webcam', id],
    queryFn: () => getCamById(id!),
    enabled: !!id,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2
  });

  return {
    webcam: webcamQuery.data ?? null,
    isLoading: webcamQuery.isLoading,
    error: webcamQuery.error ?? null
  };
}

export function useWebcamWithImages({ id }: UseWebcamOptions = {}): UseWebcamWithImagesResult {
  const webcamQuery = useQuery({
    queryKey: ['webcam', id],
    queryFn: () => getCamById(id!),
    enabled: !!id,
    refetchInterval: REFRESH_INTERVAL_MS,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2
  });

  // Derive staleness from dataUpdatedAt
  const isStale = useMemo(() => {
    if (!webcamQuery.data) return false;
    const camTime = new Date(webcamQuery.data.currentTime).getTime();
    return webcamQuery.dataUpdatedAt - camTime >= STALE_THRESHOLD_MS;
  }, [webcamQuery.data, webcamQuery.dataUpdatedAt]);

  const imagesQuery = useQuery({
    queryKey: ['webcam-images', id],
    queryFn: async (): Promise<ICamImage[]> => {
      const imgs = await loadCamImages(id!);
      return sortImages(imgs);
    },
    enabled: !!id && !!webcamQuery.data && !isStale,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2
  });

  return {
    webcam: webcamQuery.data ?? null,
    images: imagesQuery.data ?? [],
    isLoading: webcamQuery.isLoading,
    isStale,
    error: webcamQuery.error ?? imagesQuery.error ?? null
  };
}

interface UseWebcamsOptions {
  includeDisabled?: boolean;
}

export function useWebcams(options?: UseWebcamsOptions) {
  const includeDisabled = options?.includeDisabled ?? false;

  const { data, isLoading, error } = useQuery({
    queryKey: includeDisabled ? ['webcams', { includeDisabled }] : ['webcams'],
    queryFn: () => listCams(includeDisabled),
    refetchInterval: includeDisabled ? undefined : REFRESH_INTERVAL_MS
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
    mutationFn: addCam,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webcams'] })
  });
}

export function useUpdateWebcam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof patchCam>[1] }) =>
      patchCam(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['webcams'] });
      queryClient.invalidateQueries({ queryKey: ['webcam', id] });
    }
  });
}

export function useDeleteWebcam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCam,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['webcams'] });
      queryClient.removeQueries({ queryKey: ['webcam', id] });
      queryClient.removeQueries({ queryKey: ['webcam-images', id] });
    }
  });
}

export function useNearbyWebcams({
  lat,
  lon,
  maxDistance = 5000,
  limit
}: UseNearbyLocationsOptions): UseNearbyLocationsResult<ICam> {
  const { webcams: allWebcams, isLoading, error } = useWebcams();

  const nearbyWebcams = useMemo(() => {
    if (isLoading || !allWebcams?.length || (lat === 0 && lon === 0)) {
      return [];
    }

    const webcamsWithDistance: { data: ICam; distance: number }[] = allWebcams
      .map((cam) => {
        const distance = getDistance(
          lon,
          lat,
          cam.location.coordinates[0],
          cam.location.coordinates[1]
        );
        return { data: cam, distance };
      })
      .filter((cam) => cam.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    return limit ? webcamsWithDistance.slice(0, limit) : webcamsWithDistance;
  }, [allWebcams, lat, lon, maxDistance, limit, isLoading]);

  return {
    data: nearbyWebcams,
    isLoading,
    error
  };
}
