import type { StationData } from '@/models/station-data.model';

// Extended station data type with computed fields
export interface ExtendedStationData extends StationData {
  timeLabel: string;
  windAverageKt: number | null;
  windGustKt: number | null;
  [key: `validBearings${number}`]: [number, number];
}

// Unit type for wind speed display
export type WindUnit = 'kt' | 'kmh';
