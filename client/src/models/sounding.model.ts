import type { GeoPoint } from './location.model';

export interface Sounding {
  _id: string;
  __v: number;
  name: string;
  location: GeoPoint;
  raspRegion: string;
  raspId: string;
  images: {
    time: Date;
    url: string;
  }[];
}

export const RASP_REGIONS = [
  { value: 'NZNORTH_N', label: 'NZNORTH_N' },
  { value: 'NZNORTH_C', label: 'NZNORTH_C' },
  { value: 'NZSOUTH_N', label: 'NZSOUTH_N' },
  { value: 'NZSOUTH_S', label: 'NZSOUTH_S' }
] as const;
