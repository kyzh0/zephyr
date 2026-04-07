import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addLanding,
  deleteLanding,
  getLandingById,
  listLandings,
  updateLanding
} from '@/services/landing.service';
import { ApiError } from '@/services/api-error';
import type { ILanding } from '@/models/landing.model';

export interface UseLandingsResult {
  landings: ILanding[];
  isLoading: boolean;
  error: Error | null;
}

interface UseLandingsOptions {
  includeDisabled?: boolean;
}

export function useLandings(options?: UseLandingsOptions): UseLandingsResult {
  const includeDisabled = options?.includeDisabled ?? false;

  const { data, isLoading, error } = useQuery({
    queryKey: includeDisabled ? ['landings', { includeDisabled }] : ['landings'],
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
  landing: ILanding | null;
  isLoading: boolean;
  error: Error | null;
}

export function useLanding(id: string | undefined): UseLandingResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['landing', id],
    queryFn: () => getLandingById(id!),
    enabled: !!id,
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['landings'] })
  });
}

export function useUpdateLanding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ILanding> }) =>
      updateLanding(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['landings'] });
      queryClient.invalidateQueries({ queryKey: ['landing', id] });
    }
  });
}

export function useDeleteLanding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLanding,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['landings'] });
      queryClient.removeQueries({ queryKey: ['landing', id] });
    }
  });
}
