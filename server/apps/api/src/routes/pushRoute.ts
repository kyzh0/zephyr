import express, { type Request, type Response } from 'express';

import { PushSubscription, type AlertRuleAttrs } from '@zephyr/shared';

const router = express.Router();

type SubscribeBody = {
  endpoint: string;
  keys: { auth: string; p256dh: string };
  rules: AlertRuleAttrs[];
  unit: 'kmh' | 'kt';
};

type UnsubscribeBody = {
  endpoint: string;
};

router.post(
  '/subscribe',
  async (req: Request<Record<string, never>, unknown, SubscribeBody>, res: Response) => {
    const { endpoint, keys, rules, unit } = req.body;

    if (!endpoint || !keys?.auth || !keys?.p256dh) {
      res.status(400).json({ error: 'Invalid subscription payload' });
      return;
    }

    try {
      await PushSubscription.findOneAndUpdate(
        { endpoint },
        {
          endpoint,
          keys,
          rules: (rules ?? []).map((r) => ({
            id: r.id,
            stationId: r.stationId,
            threshold: r.threshold,
            boundType: r.boundType,
            directions: r.directions ?? []
          })),
          unit: unit ?? 'kmh',
          refreshedAt: new Date()
        },
        { upsert: true, new: true }
      );
      res.sendStatus(204);
    } catch {
      res.status(500).json({ error: 'Failed to save subscription' });
    }
  }
);

router.delete(
  '/subscribe',
  async (req: Request<Record<string, never>, unknown, UnsubscribeBody>, res: Response) => {
    const { endpoint } = req.body;

    if (!endpoint) {
      res.status(400).json({ error: 'Missing endpoint' });
      return;
    }

    try {
      await PushSubscription.deleteOne({ endpoint });
      res.sendStatus(204);
    } catch {
      res.status(500).json({ error: 'Failed to remove subscription' });
    }
  }
);

export default router;
