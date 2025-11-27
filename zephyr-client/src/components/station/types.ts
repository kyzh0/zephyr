import type { IStationData } from "@/models/station-data.model";

// Extended station data type with computed fields
export interface ExtendedStationData extends IStationData {
  timeLabel: string;
  windAverageKt: number | null;
  windGustKt: number | null;
  [key: `validBearings${number}`]: [number, number];
}

// Screen size context for responsive scaling
export interface ScreenSize {
  bigScreen: boolean;
  tinyScreen: boolean;
  scaling: number;
}

// Unit type for wind speed display
export type WindUnit = "kt" | "kmh";
