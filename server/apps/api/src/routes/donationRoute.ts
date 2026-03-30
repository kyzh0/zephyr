import express, { type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';

import { Donation, DonationDoc, DONATION_REGIONS, User, type DonationRegion } from '@zephyr/shared';

const router = express.Router();

type ApiKeyQuery = { key?: string };
type IdParams = { id: string };

type LeaderboardQuery = { limit?: string };

function isValidRegion(r: string): r is DonationRegion {
  return (DONATION_REGIONS as readonly string[]).includes(r);
}

type CreateDonationBody = {
  donorName: string;
  amount: number;
  donatedAt: string;
  region: string;
};

// Public leaderboard (names and regions only; no amounts)
router.get(
  '/leaderboard',
  async (
    req: Request<Record<string, never>, unknown, unknown, LeaderboardQuery>,
    res: Response
  ) => {
    const [donorRows, regionRows] = await Promise.all([
      Donation.aggregate<{ name: string }>([
        {
          $group: {
            _id: { $trim: { input: '$donorName' } },
            total: { $sum: '$amount' },
            donationCount: { $sum: 1 }
          }
        },
        { $match: { _id: { $ne: '' } } },
        { $sort: { total: -1 } },
        { $project: { _id: 0, name: '$_id' } }
      ]),
      Donation.aggregate<{ name: string; donationCount: number }>([
        {
          $group: {
            _id: '$region',
            total: { $sum: '$amount' },
            donationCount: { $sum: 1 }
          }
        },
        { $match: { _id: { $ne: 'Unknown' } } },
        { $sort: { total: -1 } },
        { $project: { _id: 0, name: '$_id', donationCount: 1 } }
      ])
    ]);

    res.json({
      donors: donorRows.map((r) => ({ name: r.name })),
      regions: regionRows.map((r) => ({ name: r.name, donationCount: r.donationCount }))
    });
  }
);

// List all donation records (admin)
router.get(
  '/',
  async (req: Request<Record<string, never>, unknown, unknown, ApiKeyQuery>, res: Response) => {
    const user = await User.findOne({ key: req.query.key }).lean();
    if (!user) {
      res.sendStatus(401);
      return;
    }

    const rows = await Donation.find().sort({ donatedAt: -1 }).lean();
    res.json(rows);
  }
);

router.post(
  '/',
  async (
    req: Request<Record<string, never>, unknown, CreateDonationBody, ApiKeyQuery>,
    res: Response
  ) => {
    const user = await User.findOne({ key: req.query.key }).lean();
    if (!user) {
      res.sendStatus(401);
      return;
    }

    const { donorName, amount, donatedAt, region } = req.body;

    const trimmed = donorName.trim();
    if (!trimmed) {
      res.status(400).json({ error: 'Donor name is required' });
      return;
    }

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      res.status(400).json({ error: 'Amount must be a positive number' });
      return;
    }

    const at = new Date(donatedAt);
    if (Number.isNaN(at.getTime())) {
      res.status(400).json({ error: 'Donation date is not valid' });
      return;
    }

    if (!region || !isValidRegion(region)) {
      res.status(400).json({ error: 'Region is not valid' });
      return;
    }

    const doc: DonationDoc = new Donation({
      donorName: trimmed,
      amount: amt,
      donatedAt: at,
      region
    });

    try {
      await doc.save();
      res.header('Location', `${req.protocol}://${req.get('host')}/donations/${doc._id}`);
      res.status(201).json(doc);
    } catch (err) {
      res.status(500).json(err);
    }
  }
);

router.delete(
  '/:id',
  async (req: Request<IdParams, unknown, unknown, ApiKeyQuery>, res: Response) => {
    const user = await User.findOne({ key: req.query.key }).lean();
    if (!user) {
      res.sendStatus(401);
      return;
    }

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      res.sendStatus(404);
      return;
    }

    const row = await Donation.findOne({ _id: new ObjectId(id) }).lean();
    if (!row) {
      res.sendStatus(404);
      return;
    }

    await Donation.deleteOne({ _id: new ObjectId(id) });
    res.sendStatus(204);
  }
);

export default router;
