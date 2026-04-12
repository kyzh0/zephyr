import type { GeoPoint } from './location.model';

export interface Site {
  _id: string;
  __v: number;

  name: string;
  location: GeoPoint;
  elevation: number;
  validBearings: string;
  landings: {
    landingId: string;
    landingName: string;
    landingLocation: GeoPoint;
  }[];
  isDisabled: boolean;

  description: string;
  mandatoryNotices: string;
  siteGuideUrl: string;
  hazards: string;
  access: string;
}

export interface CreateSiteDto {
  name: string;
  location: GeoPoint;
  elevation: number;
  validBearings: string;
  landingIds: string[];
  isDisabled: boolean;

  description?: string;
  mandatoryNotices?: string;
  siteGuideUrl?: string;
  hazards?: string;
  access?: string;
}

export interface UpdateSiteDto {
  _id: string;
  __v: number;

  name: string;
  location: GeoPoint;
  elevation: number;
  validBearings: string;
  landingIds: string[];
  isDisabled: boolean;

  description?: string;
  mandatoryNotices?: string;
  siteGuideUrl?: string;
  hazards?: string;
  access?: string;
}
