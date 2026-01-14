import mongoose, { type HydratedDocument, type Model } from 'mongoose';

export type ClientUsage = {
  month: string; // e.g. "2026-01"
  apiCalls: number;
};

export type ClientAttrs = {
  name: string;
  apiKey: string;
  monthlyLimit: number;
  usage: ClientUsage[];
};

export type ClientDoc = HydratedDocument<ClientAttrs>;

const clientSchema = new mongoose.Schema<ClientAttrs>({
  name: { type: String, required: true },
  apiKey: { type: String, required: true },
  monthlyLimit: { type: Number, required: true },
  usage: [
    {
      month: { type: String, required: true },
      apiCalls: { type: Number, required: true }
    }
  ]
});

export const Client: Model<ClientAttrs> = mongoose.model<ClientAttrs>('Client', clientSchema);
