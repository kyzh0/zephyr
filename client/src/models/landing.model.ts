import type { GeoPoint } from './location.model';

export interface Landing {
  _id: string;
  __v: number;

  name: string;
  location: GeoPoint;
  elevation: number;
  isDisabled: boolean;

  description: string;
  mandatoryNotices: string;
  hazards: string;
  siteGuideUrl: string;
}
