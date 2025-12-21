import type { ILocation } from "./location.model";

export interface ISite {
  _id: string;
  name: string;
  takeoffLocation: ILocation;
  landingLocation: ILocation;
  rating: {
    paragliding: string;
    hangGliding: string;
  };
  siteGuideURL: string;
  validBearings?: string;
  elevation?: number;
  radio: string;
  description: string;
  mandatoryNotices: string;
  airspaceNotices: string;
  landingNotices: string;
  isDisabled: boolean;
}
