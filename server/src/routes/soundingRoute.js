import express from 'express';

import { ObjectId } from 'mongodb';
import { Sounding } from '../models/soundingModel.js';
import { User } from '../models/userModel.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const soundings = await Sounding.find({});
  res.json(soundings);
});

router.post('/', async (req, res) => {
  const user = await User.findOne({ key: req.query.key });
  if (!user) {
    res.status(401).send();
    return;
  }

  const { name, coordinates, raspRegion, raspId } = req.body;

  const sounding = new Sounding({
    name: name,
    location: {
      type: 'Point',
      coordinates: coordinates
    },
    raspRegion: raspRegion,
    raspId: raspId
  });

  await sounding.save();
  res.status(204).send();
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.status(404).send();
    return;
  }

  const sounding = await Sounding.findOne({ _id: new ObjectId(id) });
  if (!sounding) {
    res.status(404).send();
    return;
  }

  res.json(sounding);
});

export default router;
