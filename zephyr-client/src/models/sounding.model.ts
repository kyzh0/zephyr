import type { ILocation } from "./location.model";

interface ISounding {
  name: string;
  location: ILocation;
  raspRegion: string;
  raspId: string;
  images: Array<{
    time: Date;
    url: string;
  }>;
}

export type { ISounding };
