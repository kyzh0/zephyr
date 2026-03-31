import mongoose, { type HydratedDocument, type Model } from 'mongoose';

export const DONATION_REGIONS = [
  'Unknown',
  'Visitor',
  'Southern',
  'Canterbury',
  'Tasman',
  'Marlborough',
  'Aorangi',
  'Wellington',
  'Auckland',
  'Waikato',
  'Hawkes Bay',
  'Bay of Plenty',
  'Northland'
] as const;

export type DonationRegion = (typeof DONATION_REGIONS)[number];

export type DonationAttrs = {
  donorName: string;
  /** Donation amount in NZD (dollars, may include cents). */
  amount: number;
  donatedAt: Date;
  region: DonationRegion;
};

export type DonationDoc = HydratedDocument<DonationAttrs>;

const donationSchema = new mongoose.Schema<DonationAttrs>(
  {
    donorName: { type: String, required: true },
    amount: { type: Number, required: true },
    donatedAt: { type: Date, required: true },
    region: {
      type: String,
      required: true,
      enum: [...DONATION_REGIONS]
    }
  },
  {
    optimisticConcurrency: true
  }
);

donationSchema.index({ donatedAt: -1 });
donationSchema.index({ region: 1 });

export const Donation: Model<DonationAttrs> = mongoose.model<DonationAttrs>(
  'Donation',
  donationSchema
);
