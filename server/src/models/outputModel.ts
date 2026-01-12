import mongoose, { type HydratedDocument, type Model } from 'mongoose';

export type OutputAttrs = {
  time: Date;
  url: string;
  isHighResolution?: boolean;
};

export type OutputDoc = HydratedDocument<OutputAttrs>;

const outputSchema = new mongoose.Schema<OutputAttrs>({
  time: { type: Date, required: true },
  url: { type: String, required: true },
  isHighResolution: { type: Boolean }
});

export const Output: Model<OutputAttrs> = mongoose.model<OutputAttrs>('Output', outputSchema);
