import mongoose, { type HydratedDocument, type Model } from 'mongoose';

export type WindDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export type AlertRuleAttrs = {
  id: string;
  stationId: string;
  threshold: number;
  boundType: 'above' | 'below';
  directions: WindDirection[];
  activeHours: number;
  enabledAt: number;
};

export type PushSubscriptionAttrs = {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
  rules: AlertRuleAttrs[];
  unit: 'kmh' | 'kt';
  refreshedAt: Date;
  createdAt: Date;
};

export type PushSubscriptionDoc = HydratedDocument<PushSubscriptionAttrs>;

const alertRuleSchema = new mongoose.Schema<AlertRuleAttrs>(
  {
    id: { type: String, required: true },
    stationId: { type: String, required: true },
    threshold: { type: Number, required: true },
    boundType: { type: String, required: true },
    directions: [{ type: String }],
    activeHours: { type: Number, required: true },
    enabledAt: { type: Number, required: true }
  },
  { _id: false }
);

const pushSubscriptionSchema = new mongoose.Schema<PushSubscriptionAttrs>({
  endpoint: { type: String, required: true, unique: true },
  keys: {
    auth: { type: String, required: true },
    p256dh: { type: String, required: true }
  },
  rules: [alertRuleSchema],
  unit: { type: String, enum: ['kmh', 'kt'], default: 'kmh' },
  refreshedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

pushSubscriptionSchema.index({ refreshedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const PushSubscription: Model<PushSubscriptionAttrs> = mongoose.model<PushSubscriptionAttrs>(
  'PushSubscription',
  pushSubscriptionSchema
);
