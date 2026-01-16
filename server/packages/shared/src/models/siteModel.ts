import mongoose, { type HydratedDocument, type Model } from 'mongoose';
import type { GeoPoint } from '../types/mongoose';

export type SiteRating = {
  paragliding?: string;
  hangGliding?: string;
};

export type SiteAttrs = {
  name: string;
  location: GeoPoint;

  rating?: SiteRating;

  siteGuideUrl?: string;
  validBearings?: string;
  elevation: number;

  radio?: string;
  landingSummary: string;
  hazards?: string;
  description?: string;
  access?: string;

  mandatoryNotices?: string;
  airspaceNotices?: string;
  landingNotices?: string;

  isDisabled?: boolean;
};

export type SiteDoc = HydratedDocument<SiteAttrs>;

const siteSchema = new mongoose.Schema<SiteAttrs>(
  {
    name: { type: String, required: true },

    location: {
      type: { type: String, required: true, enum: ['Point'] },
      coordinates: {
        type: [Number],
        required: true
      }
    },

    rating: {
      paragliding: { type: String },
      hangGliding: { type: String }
    },

    siteGuideUrl: { type: String },
    validBearings: { type: String },

    elevation: { type: Number, required: true },

    radio: { type: String },
    landingSummary: { type: String, required: true },
    hazards: { type: String },
    description: { type: String },
    access: { type: String },

    mandatoryNotices: { type: String },
    airspaceNotices: { type: String },
    landingNotices: { type: String },

    isDisabled: { type: Boolean }
  },
  {
    optimisticConcurrency: true
  }
);

siteSchema.index({ name: 1 });

export const Site: Model<SiteAttrs> = mongoose.model<SiteAttrs>('Site', siteSchema);
