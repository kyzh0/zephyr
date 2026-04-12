export interface StationData {
  _id: string;
  time: Date;
  windAverage?: number;
  windGust?: number;
  windBearing?: number;
  temperature?: number;
  validBearings?: string | null;
}

// Type for historical data API response (uses 'id' instead of '_id')
export interface HistoricalStationData {
  id: string;
  windAverage: number | null;
  windGust: number | null;
  windBearing: number | null;
  validBearings: string | null;
}
