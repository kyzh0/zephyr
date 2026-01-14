import mongoose, { type HydratedDocument, type Model } from 'mongoose';
import type { GeoPoint } from '../types/mongoose';

export type StationAttrs = {
  name: string;
  type: string;
  location: GeoPoint;

  externalLink: string;
  externalId?: string;

  lastUpdate: Date;

  currentAverage?: number | null;
  currentGust?: number | null;
  currentBearing?: number | null;
  currentTemperature?: number | null;

  elevation: number;
  validBearings?: string;
  popupMessage?: string;

  isHighResolution?: boolean;
  isError?: boolean;
  isOffline?: boolean;
  isDisabled?: boolean;

  harvestWindAverageId?: string;
  harvestWindGustId?: string;
  harvestWindDirectionId?: string;
  harvestTemperatureId?: string;
  harvestCookie?: string;

  gwWindAverageFieldName?: string;
  gwWindGustFieldName?: string;
  gwWindBearingFieldName?: string;
  gwTemperatureFieldName?: string;

  weatherlinkCookie?: string;
};

export type StationDoc = HydratedDocument<StationAttrs>;

const stationSchema = new mongoose.Schema<StationAttrs>({
  name: { type: String, required: true },
  type: { type: String, required: true },

  location: {
    type: { type: String, required: true, enum: ['Point'] },
    coordinates: {
      type: [Number],
      required: true
    }
  },

  externalLink: { type: String, required: true },
  externalId: { type: String },

  lastUpdate: { type: Date, default: Date.now, required: true },

  currentAverage: { type: Number },
  currentGust: { type: Number },
  currentBearing: { type: Number },
  currentTemperature: { type: Number },

  elevation: { type: Number },
  validBearings: { type: String },
  popupMessage: { type: String },

  isHighResolution: { type: Boolean },
  isError: { type: Boolean },
  isOffline: { type: Boolean },
  isDisabled: { type: Boolean },

  harvestWindAverageId: { type: String },
  harvestWindGustId: { type: String },
  harvestWindDirectionId: { type: String },
  harvestTemperatureId: { type: String },
  harvestCookie: { type: String },

  gwWindAverageFieldName: { type: String },
  gwWindGustFieldName: { type: String },
  gwWindBearingFieldName: { type: String },
  gwTemperatureFieldName: { type: String },

  weatherlinkCookie: { type: String }
});

stationSchema.virtual('data', {
  ref: 'StationData',
  localField: '_id',
  foreignField: 'station'
});

stationSchema.set('toObject', { virtuals: true });
stationSchema.set('toJSON', { virtuals: true });
stationSchema.index({ isDisabled: 1, isHighResolution: 1 });

export const Station: Model<StationAttrs> = mongoose.model<StationAttrs>('Station', stationSchema);
