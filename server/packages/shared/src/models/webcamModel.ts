import mongoose, { type HydratedDocument, type Model } from 'mongoose';

export type WebcamImage = {
  time: Date;
  url: string;
  fileSize?: number;
  hash?: string;
};

export type WebcamLocation = {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
};

export type WebcamAttrs = {
  name: string;
  type: string;
  location: WebcamLocation;
  externalLink: string;
  externalId?: string;
  lastUpdate: Date;
  currentTime?: Date;
  currentUrl?: string;
  images: WebcamImage[];
  isDisabled?: boolean;
};

export type WebcamDoc = HydratedDocument<WebcamAttrs>;

const webcamSchema = new mongoose.Schema<WebcamAttrs>(
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

webcamSchema.index({ isDisabled: 1 });

export const Webcam: Model<WebcamAttrs> = mongoose.model<WebcamAttrs>('Webcam', webcamSchema);
