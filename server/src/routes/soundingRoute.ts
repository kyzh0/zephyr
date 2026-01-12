import express, { type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';

import { Sounding } from '@/models/soundingModel';
import { User } from '@/models/userModel';

const router = express.Router();

type ApiKeyQuery = { key?: string };
type IdParams = { id: string };

type CreateSoundingBody = {
  name: string;
  coordinates: [number, number]; // [lng, lat]
  raspRegion: string;
  raspId: string;
};

router.get('/', async (req: Request<Record<string, never>>, res: Response) => {
  const soundings = await Sounding.find().lean();
  res.json(soundings);
});

router.post(
  '/',
  async (
    req: Request<Record<string, never>, unknown, CreateSoundingBody, ApiKeyQuery>,
    res: Response
  ) => {
    const user = await User.findOne({ key: req.query.key }).lean();
    if (!user) {
      res.sendStatus(401);
      return;
    }

    const { name, coordinates, raspRegion, raspId } = req.body;

    const sounding = new Sounding({
      name,
      location: {
        type: 'Point',
        coordinates
      },
      raspRegion,
      raspId
    });

    try {
      await sounding.save();
      res.header('Location', `${req.protocol}://${req.get('host')}/soundings/${sounding._id}`);
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

  const sounding = await Sounding.findOne({ _id: new ObjectId(id) }).lean();
  if (!sounding) {
    res.sendStatus(404);
    return;
  }

  res.json(sounding);
});

export default router;
