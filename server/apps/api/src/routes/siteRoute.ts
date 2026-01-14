import express, { type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { QueryFilter } from 'mongoose';

import { User, Site, SiteAttrs, SiteDoc, type GeoPoint, type SiteRating } from '@zephyr/shared';

const router = express.Router();

type ApiKeyQuery = { key?: string };
type IncludeDisabledQuery = { includeDisabled?: string };
type IdParams = { id: string };

type SiteBody = {
  name?: string;
  takeoffLocation?: GeoPoint;
  landingLocation?: GeoPoint;
  rating?: SiteRating;
  siteGuideUrl?: string;
  validBearings?: string;
  elevation?: number;
  radio?: string;
  description?: string;
  mandatoryNotices?: string;
  airspaceNotices?: string;
  landingNotices?: string;
  isDisabled?: boolean;
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

    const sites = await Site.find(query).lean();
    res.json(sites);
  }
);

// add site
router.post(
  '/',
  async (req: Request<Record<string, never>, unknown, SiteBody, ApiKeyQuery>, res: Response) => {
    const user = await User.findOne({ key: req.query.key }).lean();
    if (!user) {
      res.sendStatus(401);
      return;
    }

    const {
      name,
      takeoffLocation,
      landingLocation,
      rating,
      siteGuideUrl,
      validBearings,
      elevation,
      radio,
      description,
      mandatoryNotices,
      airspaceNotices,
      landingNotices,
      isDisabled
    } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Site name is required' });
      return;
    }

    if (takeoffLocation && !isValidLonLat(takeoffLocation.coordinates)) {
      res.status(400).json({ error: 'Takeoff location is not valid' });
      return;
    }

    if (landingLocation && !isValidLonLat(landingLocation.coordinates)) {
      res.status(400).json({ error: 'Landing location is not valid' });
      return;
    }

    if (!siteGuideUrl) {
      res.status(400).json({ error: 'Site guide URL is required' });
      return;
    }

    if (elevation === undefined || elevation === null) {
      res.status(400).json({ error: 'Elevation is required' });
      return;
    }

    if (!description) {
      res.status(400).json({ error: 'Description is required' });
      return;
    }

    const site: SiteDoc = new Site({
      name,
      takeoffLocation,
      landingLocation,
      siteGuideUrl,
      validBearings,
      elevation,
      radio,
      description,
      mandatoryNotices,
      airspaceNotices,
      landingNotices,
      isDisabled: isDisabled ? true : undefined,
      rating
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
  async (req: Request<IdParams, unknown, SiteBody, ApiKeyQuery>, res: Response) => {
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

    const site = await Site.findOne({ _id: new ObjectId(id) });
    if (!site) {
      res.sendStatus(404);
      return;
    }

    const {
      name,
      takeoffLocation,
      landingLocation,
      rating,
      siteGuideUrl,
      validBearings,
      elevation,
      radio,
      description,
      mandatoryNotices,
      airspaceNotices,
      landingNotices,
      isDisabled
    } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Site name is required' });
      return;
    }

    if (takeoffLocation && !isValidLonLat(takeoffLocation.coordinates)) {
      res.status(400).json({ error: 'Takeoff location is not valid' });
      return;
    }

    if (landingLocation && !isValidLonLat(landingLocation.coordinates)) {
      res.status(400).json({ error: 'Landing location is not valid' });
      return;
    }

    if (!siteGuideUrl) {
      res.status(400).json({ error: 'Site guide URL is required' });
      return;
    }

    if (elevation === undefined || elevation === null) {
      res.status(400).json({ error: 'Elevation is required' });
      return;
    }

    if (!description) {
      res.status(400).json({ error: 'Description is required' });
      return;
    }

    site.name = name;
    site.takeoffLocation = takeoffLocation;
    site.landingLocation = landingLocation;
    site.rating = rating ?? undefined;
    site.siteGuideUrl = siteGuideUrl;
    site.validBearings = validBearings ?? undefined;
    site.elevation = elevation;
    site.radio = radio ?? undefined;
    site.description = description;
    site.mandatoryNotices = mandatoryNotices ?? undefined;
    site.airspaceNotices = airspaceNotices ?? undefined;
    site.landingNotices = landingNotices ?? undefined;
    site.isDisabled = isDisabled ?? undefined;

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
