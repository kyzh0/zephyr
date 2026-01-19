import mongoose, { type HydratedDocument, type Model } from 'mongoose';
import type { GeoPoint } from '../types/mongoose';

export type LandingAttrs = {
  name: string;
  location: GeoPoint;
  elevation: number;
  isDisabled: boolean;

  description?: string;
  mandatoryNotices?: string;
  hazards?: string;
  siteGuideUrl?: string;
};

export type LandingDoc = HydratedDocument<LandingAttrs>;

const landingSchema = new mongoose.Schema<LandingAttrs>(
  {
    name: { type: String, required: true },
    location: {
      type: { type: String, required: true, enum: ['Point'] },
      coordinates: {
        type: [Number],
        required: true
      }
    },
    elevation: { type: Number, required: true },
    isDisabled: { type: Boolean, required: true },

    description: { type: String },
    mandatoryNotices: { type: String },
    hazards: { type: String },
    siteGuideUrl: { type: String }
  },
  {
    optimisticConcurrency: true
  }
);

landingSchema.index({ name: 1 });

export const Landing: Model<LandingAttrs> = mongoose.model<LandingAttrs>('Landing', landingSchema);
