import { useMemo } from 'react';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addLanding,
  deleteLanding,
  deleteLandingImage,
  getLandingById,
  listLandings,
  updateLanding,
  updateLandingImageCaption,
  uploadLandingImage
} from '@/services/landing.service';
import { ApiError } from '@/services/api-error';
import type { Landing } from '@/models/landing.model';

export const landingKeys = {
  all: ['landings'] as const,
  list: (opts?: { includeDisabled?: boolean }) =>
    opts?.includeDisabled ? (['landings', { includeDisabled: true }] as const) : landingKeys.all,
  detail: (id: string) => ['landing', id] as const
};

export interface UseLandingsResult {
  landings: Landing[];
  isLoading: boolean;
  error: Error | null;
}

interface UseLandingsOptions {
  includeDisabled?: boolean;
}

export function useLandings(options?: UseLandingsOptions): UseLandingsResult {
  const includeDisabled = options?.includeDisabled ?? false;

  const { data, isLoading, error } = useQuery({
    queryKey: landingKeys.list(includeDisabled ? { includeDisabled } : undefined),
    queryFn: () => listLandings(includeDisabled)
  });

  const landings = useMemo(
    () => [...(data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [data]
  );

  return {
    landings,
    isLoading,
    error
  };
}

interface UseLandingResult {
  landing: Landing | null;
  isLoading: boolean;
  error: Error | null;
}

export function useLanding(id: string | undefined): UseLandingResult {
  const { data, isLoading, error } = useQuery({
    queryKey: landingKeys.detail(id ?? ''),
    queryFn: id ? () => getLandingById(id) : skipToken,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2
  });

  return {
    landing: data ?? null,
    isLoading,
    error
  };
}

export function useAddLanding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addLanding,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: landingKeys.all })
  });
}

export function useUpdateLanding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Landing> }) =>
      updateLanding(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: landingKeys.all });
      queryClient.invalidateQueries({ queryKey: landingKeys.detail(id) });
    }
  });
}

export function useDeleteLanding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLanding,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: landingKeys.all });
      queryClient.removeQueries({ queryKey: landingKeys.detail(id) });
    }
  });
}

export function useUploadLandingImage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, caption }: { file: File; caption: string }) =>
      uploadLandingImage(id, file, caption),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: landingKeys.detail(id) })
  });
}

export function useDeleteLandingImage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (filename: string) => deleteLandingImage(id, filename),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: landingKeys.detail(id) })
  });
}

export function useUpdateLandingImageCaption(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ filename, caption }: { filename: string; caption: string }) =>
      updateLandingImageCaption(id, filename, caption),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: landingKeys.detail(id) })
  });
}
