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

export type SportType = 'paragliding' | 'hanggliding' | 'kitesurfing' | 'kitefoiling';

export const SPORT_LABELS: Record<SportType, string> = {
  paragliding: 'Paragliding',
  hanggliding: 'Hang Gliding',
  kitesurfing: 'Kitesurfing',
  kitefoiling: 'Kite Foiling'
};

export interface MapControlsState {
  // State
  overlay: MapOverlay;
  viewMode: 'stations' | 'sites';
  unit: WindUnit;
  stationElevationFilter: number;
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
  onStationElevationFilterChange: (value: number) => void;
  onRecentsToggle: () => void;
  onToggleViewMode: (value: 'stations' | 'sites') => void;
  onSiteDirectionFilterChange: (bearing: number | null) => void;
}
