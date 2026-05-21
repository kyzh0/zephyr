import express, { type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import mongoose, { QueryFilter } from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';

import {
  User,
  Site,
  SiteDoc,
  type SiteAttrs,
  type WithId,
  type GeoPoint,
  isValidLonLat
} from '@zephyr/shared';

const PUBLIC_DIR = process.env.PUBLIC_DIR
  ? path.resolve(process.env.PUBLIC_DIR)
  : path.resolve(process.cwd(), '../scheduler/public');

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const { id } = req.params as IdParams;
    const dir = path.join(PUBLIC_DIR, 'uploads', 'sites', id);
    fs.mkdir(dir, { recursive: true })
      .then(() => cb(null, dir))
      .catch((err) => cb(err as Error, ''));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  }
});

const router = express.Router();

type ApiKeyQuery = { key?: string };
type IncludeDisabledQuery = { includeDisabled?: string };
type IdParams = { id: string };
type ImageParams = { id: string; filename: string };

type LandingLean = {
  _id: mongoose.Types.ObjectId;
  name: string;
  location: GeoPoint;
};
type SiteWithLandingsLean = Omit<SiteAttrs, 'landings'> & {
  landings: LandingLean[];
};
type SiteWithLandingsDto = Omit<SiteAttrs, 'landings'> & {
  landings: {
    landingId: mongoose.Types.ObjectId;
    landingName: string;
    landingLocation: GeoPoint;
  }[];
};
type CreateSiteDto = Omit<SiteAttrs, 'landings'> & {
  landingIds: string[];
};
type UpdateSiteDto = WithId<CreateSiteDto>;

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
        path: 'landings',
        select: 'name location'
      })
      .lean<SiteWithLandingsLean[]>();
    res.json(
      sites.map(
        (site) =>
          ({
            ...site,
            landings: site.landings?.map((l) => ({
              landingId: l._id,
              landingName: l.name,
              landingLocation: l.location
            }))
          }) as SiteWithLandingsDto
      )
    );
  }
);

// add site
router.post(
  '/',
  async (
    req: Request<Record<string, never>, unknown, CreateSiteDto, ApiKeyQuery>,
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
      landingIds,
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

    if (elevation == null) {
      res.status(400).json({ error: 'Elevation is required' });
      return;
    }

    if (!validBearings) {
      res.status(400).json({ error: 'Bearings are required' });
      return;
    }

    for (const id of landingIds) {
      if (!ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Landing is not valid' });
        return;
      }
    }

    const site: SiteDoc = new Site({
      name,
      location,
      elevation,
      validBearings,
      landings: landingIds?.map((id) => new ObjectId(id)),
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
      path: 'landings',
      select: 'name location'
    })
    .lean<SiteWithLandingsLean>();
  if (!s) {
    res.sendStatus(404);
    return;
  }

  res.json({
    ...s,
    landings: s.landings?.map((l) => ({
      landingId: l._id,
      landingName: l.name,
      landingLocation: l.location
    }))
  } as SiteWithLandingsDto);
});

// update site
router.put(
  '/:id',
  async (req: Request<IdParams, unknown, UpdateSiteDto, ApiKeyQuery>, res: Response) => {
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
      landingIds,
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
    if (__v == null) {
      res.sendStatus(400);
      return;
    }
    if (site.__v !== __v) {
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

    if (elevation == null) {
      res.status(400).json({ error: 'Elevation is required' });
      return;
    }

    if (!validBearings) {
      res.status(400).json({ error: 'Bearings are required' });
      return;
    }

    for (const id of landingIds) {
      if (!ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Landing is not valid' });
        return;
      }
    }

    site.name = name;
    site.location = location;
    site.elevation = elevation;
    site.validBearings = validBearings;
    site.landings = landingIds?.map((id) => new ObjectId(id));
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

// upload image
router.post(
  '/:id/images',
  upload.single('file'),
  async (req: Request<IdParams, unknown, { caption?: string }, ApiKeyQuery>, res: Response) => {
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

    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }
    const url = `uploads/sites/${id}/${req.file.filename}`;
    const caption = req.body.caption ?? '';

    const site = await Site.findOne({ _id: new ObjectId(id) });
    if (!site) {
      await fs.unlink(req.file.path).catch(() => {});
      res.sendStatus(404);
      return;
    }

    if (!site.images) {
      site.images = [];
    }
    site.images.push({ url, caption });
    try {
      await site.save();
    } catch (err) {
      if (err instanceof mongoose.Error.VersionError) {
        await fs.unlink(req.file.path).catch(() => {});
        res.sendStatus(409);
        return;
      }
      throw err;
    }

    res.json(site.images);
  }
);

// delete image
router.delete(
  '/:id/images/:filename',
  async (req: Request<ImageParams, unknown, unknown, ApiKeyQuery>, res: Response) => {
    const user = await User.findOne({ key: req.query.key }).lean();
    if (!user) {
      res.sendStatus(401);
      return;
    }

    const { id, filename } = req.params;

    if (!ObjectId.isValid(id)) {
      res.sendStatus(404);
      return;
    }

    const site = await Site.findOne({ _id: new ObjectId(id) });
    if (!site) {
      res.sendStatus(404);
      return;
    }

    const index = site.images?.findIndex((img) => path.basename(img.url) === filename) ?? -1;
    if (index === -1) {
      res.sendStatus(404);
      return;
    }

    site.images?.splice(index, 1);
    try {
      await site.save();
    } catch (err) {
      if (err instanceof mongoose.Error.VersionError) {
        res.sendStatus(409);
        return;
      }
      throw err;
    }

    const filePath = path.join(PUBLIC_DIR, 'uploads', 'sites', id, filename);
    await fs.unlink(filePath).catch(() => {});

    res.sendStatus(204);
  }
);

// update image caption
router.patch(
  '/:id/images/:filename',
  async (req: Request<ImageParams, unknown, { caption: string }, ApiKeyQuery>, res: Response) => {
    const user = await User.findOne({ key: req.query.key }).lean();
    if (!user) {
      res.sendStatus(401);
      return;
    }

    const { id, filename } = req.params;
    const { caption } = req.body;

    if (!ObjectId.isValid(id)) {
      res.sendStatus(404);
      return;
    }

    const site = await Site.findOne({ _id: new ObjectId(id) });
    if (!site) {
      res.sendStatus(404);
      return;
    }

    const image = site.images?.find((img) => path.basename(img.url) === filename);
    if (!image) {
      res.sendStatus(404);
      return;
    }

    image.caption = caption ?? '';
    try {
      await site.save();
    } catch (err) {
      if (err instanceof mongoose.Error.VersionError) {
        res.sendStatus(409);
        return;
      }
      throw err;
    }

    res.json(site.images);
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
