/** Regions for donation records (must match server DONATION_REGIONS). */
export const DONATION_REGIONS = [
  'Unknown',
  'Visitor',
  'Southern',
  'Canterbury',
  'Tasman',
  'Marlborough',
  'Aorangi',
  'Wellington',
  'Auckland',
  'Waikato',
  'Hawkes Bay',
  'Bay of Plenty',
  'Northland'
] as const;

export type DonationRegion = (typeof DONATION_REGIONS)[number];

export interface Donation {
  _id: string;
  __v: number;
  donorName: string;
  amount: number;
  donatedAt: string;
  region: DonationRegion;
}

export interface LeaderboardDonorRow {
  name: string;
}

export interface LeaderboardRegionRow {
  name: string;
  donationCount: number;
}

export interface LeaderboardResponse {
  donors: LeaderboardDonorRow[];
  regions: LeaderboardRegionRow[];
}
