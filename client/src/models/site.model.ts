import type { ILocation } from "./location.model";

export interface ISite {
  _id: string;
  name: string;
  location: ILocation;
  rating: {
    paragliding: string;
    hangGliding: string;
  };
  siteGuideUrl: string;
  validBearings?: string;
  elevation?: number;
  radio: string;
  description: string;
  mandatoryNotices: string;
  airspaceNotices: string;
  landingNotices: string;
  isDisabled: boolean;
}
