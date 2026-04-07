export { useStationData, type TimeRange } from './useStationData';
export { useIsMobile } from './useIsMobile';
export {
  useWebcam,
  useWebcamWithImages,
  useWebcams,
  useNearbyWebcams,
  useAddWebcam,
  useUpdateWebcam,
  useDeleteWebcam
} from './useWebcam';
export {
  useNearbySites,
  useSite,
  useSites,
  useAddSite,
  useUpdateSite,
  useDeleteSite
} from './useSites';
export {
  useNearbyStations,
  useStation,
  useStations,
  useAddStation,
  useUpdateStation,
  useDeleteStation
} from './useStations';
export { useDonations, useLeaderboard, useAddDonation, useDeleteDonation } from './useDonations';
export {
  useLanding,
  useLandings,
  useAddLanding,
  useUpdateLanding,
  useDeleteLanding
} from './useLandings';
export {
  useSounding,
  useSoundings,
  useAddSounding,
  useUpdateSounding,
  useDeleteSounding
} from './useSoundings';
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
