import type { ILocation } from "./location.model";

export interface ISite {
  _id: string;
  __v: number;

  name: string;
  location: ILocation;
  elevation: number;
  validBearings: string;
  landingId: string;
  landingName: string;
  landingLocation: ILocation;
  isDisabled: boolean;

  description: string;
  mandatoryNotices: string;
  siteGuideUrl: string;
  hazards: string;
  access: string;
}
