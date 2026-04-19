export { useStationData, type TimeRange } from './useStationData';
export { useIsMobile } from './useIsMobile';
export {
  webcamKeys,
  useWebcam,
  useWebcamWithImages,
  useWebcams,
  useNearbyWebcams,
  useAddWebcam,
  useUpdateWebcam,
  useDeleteWebcam
} from './useWebcam';
export {
  siteKeys,
  useNearbySites,
  useSite,
  useSites,
  useAddSite,
  useUpdateSite,
  useDeleteSite
} from './useSites';
export {
  stationKeys,
  useNearbyStations,
  useStation,
  useStations,
  useAddStation,
  useUpdateStation,
  useDeleteStation
} from './useStations';
export {
  donationKeys,
  useDonations,
  useLeaderboard,
  useAddDonation,
  useDeleteDonation
} from './useDonations';
export {
  landingKeys,
  useLanding,
  useLandings,
  useAddLanding,
  useUpdateLanding,
  useDeleteLanding
} from './useLandings';
export {
  soundingKeys,
  useSounding,
  useSoundings,
  useAddSounding,
  useUpdateSounding,
  useDeleteSounding
} from './useSoundings';

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
