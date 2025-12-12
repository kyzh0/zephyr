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

interface INewStation {
  name: string;
  type: string;
  coordinates: [number, number];
  externalLink: string;
  externalId: string;
  elevation?: number;
  validBearings?: string;
  harvestWindAverageId?: string;
  harvestWindGustId?: string;
  harvestWindDirectionId?: string;
  harvestTemperatureId?: string;
  gwWindAverageFieldName?: string;
  gwWindGustFieldName?: string;
  gwWindBearingFieldName?: string;
  gwTemperatureFieldName?: string;
}

export const STATION_TYPES = [
  { value: "harvest", label: "Harvest" },
  { value: "holfuy", label: "Holfuy" },
  { value: "metservice", label: "Metservice" },
  { value: "wu", label: "Weather Underground" },
  { value: "tempest", label: "Tempest" },
  { value: "attentis", label: "Attentis" },
  { value: "wow", label: "Met Office WOW" },
  { value: "windguru", label: "Windguru" },
  { value: "wp", label: "Weather Pro" },
  { value: "gw", label: "Greater Wellington" },
] as const;

export type { IStation, INewStation };
