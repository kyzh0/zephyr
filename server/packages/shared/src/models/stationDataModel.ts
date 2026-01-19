import mongoose, { type HydratedDocument, type Model } from 'mongoose';

export type StationDataAttrs = {
  time: Date;
  windAverage?: number;
  windGust?: number;
  windBearing?: number;
  temperature?: number;
  station: mongoose.Types.ObjectId;
};

export type StationDataDoc = HydratedDocument<StationDataAttrs>;

const stationDataSchema = new mongoose.Schema<StationDataAttrs>({
  time: { type: Date, required: true },

  windAverage: { type: Number },
  windGust: { type: Number },
  windBearing: { type: Number },
  temperature: { type: Number },

  station: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station',
    required: true
  }
});

stationDataSchema.index({ station: 1, time: -1 });

export const StationData: Model<StationDataAttrs> = mongoose.model<StationDataAttrs>(
  'StationData',
  stationDataSchema
);
