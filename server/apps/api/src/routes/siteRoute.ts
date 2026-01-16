import express, { type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { QueryFilter } from 'mongoose';

import { User, Site, SiteDoc, type SiteAttrs, type WithId } from '@zephyr/shared';

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

// get sites
router.get(
  '/',
  async (
    req: Request<Record<string, never>, unknown, unknown, IncludeDisabledQuery>,
    res: Response
  ) => {
    const { includeDisabled } = req.query;

    const query: QueryFilter<SiteAttrs> = {};
    if (String(includeDisabled).toLowerCase() !== 'true') {
      query.isDisabled = { $ne: true };
    }

    const sites = await Site.find(query).lean();
    res.json(sites);
  }
);

// add site
router.post(
  '/',
  async (req: Request<Record<string, never>, unknown, SiteAttrs, ApiKeyQuery>, res: Response) => {
    const user = await User.findOne({ key: req.query.key }).lean();
    if (!user) {
      res.sendStatus(401);
      return;
    }

    const {
      name,
      location,
      rating,
      siteGuideUrl,
      validBearings,
      elevation,
      radio,
      landingSummary,
      hazards,
      description,
      access,
      mandatoryNotices,
      airspaceNotices,
      landingNotices,
      isDisabled
    } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Site name is required' });
      return;
    }

    if (location && !isValidLonLat(location.coordinates)) {
      res.status(400).json({ error: 'Location is not valid' });
      return;
    }

    if (elevation === undefined || elevation === null) {
      res.status(400).json({ error: 'Elevation is required' });
      return;
    }

    if (!landingSummary) {
      res.status(400).json({ error: 'Landing Summary is required' });
      return;
    }

    const site: SiteDoc = new Site({
      name,
      location,
      rating,
      siteGuideUrl,
      validBearings,
      elevation,
      radio,
      landingSummary,
      hazards,
      description,
      access,
      mandatoryNotices,
      airspaceNotices,
      landingNotices,
      isDisabled: isDisabled
    });

    try {
      await site.save();
      res.header('Location', `${req.protocol}://${req.get('host')}/sites/${site._id}`);
      res.sendStatus(201);
    } catch (err) {
      res.status(500).json(err);
    }
  }
);

// get site
router.get('/:id', async (req: Request<IdParams>, res: Response) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.sendStatus(404);
    return;
  }

  const s = await Site.findOne({ _id: new ObjectId(id) }).lean();
  if (!s) {
    res.sendStatus(404);
    return;
  }

  res.json(s);
});

// update site
router.put(
  '/:id',
  async (req: Request<IdParams, unknown, WithId<SiteAttrs>, ApiKeyQuery>, res: Response) => {
    const user = await User.findOne({ key: req.query.key }).lean();
    if (!user) {
      res.sendStatus(401);
      return;
    }

    const { id } = req.params;
    const {
      _id,
      name,
      location,
      rating,
      siteGuideUrl,
      validBearings,
      elevation,
      radio,
      landingSummary,
      hazards,
      description,
      access,
      mandatoryNotices,
      airspaceNotices,
      landingNotices,
      isDisabled,
      __v
    } = req.body;

    if (!ObjectId.isValid(id)) {
      res.sendStatus(404);
      return;
    }
    if (_id && _id.toString() !== id) {
      res.sendStatus(400);
      return;
    }

    const site = await Site.findOne({ _id: new ObjectId(id) });
    if (!site) {
      res.sendStatus(404);
      return;
    }
    if (__v === null || __v === undefined || site.__v !== __v) {
      res.sendStatus(409);
      return;
    }

    if (!name) {
      res.status(400).json({ error: 'Site name is required' });
      return;
    }

    if (!location || !isValidLonLat(location.coordinates)) {
      res.status(400).json({ error: 'Location is not valid' });
      return;
    }

    if (elevation === undefined || elevation === null) {
      res.status(400).json({ error: 'Elevation is required' });
      return;
    }

    if (!landingSummary) {
      res.status(400).json({ error: 'Landing Summary is required' });
      return;
    }

    site.name = name;
    site.location = location;
    site.rating = rating ?? undefined;
    site.siteGuideUrl = siteGuideUrl ?? undefined;
    site.validBearings = validBearings ?? undefined;
    site.elevation = elevation;
    site.radio = radio ?? undefined;
    site.landingSummary = landingSummary;
    site.hazards = hazards;
    site.description = description;
    site.access = access;
    site.mandatoryNotices = mandatoryNotices ?? undefined;
    site.airspaceNotices = airspaceNotices ?? undefined;
    site.landingNotices = landingNotices ?? undefined;
    site.isDisabled = isDisabled;

    try {
      await site.save();
      res.json(site);
    } catch (err) {
      res.status(500).json(err);
    }
  }
);

// delete site
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

    const s = await Site.findOne({ _id: new ObjectId(id) }).lean();
    if (!s) {
      res.sendStatus(404);
      return;
    }

    await Site.deleteOne({ _id: new ObjectId(id) });
    res.sendStatus(204);
  }
);

export default router;
