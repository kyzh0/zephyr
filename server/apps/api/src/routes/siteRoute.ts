import express, { type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import mongoose, { QueryFilter } from 'mongoose';

import { User, Site, SiteDoc, type SiteAttrs, type WithId, type GeoPoint } from '@zephyr/shared';

const router = express.Router();

type ApiKeyQuery = { key?: string };
type IncludeDisabledQuery = { includeDisabled?: string };
type IdParams = { id: string };

type LandingLean = {
  _id: mongoose.Types.ObjectId;
  name: string;
  location: GeoPoint;
};
type SiteWithLandingLean = Omit<SiteAttrs, 'landing'> & {
  landing: LandingLean;
};
type SiteWithLandingDto = Omit<SiteAttrs, 'landing'> & {
  landingId: mongoose.Types.ObjectId;
  landingName: string;
  landingLocation: GeoPoint;
};

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

    const sites = await Site.find(query)
      .populate({
        path: 'landing',
        select: 'name location'
      })
      .lean<SiteWithLandingLean[]>();
    res.json(
      sites.map((site) => ({
        ...site,
        landingId: site.landing?._id,
        landingName: site.landing?.name,
        landingLocation: site.landing?.location
      }))
    );
  }
);

// add site
router.post(
  '/',
  async (
    req: Request<Record<string, never>, unknown, SiteWithLandingDto, ApiKeyQuery>,
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
      validBearings,
      landingId,
      isDisabled,
      description,
      mandatoryNotices,
      siteGuideUrl,
      hazards,
      access
    } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Site name is required' });
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

    if (!validBearings) {
      res.status(400).json({ error: 'Bearings are required' });
      return;
    }

    if (!landingId || !ObjectId.isValid(landingId)) {
      res.status(400).json({ error: 'Landing is not valid' });
      return;
    }

    const site: SiteDoc = new Site({
      name,
      location,
      elevation,
      validBearings,
      landing: new ObjectId(landingId),
      isDisabled,
      description,
      mandatoryNotices,
      siteGuideUrl,
      hazards,
      access
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

  const s = await Site.findOne({ _id: new ObjectId(id) })
    .populate({
      path: 'landing',
      select: 'name location'
    })
    .lean<SiteWithLandingLean>();
  if (!s) {
    res.sendStatus(404);
    return;
  }

  res.json({
    ...s,
    landingId: s.landing?._id,
    landingName: s.landing?.name,
    landingLocation: s.landing?.location
  });
});

// update site
router.put(
  '/:id',
  async (
    req: Request<IdParams, unknown, WithId<SiteWithLandingDto>, ApiKeyQuery>,
    res: Response
  ) => {
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
      validBearings,
      landingId,
      isDisabled,
      description,
      mandatoryNotices,
      siteGuideUrl,
      hazards,
      access
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

    if (!elevation) {
      res.status(400).json({ error: 'Elevation is required' });
      return;
    }

    if (!validBearings) {
      res.status(400).json({ error: 'Bearings are required' });
      return;
    }

    if (!landingId || !ObjectId.isValid(landingId)) {
      res.status(400).json({ error: 'Landing is not valid' });
      return;
    }

    site.name = name;
    site.location = location;
    site.elevation = elevation;
    site.validBearings = validBearings;
    site.landing = new ObjectId(landingId);
    site.isDisabled = isDisabled;
    site.description = description;
    site.mandatoryNotices = mandatoryNotices ?? undefined;
    site.siteGuideUrl = siteGuideUrl;
    site.hazards = hazards;
    site.access = access;

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
