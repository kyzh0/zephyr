import type { ILocation } from './location.model';

interface ICam {
  _id: string;
  currentTime: string;
  currentUrl: string;
  externalId: string;
  externalLink: string;
  lastUpdate: string;
  location: ILocation;
  name: string;
  type: string;
  isDisabled?: boolean;
  imageCount?: number;
  __v?: number;
}

interface ICamImage {
  time: string;
  url: string;
  _id: string;
}

export type { ICam, ICamImage };
