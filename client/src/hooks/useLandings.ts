import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getLandingById, listLandings } from '@/services/landing.service';
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
  refetch: () => Promise<void>;
}

export function useLanding(id: string | undefined): UseLandingResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['landing', id],
    queryFn: () => getLandingById(id!),
    enabled: !!id,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2
  });

  return {
    landing: data ?? null,
    isLoading,
    error,
    refetch: async () => {
      await refetch();
    }
  };
}

export function useInvalidateLandings(): () => Promise<void> {
  const queryClient = useQueryClient();
  return useCallback(
    async () => await queryClient.invalidateQueries({ queryKey: ['landings'] }),
    [queryClient]
  );
}
