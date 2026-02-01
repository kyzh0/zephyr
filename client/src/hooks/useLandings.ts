import { useEffect, useState, useCallback } from 'react';
import { listLandings } from '@/services/landing.service';
import type { ILanding } from '@/models/landing.model';
import { handleError } from '@/lib/utils';

// Module-level singleton cache for landings
let cachedLandings: ILanding[] | null = null;
let cachedError: Error | null = null;
let cachedLoading = false;
let listeners: (() => void)[] = [];

async function fetchLandingsAndNotify() {
  cachedLoading = true;
  notifyListeners();
  try {
    const result = await listLandings();
    cachedLandings = result ?? [];
    cachedError = null;
  } catch (err) {
    cachedError = handleError(err, 'Operation failed');
    cachedLandings = [];
  } finally {
    cachedLoading = false;
    notifyListeners();
  }
}

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

interface UseLandingsOptions {
  autoLoad?: boolean;
}

export interface UseLandingsResult {
  landings: ILanding[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching all landings
 * @param options - Configuration options
 * @param options.autoLoad - Whether to automatically load landings (default: true)
 * @returns All landings with loading and error states
 */
export function useLandings({ autoLoad = true }: UseLandingsOptions = {}): UseLandingsResult {
  const [, forceUpdate] = useState(0);

  // Subscribe to cache updates
  useEffect(() => {
    const update = () => forceUpdate((n) => n + 1);
    listeners.push(update);
    return () => {
      listeners = listeners.filter((fn) => fn !== update);
    };
  }, []);

  // Fetch once if needed
  useEffect(() => {
    if (autoLoad && cachedLandings === null && !cachedLoading) {
      fetchLandingsAndNotify();
    }
  }, [autoLoad]);

  const refetch = useCallback(async () => {
    await fetchLandingsAndNotify();
  }, []);

  return {
    landings: cachedLandings ?? [],
    isLoading: cachedLoading || cachedLandings === null,
    error: cachedError,
    refetch
  };
}
