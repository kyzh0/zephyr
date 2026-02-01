import type { ILocation } from './location.model';

interface ISounding {
  name: string;
  location: ILocation;
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

export type { ISounding };
