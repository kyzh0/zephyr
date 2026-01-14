import type { Types } from 'mongoose';

export type WithId<T> = T & { _id: Types.ObjectId; __v: number };

export type GeoPoint = {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
};
