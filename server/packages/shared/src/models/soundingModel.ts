import mongoose, { type HydratedDocument, type Model } from 'mongoose';
import type { GeoPoint } from '../types/mongoose';

export type SoundingImage = {
  time: Date;
  url: string;
};

export type SoundingAttrs = {
  name: string;
  location: GeoPoint;
  raspRegion: string;
  raspId: string;
  images: SoundingImage[];
};

export type SoundingDoc = HydratedDocument<SoundingAttrs>;

const soundingSchema = new mongoose.Schema<SoundingAttrs>(
  {
    name: { type: String, required: true },

    location: {
      type: { type: String, required: true, enum: ['Point'] },
      coordinates: {
        type: [Number],
        required: true
      }
    },

    raspRegion: { type: String, required: true },
    raspId: { type: String, required: true },

    images: [
      {
        time: { type: Date, required: true },
        url: { type: String, required: true }
      }
    ]
  },
  {
    optimisticConcurrency: true
  }
);

export const Sounding: Model<SoundingAttrs> = mongoose.model<SoundingAttrs>(
  'Sounding',
  soundingSchema
);
