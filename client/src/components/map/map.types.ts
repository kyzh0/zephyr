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

export interface MapControlsState {
  // State
  overlay: MapOverlay;
  viewMode: 'stations' | 'sites';
  unit: WindUnit;
  elevationFilter: number;
  historyOffset: number;
  isHistoricData: boolean;
  minimizeRecents: boolean;
  // Handlers
  onWebcamClick: () => void;
  onSoundingClick: () => void;
  onLayerToggle: () => void;
  onLocateClick: () => Promise<void>;
  onUnitToggle: () => void;
  onHistoryChange: (offset: number) => Promise<void>;
  onElevationChange: (value: number) => void;
  onRecentsToggle: () => void;
  onToggleViewMode: (value: 'stations' | 'sites') => void;
}
