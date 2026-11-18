import mongoose, { type HydratedDocument, type Model } from 'mongoose';

// Raw readings pushed to the ingest endpoint. The scheduler aggregates these into
// StationData buckets, so they only need to live long enough to be processed.
export type PushReadingAttrs = {
  station: mongoose.Types.ObjectId;
  receivedAt: Date;
  windAverage?: number | null;
  windGust?: number | null;
  windBearing?: number | null;
  temperature?: number | null;
};

export type PushReadingDoc = HydratedDocument<PushReadingAttrs>;

const pushReadingSchema = new mongoose.Schema<PushReadingAttrs>({
  station: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
    required: true
  },
  receivedAt: { type: Date, required: true },

  windAverage: { type: Number },
  windGust: { type: Number },
  windBearing: { type: Number },
  temperature: { type: Number }
});

pushReadingSchema.index({ station: 1, receivedAt: -1 });
pushReadingSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 60 * 60 });

export const PushReading: Model<PushReadingAttrs> = mongoose.model<PushReadingAttrs>(
  'PushReading',
  pushReadingSchema
);
