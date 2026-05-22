import express, { type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import mongoose, { QueryFilter } from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

import {
  User,
  Landing,
  LandingDoc,
  type LandingAttrs,
  type WithId,
  isValidLonLat
} from '@zephyr/shared';

const PUBLIC_DIR = process.env.PUBLIC_DIR
  ? path.resolve(process.env.PUBLIC_DIR)
  : path.resolve(process.cwd(), '../scheduler/public');

const router = express.Router();

type ApiKeyQuery = { key?: string };
type IncludeDisabledQuery = { includeDisabled?: string };
type IdParams = { id: string };
type ImageParams = { id: string; filename: string };

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  }
});

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

    if (elevation == null) {
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
    if (__v == null) {
      res.sendStatus(400);
      return;
    }
    if (landing.__v !== __v) {
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

    if (elevation == null) {
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

    const landing = await Landing.findOne({ _id: new ObjectId(id) });
    if (!landing) {
      res.sendStatus(404);
      return;
    }

    // write to disk
    const filename = `${randomUUID()}.webp`;
    const dir = path.join(PUBLIC_DIR, 'uploads', 'landings', id);
    const filePath = path.join(dir, filename);
    await fs.mkdir(dir, { recursive: true });
    await sharp(req.file.buffer).webp({ quality: 80 }).toFile(filePath);

    const url = `uploads/landings/${id}/${filename}`;
    (landing.images ??= []).push({ url, caption: req.body.caption ?? '' });
    try {
      await landing.save();
    } catch (err) {
      await fs.unlink(filePath).catch(() => {});
      if (err instanceof mongoose.Error.VersionError) {
        res.sendStatus(409);
        return;
      }
      throw err;
    }

    res.json(landing.images);
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

    const landing = await Landing.findOne({ _id: new ObjectId(id) });
    if (!landing) {
      res.sendStatus(404);
      return;
    }

    const index = landing.images?.findIndex((img) => path.basename(img.url) === filename) ?? -1;
    if (index === -1) {
      res.sendStatus(404);
      return;
    }

    landing.images?.splice(index, 1);
    try {
      await landing.save();
    } catch (err) {
      if (err instanceof mongoose.Error.VersionError) {
        res.sendStatus(409);
        return;
      }
      throw err;
    }

    const filePath = path.join(PUBLIC_DIR, 'uploads', 'landings', id, filename);
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

    const landing = await Landing.findOne({ _id: new ObjectId(id) });
    if (!landing) {
      res.sendStatus(404);
      return;
    }

    const image = landing.images?.find((img) => path.basename(img.url) === filename);
    if (!image) {
      res.sendStatus(404);
      return;
    }

    image.caption = caption ?? '';
    try {
      await landing.save();
    } catch (err) {
      if (err instanceof mongoose.Error.VersionError) {
        res.sendStatus(409);
        return;
      }
      throw err;
    }

    res.json(landing.images);
  }
);

export default router;
