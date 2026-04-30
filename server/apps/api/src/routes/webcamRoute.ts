import express, { type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { QueryFilter } from 'mongoose';

import { User, Webcam, WebcamAttrs, type WebcamImage } from '@zephyr/shared';

const router = express.Router();

type WebcamsListQuery = {
  includeDisabled?: string;
};

type CreateWebcamQuery = {
  key?: string;
};

type CreateWebcamBody = {
  name: string;
  type: string;
  coordinates: [number, number]; // [lng, lat]
  externalLink: string;
  externalId?: string;
  isDisabled?: boolean;
};

type PatchWebcamBody = {
  __v?: number;
  name?: string;
  type?: string;
  coordinates?: [number, number];
  externalLink?: string;
  externalId?: string;
  isDisabled?: boolean;
};

type IdParams = {
  id: string;
};

type ApiKeyQuery = { key?: string };

type WebcamImagesAggResult = {
  images: WebcamImage[];
};

router.get(
  '/',
  async (
    req: Request<Record<string, never>, unknown, unknown, WebcamsListQuery>,
    res: Response
  ) => {
    const query: QueryFilter<WebcamAttrs> = {};
    if (String(req.query.includeDisabled).toLowerCase() !== 'true') {
      query.isDisabled = { $ne: true };
    }

    const webcams = await Webcam.find(query, { images: 0 }).sort({ currentTime: 1 }).lean();
    res.json(webcams);
  }
);

router.post(
  '/',
  async (
    req: Request<Record<string, never>, unknown, CreateWebcamBody, CreateWebcamQuery>,
    res: Response
  ) => {
    const user = await User.findOne({ key: req.query.key }).lean();
    if (!user) {
      res.sendStatus(401);
      return;
    }

    const { name, type, coordinates, externalLink, externalId, isDisabled } = req.body;
    const webcam = new Webcam({
      name,
      type,
      location: {
        type: 'Point',
        coordinates
      },
      externalLink,
      externalId,
      isDisabled
    });

    try {
      await webcam.save();
      res.header('Location', `${req.protocol}://${req.get('host')}/webcams/${webcam._id}`);
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

  const webcam = await Webcam.findOne({ _id: new ObjectId(id) }, { images: 0 }).lean();
  if (!webcam) {
    res.sendStatus(404);
    return;
  }

  res.json(webcam);
});

router.patch(
  '/:id',
  async (req: Request<IdParams, PatchWebcamBody, unknown, ApiKeyQuery>, res: Response) => {
    const { id } = req.params;

    const user = await User.findOne({ key: req.query.key }).lean();
    if (!user) {
      res.sendStatus(401);
      return;
    }

    if (!ObjectId.isValid(id)) {
      res.sendStatus(404);
      return;
    }

    const webcam = await Webcam.findOne({ _id: new ObjectId(id) });
    if (!webcam) {
      res.sendStatus(404);
      return;
    }

    const { __v, name, type, coordinates, externalLink, externalId, isDisabled } =
      req.body as PatchWebcamBody;
    if (__v == null) {
      res.sendStatus(400);
      return;
    }
    if (webcam.__v !== __v) {
      res.sendStatus(409);
      return;
    }

    if (name !== undefined) {
      webcam.name = name;
    }
    if (type !== undefined) {
      webcam.type = type;
    }
    if (coordinates !== undefined) {
      webcam.location = { type: 'Point', coordinates };
    }
    if (externalLink !== undefined) {
      webcam.externalLink = externalLink;
    }
    if (externalId !== undefined) {
      webcam.externalId = externalId;
    }
    if (isDisabled !== undefined) {
      webcam.isDisabled = isDisabled;
    }

    try {
      await webcam.save();
      const updated = webcam.toObject();
      res.json(updated);
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

    const webcam = await Webcam.findOne({ _id: new ObjectId(id) }).lean();
    if (!webcam) {
      res.sendStatus(404);
      return;
    }

    await Webcam.deleteOne({ _id: new ObjectId(id) });
    res.sendStatus(204);
  }
);

router.get('/:id/images', async (req: Request<IdParams>, res: Response) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.sendStatus(404);
    return;
  }

  const result = await Webcam.aggregate<WebcamImagesAggResult>([
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
