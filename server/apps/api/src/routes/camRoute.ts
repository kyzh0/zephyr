import express, { type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { QueryFilter } from 'mongoose';

import { User, Cam, CamAttrs, type CamImage } from '@zephyr/shared';

const router = express.Router();

type CamsListQuery = {
  unixTimeFrom?: string;
};

type CreateCamQuery = {
  key?: string;
};

type CreateCamBody = {
  name: string;
  type: string;
  coordinates: [number, number]; // [lng, lat]
  externalLink: string;
  externalId?: string;
};

type IdParams = {
  id: string;
};

type CamImagesAggResult = {
  images: CamImage[];
};

router.get(
  '/',
  async (req: Request<Record<string, never>, unknown, unknown, CamsListQuery>, res: Response) => {
    const time = Number(req.query.unixTimeFrom);

    const query: QueryFilter<CamAttrs> = {};
    if (time) {
      query.lastUpdate = { $gte: new Date(time * 1000) };
    }

    const cams = await Cam.find(query, { images: 0 }).sort({ currentTime: 1 }).lean();
    res.json(cams);
  }
);

router.post(
  '/',
  async (
    req: Request<Record<string, never>, unknown, CreateCamBody, CreateCamQuery>,
    res: Response
  ) => {
    const user = await User.findOne({ key: req.query.key }).lean();
    if (!user) {
      res.sendStatus(401);
      return;
    }

    const { name, type, coordinates, externalLink, externalId } = req.body;
    const cam = new Cam({
      name,
      type,
      location: {
        type: 'Point',
        coordinates
      },
      externalLink,
      externalId
    });

    try {
      await cam.save();
      res.header('Location', `${req.protocol}://${req.get('host')}/cams/${cam._id}`);
      res.sendStatus(201);
    } catch (err) {
      res.status(500).json(err);
    }
  }
);

router.get('/:id', async (req: Request<IdParams>, res: Response) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.sendStatus(404);
    return;
  }

  const cam = await Cam.findOne({ _id: new ObjectId(id) }, { images: 0 }).lean();
  if (!cam) {
    res.sendStatus(404);
    return;
  }

  res.json(cam);
});

router.get('/:id/images', async (req: Request<IdParams>, res: Response) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.sendStatus(404);
    return;
  }

  const result = await Cam.aggregate<CamImagesAggResult>([
    { $match: { _id: new ObjectId(id) } },
    {
      $project: {
        _id: 0,
        images: {
          $sortArray: {
            input: {
              $filter: {
                input: '$images',
                as: 'image',
                cond: {
                  $gte: ['$$image.time', new Date(Date.now() - 24 * 60 * 60 * 1000)]
                } // last 24h images
              }
            },
            sortBy: { time: -1 }
          }
        }
      }
    }
  ]);

  if (!result.length) {
    res.json([]);
    return;
  }

  res.json(result[0].images);
});

export default router;
