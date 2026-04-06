import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { REFRESH_INTERVAL_MS } from '@/lib/utils';
import { getSoundingById, listSoundings } from '@/services/sounding.service';
import { ApiError } from '@/services/api-error';
import type { ISounding } from '@/models/sounding.model';

export function useSoundings() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['soundings'],
    queryFn: () => listSoundings(),
    refetchInterval: 30 * REFRESH_INTERVAL_MS
  });

  return {
    soundings: data ?? [],
    isLoading,
    error
  };
}

interface UseSoundingResult {
  sounding: ISounding | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useInvalidateSoundings(): () => Promise<void> {
  const queryClient = useQueryClient();
  return useCallback(
    async () => await queryClient.invalidateQueries({ queryKey: ['soundings'] }),
    [queryClient]
  );
}

export function useSounding(id: string | undefined): UseSoundingResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sounding', id],
    queryFn: () => getSoundingById(id!),
    enabled: !!id,
    refetchInterval: 30 * REFRESH_INTERVAL_MS,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2
  });

  return {
    sounding: data ?? null,
    isLoading,
    error,
    refetch: async () => {
      await refetch();
    }
  };
}
