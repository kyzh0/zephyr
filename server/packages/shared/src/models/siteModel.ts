import mongoose, { type HydratedDocument, type Model } from 'mongoose';
import type { GeoPoint } from '../types/mongoose';

export type SiteAttrs = {
  name: string;
  location: GeoPoint;
  elevation: number;
  validBearings: string;
  landings: mongoose.Types.ObjectId[];
  isDisabled: boolean;

  description?: string;
  mandatoryNotices?: string;
  siteGuideUrl?: string;
  hazards?: string;
  access?: string;
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
    elevation: { type: Number, required: true },
    validBearings: { type: String, required: true },
    landings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Landing'
      }
    ],
    isDisabled: { type: Boolean, required: true },

    description: { type: String },
    mandatoryNotices: { type: String },
    siteGuideUrl: { type: String },
    hazards: { type: String },
    access: { type: String }
  },
  {
    optimisticConcurrency: true
  }
);

siteSchema.index({ name: 1 });

export const Site: Model<SiteAttrs> = mongoose.model<SiteAttrs>('Site', siteSchema);
