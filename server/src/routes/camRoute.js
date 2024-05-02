import express from 'express';

import { ObjectId } from 'mongodb';
import { Cam } from '../models/camModel.js';
import { User } from '../models/userModel.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { unixTimeFrom } = req.query;
  const time = unixTimeFrom ? Number(unixTimeFrom) : NaN;

  const query = {};
  if (!isNaN(time)) {
    query.lastUpdate = { $gte: new Date(time * 1000) };
  }

  const cams = await Cam.find(query, { images: 0 }).sort({ currentTime: 1 });
  res.json(cams);
});

router.post('/', async (req, res) => {
  const user = await User.findOne({ key: req.query.key });
  if (!user) {
    res.status(401).send();
    return;
  }

  const { name, type, coordinates, externalLink, externalId } = req.body;

  const cam = new Cam({
    name: name,
    type: type,
    location: {
      type: 'Point',
      coordinates: coordinates
    },
    externalLink: externalLink,
    externalId: externalId
  });

  await cam.save();
  res.status(204).send();
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.status(404).send();
    return;
  }

  const cam = await Cam.findOne({ _id: new ObjectId(id) }, { images: 0 });
  if (!cam) {
    res.status(404).send();
    return;
  }

  res.json(cam);
});

router.get('/:id/images', async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.status(404).send();
    return;
  }

  const result = await Cam.aggregate([
    {
      $match: { _id: new ObjectId(id) }
    },
    {
      $project: {
        _id: 0,
        images: {
          $sortArray: {
            input: {
              $filter: {
                input: '$images',
                as: 'image',
                cond: { $gte: ['$$image.time', new Date(Date.now() - 24 * 60 * 60 * 1000)] } // last 24h images
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
