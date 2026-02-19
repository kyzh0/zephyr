import mongoose, { type HydratedDocument, type Model } from 'mongoose';

export type CamImage = {
  time: Date;
  url: string;
  fileSize?: number;
  hash?: string;
};

export type CamLocation = {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
};

export type CamAttrs = {
  name: string;
  type: string;
  location: CamLocation;
  externalLink: string;
  externalId?: string;
  lastUpdate: Date;
  currentTime?: Date;
  currentUrl?: string;
  images: CamImage[];
  isDisabled?: boolean;
};

export type CamDoc = HydratedDocument<CamAttrs>;

const camSchema = new mongoose.Schema<CamAttrs>(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },

    location: {
      type: {
        type: String,
        required: true,
        enum: ['Point']
      },
      coordinates: {
        type: [Number],
        required: true
      }
    },

    externalLink: { type: String, required: true },
    externalId: { type: String },

    lastUpdate: { type: Date, default: Date.now, required: true },
    currentTime: { type: Date, default: Date.now },

    currentUrl: { type: String },

    images: [
      {
        time: { type: Date, required: true },
        url: { type: String, required: true },
        fileSize: { type: Number },
        hash: { type: String }
      }
    ],

    isDisabled: { type: Boolean }
  },
  {
    optimisticConcurrency: true
  }
);

camSchema.index({ isDisabled: 1 });

export const Cam: Model<CamAttrs> = mongoose.model<CamAttrs>('Cam', camSchema);
