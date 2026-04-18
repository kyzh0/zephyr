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

export type WindUnit = 'kmh' | 'kt';

export type MapOverlay = 'webcams' | 'soundings' | null;

export type SportType = 'paragliding' | 'hanggliding' | 'kitesurfing';

export const SPORT_LABELS: Record<SportType, string> = {
  paragliding: 'Paragliding',
  hanggliding: 'Hang Gliding',
  kitesurfing: 'Kitesurfing'
};

export interface MapControlsState {
  // State
  overlay: MapOverlay;
  viewMode: 'stations' | 'sites';
  unit: WindUnit;
  stationElevationFilter: [number, number];
  historyOffset: number;
  isHistoricData: boolean;
  minimizeRecents: boolean;
  siteDirectionFilter: number | null;
  // Handlers
  onWebcamClick: () => void;
  onSoundingClick: () => void;
  onLayerToggle: () => void;
  onLocateClick: () => Promise<void>;
  onUnitToggle: () => void;
  onHistoryChange: (offset: number) => Promise<void>;
  onStationElevationFilterChange: (value: [number, number]) => void;
  onRecentsToggle: () => void;
  onToggleViewMode: (value: 'stations' | 'sites') => void;
  onSiteDirectionFilterChange: (bearing: number | null) => void;
  onSearchSelect: (result: SearchResult) => void;
}

export const ELEVATION_FILTER_MIN = 0;
export const ELEVATION_FILTER_MAX = 2500;
