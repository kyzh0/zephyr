import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

export const soundingKeys = {
  all: ['soundings'] as const,
  detail: (id: string) => ['sounding', id] as const
};

export function useSoundings() {
  const { data, isLoading, error } = useQuery({
    queryKey: soundingKeys.all,
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
}

export function useSounding(id: string | undefined): UseSoundingResult {
  const { data, isLoading, error } = useQuery({
    queryKey: soundingKeys.detail(id ?? ''),
    queryFn: id ? () => getSoundingById(id) : skipToken,
    refetchInterval: 30 * REFRESH_INTERVAL_MS,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2
  });

  return {
    sounding: data ?? null,
    isLoading,
    error
  };
}

export function useAddSounding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addSounding,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: soundingKeys.all })
  });
}

export function useUpdateSounding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof patchSounding>[1] }) =>
      patchSounding(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: soundingKeys.all });
      queryClient.invalidateQueries({ queryKey: soundingKeys.detail(id) });
    }
  });
}

export function useDeleteSounding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSounding,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: soundingKeys.all });
      queryClient.removeQueries({ queryKey: soundingKeys.detail(id) });
    }
  });
}
