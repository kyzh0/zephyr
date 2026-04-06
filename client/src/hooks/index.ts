export { useStationData, type TimeRange } from './useStationData';
export { useIsMobile } from './useIsMobile';
export {
  useWebcam,
  useWebcamWithImages,
  useWebcams,
  useNearbyWebcams,
  useInvalidateWebcams
} from './useWebcam';
export { useNearbySites, useSite, useSites, useInvalidateSites } from './useSites';
export { useNearbyStations, useStation, useStations, useInvalidateStations } from './useStations';
export { useDonations, useLeaderboard } from './useDonations';
export { useLanding, useLandings, useInvalidateLandings } from './useLandings';
export { useSounding, useSoundings, useInvalidateSoundings } from './useSoundings';
export { usePersistedState } from './usePersistedState';

export interface UseNearbyLocationsOptions {
  lat: number;
  lon: number;
  maxDistance?: number; // in meters, default 10km
  limit?: number; // max number of results
}

export interface UseNearbyLocationsResult<T> {
  data: { data: T; distance: number }[];
  isLoading: boolean;
  error: Error | null;
}
