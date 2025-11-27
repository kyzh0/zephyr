import type { ILocation } from "./location.model";

interface IStation {
  _id: string;
  name: string;
  type: string;
  location: ILocation;
  externalLink: string;
  externalId?: string;
  lastUpdate: Date;
  currentAverage?: number;
  currentGust?: number;
  currentBearing?: number;
  currentTemperature?: number;
  elevation?: number;
  validBearings?: string;
  popupMessage?: string;
  isHighResolution?: boolean;
  isError?: boolean;
  isOffline?: boolean;
  isDisabled?: boolean;
  harvestWindAverageId?: string;
  harvestWindGustId?: string;
  harvestWindDirectionId?: string;
  harvestTemperatureId?: string;
  harvestCookie?: string;
  gwWindAverageFieldName?: string;
  gwWindGustFieldName?: string;
  gwWindBearingFieldName?: string;
  gwTemperatureFieldName?: string;
  weatherlinkCookie?: string;
}

export type { IStation };
