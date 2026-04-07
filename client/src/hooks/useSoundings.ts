import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { REFRESH_INTERVAL_MS } from '@/lib/utils';
import {
  addSounding,
  deleteSounding,
  getSoundingById,
  listSoundings,
  patchSounding
} from '@/services/sounding.service';
import { ApiError } from '@/services/api-error';
import type { ISounding } from '@/models/sounding.model';

export function useSoundings() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['soundings'],
    queryFn: () => listSoundings(),
    refetchInterval: 30 * REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: true
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
}

export function useAddSounding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addSounding,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['soundings'] })
  });
}

export function useUpdateSounding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof patchSounding>[1] }) =>
      patchSounding(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['soundings'] });
      queryClient.invalidateQueries({ queryKey: ['sounding', id] });
    }
  });
}

export function useDeleteSounding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSounding,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['soundings'] });
      queryClient.removeQueries({ queryKey: ['sounding', id] });
    }
  });
}

export function useSounding(id: string | undefined): UseSoundingResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['sounding', id],
    queryFn: () => getSoundingById(id!),
    enabled: !!id,
    refetchInterval: 30 * REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2
  });

  return {
    sounding: data ?? null,
    isLoading,
    error
  };
}
