import type { ILocation } from './location.model';

export interface ILanding {
  _id: string;
  __v: number;

  name: string;
  location: ILocation;
  elevation: number;
  isDisabled: boolean;

  description: string;
  mandatoryNotices: string;
  hazards: string;
  siteGuideUrl: string;
}
