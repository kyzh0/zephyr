interface IStationData {
  time: Date;
  windAverage?: number;
  windGust?: number;
  windBearing?: number;
  temperature?: number;
  station: string;
}

export type { IStationData };
