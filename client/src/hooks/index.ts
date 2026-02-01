export { useStationData, type TimeRange } from './useStationData';
export { useIsMobile } from './useIsMobile';
export { useWebcam, useWebcams, useNearbyWebcams, type UseWebcamResult } from './useWebcam';
export { useNearbySites, useSites, type UseSitesResult } from './useSites';
export { useNearbyStations, useStations, type UseStationsResult } from './useStations';

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
  refetch: () => Promise<void>;
}
