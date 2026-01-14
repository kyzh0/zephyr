import mongoose, { type HydratedDocument, type Model } from 'mongoose';
import type { GeoPoint } from '../types/mongoose';

export type SiteRating = {
  paragliding?: string;
  hangGliding?: string;
};

export type SiteAttrs = {
  name: string;
  takeoffLocation?: GeoPoint;
  landingLocation?: GeoPoint;

  rating?: SiteRating;

  siteGuideUrl: string;
  validBearings?: string;
  elevation: number;

  radio?: string;
  description: string;

  mandatoryNotices?: string;
  airspaceNotices?: string;
  landingNotices?: string;

  isDisabled?: boolean;
};

export type SiteDoc = HydratedDocument<SiteAttrs>;

const siteSchema = new mongoose.Schema<SiteAttrs>({
  name: { type: String, required: true },

  takeoffLocation: {
    type: { type: String, required: true, enum: ['Point'] },
    coordinates: {
      type: [Number]
    }
  },

  landingLocation: {
    type: { type: String, required: true, enum: ['Point'] },
    coordinates: {
      type: [Number]
    }
  },

  rating: {
    paragliding: { type: String },
    hangGliding: { type: String }
  },

  siteGuideUrl: { type: String, required: true },
  validBearings: { type: String },

  elevation: { type: Number, required: true },

  radio: { type: String },
  description: { type: String, required: true },

  mandatoryNotices: { type: String },
  airspaceNotices: { type: String },
  landingNotices: { type: String },

  isDisabled: { type: Boolean }
});

siteSchema.index({ name: 1 });

export const Site: Model<SiteAttrs> = mongoose.model<SiteAttrs>('Site', siteSchema);
