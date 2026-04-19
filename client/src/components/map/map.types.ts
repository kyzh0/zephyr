import type { Station } from '@/models/station.model';
import type { Site } from '@/models/site.model';
import type { Landing } from '@/models/landing.model';
import type { Webcam } from '@/models/webcam.model';
import type { Sounding } from '@/models/sounding.model';

export type SearchResult =
  | { type: 'station'; item: Station }
  | { type: 'site'; item: Site }
  | { type: 'landing'; item: Landing }
  | { type: 'webcam'; item: Webcam }
  | { type: 'sounding'; item: Sounding };

export interface StationMarker {
  marker: HTMLDivElement;
  popup: mapboxgl.Popup;
}

export interface GeoJsonFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
}

export interface GeoJson {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

export interface HistoryDataEntry {
  time: string;
  values: HistoryValue[];
}

export interface HistoryValue {
  id: string;
  windAverage: number | null;
  windBearing: number | null;
  validBearings: string | null;
  isOffline: boolean | null;
}

export const WIND_UNITS = {
  KMH: 'kmh',
  KT: 'kt'
} as const;
export type WindUnit = (typeof WIND_UNITS)[keyof typeof WIND_UNITS];

export const MAP_OVERLAYS = {
  WEBCAMS: 'webcams',
  SOUNDINGS: 'soundings'
} as const;
export type MapOverlay = (typeof MAP_OVERLAYS)[keyof typeof MAP_OVERLAYS] | null;

export const MAP_VIEW_MODES = {
  STATIONS: 'stations',
  SITES: 'sites'
} as const;
export type MapViewMode = (typeof MAP_VIEW_MODES)[keyof typeof MAP_VIEW_MODES];

export const SPORTS = {
  PARAGLIDING: 'paragliding',
  HANGGLIDING: 'hanggliding',
  KITESURFING: 'kitesurfing'
} as const;
export type SportType = (typeof SPORTS)[keyof typeof SPORTS];

export const SPORT_LABELS: Record<SportType, string> = {
  [SPORTS.PARAGLIDING]: 'Paragliding',
  [SPORTS.HANGGLIDING]: 'Hang Gliding',
  [SPORTS.KITESURFING]: 'Kitesurfing'
};

export interface MapControlHandlers {
  onLayerToggle: () => void;
  onLocateClick: () => Promise<void>;
  onHistoryChange: (offset: number) => Promise<void>;
  onSiteDirectionFilterChange: (bearing: number | null) => void;
  onSearchSelect: (result: SearchResult) => void;
}

export const ELEVATION_FILTER_MIN = 0;
export const ELEVATION_FILTER_MAX = 2500;
