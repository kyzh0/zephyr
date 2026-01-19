import express, { type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { QueryFilter } from 'mongoose';

import { User, Landing, LandingDoc, type LandingAttrs, type WithId } from '@zephyr/shared';

const router = express.Router();

type ApiKeyQuery = { key?: string };
type IncludeDisabledQuery = { includeDisabled?: string };
type IdParams = { id: string };

function isValidLonLat(coords: unknown): coords is [number, number] {
  if (!Array.isArray(coords) || coords.length !== 2) {
    return false;
  }
  const lon = Number(coords[0]);
  const lat = Number(coords[1]);
  return (
    Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    lon >= -180 &&
    lon <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

// get landings
router.get(
  '/',
  async (
    req: Request<Record<string, never>, unknown, unknown, IncludeDisabledQuery>,
    res: Response
  ) => {
    const { includeDisabled } = req.query;

    const query: QueryFilter<LandingAttrs> = {};
    if (String(includeDisabled).toLowerCase() !== 'true') {
      query.isDisabled = { $ne: true };
    }

    const landings = await Landing.find(query).lean();
    res.json(landings);
  }
);

// add landing
router.post(
  '/',
  async (
    req: Request<Record<string, never>, unknown, LandingAttrs, ApiKeyQuery>,
    res: Response
  ) => {
    const user = await User.findOne({ key: req.query.key }).lean();
    if (!user) {
      res.sendStatus(401);
      return;
    }

    const {
      name,
      location,
      elevation,
      isDisabled,
      description,
      mandatoryNotices,
      hazards,
      siteGuideUrl
    } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Landing name is required' });
      return;
    }

    if (!location || !isValidLonLat(location.coordinates)) {
      res.status(400).json({ error: 'Location is not valid' });
      return;
    }

    if (!elevation) {
      res.status(400).json({ error: 'Elevation is required' });
      return;
    }

    const landing: LandingDoc = new Landing({
      name,
      location,
      elevation,
      isDisabled,
      description,
      mandatoryNotices,
      hazards,
      siteGuideUrl
    });

    try {
      await landing.save();
      res.header('Location', `${req.protocol}://${req.get('host')}/landings/${landing._id}`);
      res.sendStatus(201);
    } catch (err) {
      res.status(500).json(err);
    }
  }
);

// get landing
router.get('/:id', async (req: Request<IdParams>, res: Response) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.sendStatus(404);
    return;
  }

  const lz = await Landing.findOne({ _id: new ObjectId(id) }).lean();
  if (!lz) {
    res.sendStatus(404);
    return;
  }

  res.json(lz);
});

// update landing
router.put(
  '/:id',
  async (req: Request<IdParams, unknown, WithId<LandingAttrs>, ApiKeyQuery>, res: Response) => {
    const user = await User.findOne({ key: req.query.key }).lean();
    if (!user) {
      res.sendStatus(401);
      return;
    }

    const { id } = req.params;
    const {
      _id,
      __v,
      name,
      location,
      elevation,
      isDisabled,
      description,
      mandatoryNotices,
      hazards,
      siteGuideUrl
    } = req.body;

    if (!ObjectId.isValid(id)) {
      res.sendStatus(404);
      return;
    }
    if (_id && _id.toString() !== id) {
      res.sendStatus(400);
      return;
    }

    const landing = await Landing.findOne({ _id: new ObjectId(id) });
    if (!landing) {
      res.sendStatus(404);
      return;
    }
    if (__v === null || __v === undefined || landing.__v !== __v) {
      res.sendStatus(409);
      return;
    }

    if (!name) {
      res.status(400).json({ error: 'Landing name is required' });
      return;
    }

    if (!location || !isValidLonLat(location.coordinates)) {
      res.status(400).json({ error: 'Location is not valid' });
      return;
    }

    if (!elevation) {
      res.status(400).json({ error: 'Elevation is required' });
      return;
    }

    landing.name = name;
    landing.location = location;
    landing.elevation = elevation;
    landing.isDisabled = isDisabled;
    landing.description = description;
    landing.mandatoryNotices = mandatoryNotices;
    landing.hazards = hazards;
    landing.siteGuideUrl = siteGuideUrl;

    try {
      await landing.save();
      res.json(landing);
    } catch (err) {
      res.status(500).json(err);
    }
  }
);

// delete landing
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

    const s = await Landing.findOne({ _id: new ObjectId(id) }).lean();
    if (!s) {
      res.sendStatus(404);
      return;
    }

    await Landing.deleteOne({ _id: new ObjectId(id) });
    res.sendStatus(204);
  }
);

export default router;
