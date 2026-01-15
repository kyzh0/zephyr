import type { ILocation } from "./location.model";

interface IStation {
  _id: string;
  name: string;
  type: string;
  location: ILocation;
  externalLink: string;
  externalId: string;
  currentAverage?: number;
  currentGust?: number;
  currentBearing?: number;
  currentTemperature?: number;
  elevation: number;
  lastUpdate: string;
  __v?: number;
  validBearings?: string;
  isError: boolean;
  isOffline: boolean;
  isHighResolution: boolean;
  isDisabled: boolean;
  harvestTemperatureId?: string;
  harvestWindAverageId?: string;
  harvestWindDirectionId?: string;
  harvestWindGustId?: string;
  popupMessage?: string;
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
  { value: "windy", label: "Windy" },
  { value: "wl", label: "Weatherlink" },
] as const;

export type { IStation, INewStation };
