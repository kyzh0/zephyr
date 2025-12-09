interface IStationData {
  _id: string;
  time: Date;
  windAverage?: number;
  windGust?: number;
  windBearing?: number;
  temperature?: number;
  validBearings?: string | null;
}

// Type for historical data API response (uses 'id' instead of '_id')
interface IHistoricalStationData {
  id: string;
  windAverage: number | null;
  windBearing: number | null;
  validBearings: string | null;
}

export type { IStationData, IHistoricalStationData };
