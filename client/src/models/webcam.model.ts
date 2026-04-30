import type { GeoPoint } from './location.model';

export interface Webcam {
  _id: string;
  currentTime: string;
  currentUrl: string;
  externalId: string;
  externalLink: string;
  lastUpdate: string;
  location: GeoPoint;
  name: string;
  type: string;
  isDisabled?: boolean;
  __v: number;
}

export interface WebcamImage {
  time: string;
  url: string;
  _id: string;
}
