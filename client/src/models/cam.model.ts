import type { ILocation } from "./location.model";

interface ICam {
  name: string;
  type: string;
  location: ILocation;
  externalLink: string;
  externalId?: string;
  lastUpdate: Date;
  currentTime: Date;
  currentUrl?: string;
  images: ICamImage[];
}

interface ICamImage {
  time: Date;
  url: string;
  fileSize?: number;
  hash?: string;
}

export type { ICam, ICamImage };
