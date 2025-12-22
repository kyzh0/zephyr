import express from 'express';

import { ObjectId } from 'mongodb';
import { User } from '../models/userModel.js';
import { Site } from '../models/siteModel.js';

const router = express.Router();

// get sites
router.get('/', async (req, res) => {
  const { includeDisabled } = req.query;
  const query = {};
  if (String(includeDisabled).toLowerCase() !== 'true') {
    query.isDisabled = { $ne: true };
  }

  let sites = await Site.find(query).lean();
  res.json(sites);
});

// add site
router.post('/', async (req, res) => {
  const user = await User.findOne({ key: req.query.key }).lean();
  if (!user) {
    res.status(401).send();
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
    landingNotices
  } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Site name is required' });
    return;
  }
  if (
    !takeoffLocation ||
    !takeoffLocation.coordinates ||
    takeoffLocation.coordinates.length !== 2 ||
    takeoffLocation.coordinates[0] < -180 ||
    takeoffLocation.coordinates[0] > 180 ||
    takeoffLocation.coordinates[1] < -90 ||
    takeoffLocation.coordinates[1] > 90
  ) {
    res.status(400).json({ error: 'Takeoff location is not valid' });
    return;
  }
  if (
    landingLocation && (
    !landingLocation.coordinates ||
    landingLocation.coordinates.length !== 2 ||
    landingLocation.coordinates[0] < -180 ||
    landingLocation.coordinates[0] > 180 ||
    landingLocation.coordinates[1] < -90 ||
    landingLocation.coordinates[1] > 90)
  ) {
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

  const site = new Site({
    name: name,
    takeoffLocation: takeoffLocation,
    landingLocation: landingLocation,
    siteGuideUrl: siteGuideUrl,
    validBearings: validBearings,
    description: description
  });

  site.takeoffLocation.type = 'Point';
  site.landingLocation.type = 'Point';

  if (rating) {
    site.rating = rating;
  }
  if (elevation !== undefined && elevation !== null) {
    site.elevation = elevation;
  }
  if (radio) {
    site.radio = radio;
  }
  if (mandatoryNotices) {
    site.mandatoryNotices = mandatoryNotices;
  }
  if (airspaceNotices) {
    site.airspaceNotices = airspaceNotices;
  }
  if (landingNotices) {
    site.landingNotices = landingNotices;
  }

  try {
    await site.save();
    res.header('Location', `${req.protocol}://${req.get('host')}/sites/${site._id}`);
    res.status(201).send();
  } catch (err) {
    res.status(500).json(err);
  }
});

// get site
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.status(404).send();
    return;
  }

  const s = await Site.findOne({ _id: new ObjectId(id) }).lean();
  if (!s) {
    res.status(404).send();
    return;
  }

  res.json(s);
});

// update site
router.put('/:id', async (req, res) => {
  const user = await User.findOne({ key: req.query.key }).lean();
  if (!user) {
    res.status(401).send();
    return;
  }

  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.status(404).send();
    return;
  }

  const site = await Site.findOne({ _id: new ObjectId(id) });
  if (!site) {
    res.status(404).send();
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
  if (
    !takeoffLocation ||
    !takeoffLocation.coordinates ||
    takeoffLocation.coordinates.length !== 2 ||
    takeoffLocation.coordinates[0] < -180 ||
    takeoffLocation.coordinates[0] > 180 ||
    takeoffLocation.coordinates[1] < -90 ||
    takeoffLocation.coordinates[1] > 90
  ) {
    res.status(400).json({ error: 'Takeoff location is not valid' });
    return;
  }
  if (
    !landingLocation ||
    !landingLocation.coordinates ||
    landingLocation.coordinates.length !== 2 ||
    landingLocation.coordinates[0] < -180 ||
    landingLocation.coordinates[0] > 180 ||
    landingLocation.coordinates[1] < -90 ||
    landingLocation.coordinates[1] > 90
  ) {
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

  if (name) {
    site.name = name;
  }
  if (takeoffLocation) {
    site.takeoffLocation = takeoffLocation;
  }
  if (landingLocation) {
    site.landingLocation = landingLocation;
  }
  if (rating) {
    site.rating = rating;
  } else {
    delete site.rating;
  }
  if (siteGuideUrl) {
    site.rating = rating;
  }
  if (validBearings) {
    site.validBearings = validBearings;
  }
  if (elevation) {
    site.elevation = elevation;
  } else {
    delete site.elevation;
  }
  if (radio) {
    site.radio = radio;
  } else {
    delete site.radio;
  }
  if (description) {
    site.description = description;
  }
  if (mandatoryNotices) {
    site.mandatoryNotices = mandatoryNotices;
  } else {
    delete site.mandatoryNotices;
  }
  if (airspaceNotices) {
    site.airspaceNotices = airspaceNotices;
  } else {
    delete site.airspaceNotices;
  }
  if (landingNotices) {
    site.landingNotices = landingNotices;
  } else {
    delete site.landingNotices;
  }
  if (isDisabled) {
    site.isDisabled = isDisabled;
  } else {
    delete site.isDisabled;
  }

  await site.save();
  res.json(site);
});

// delete site
router.delete('/:id', async (req, res) => {
  const user = await User.findOne({ key: req.query.key }).lean();
  if (!user) {
    res.status(401).send();
    return;
  }

  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.status(404).send();
    return;
  }

  const s = await Site.findOne({ _id: new ObjectId(id) }).lean();
  if (!s) {
    res.status(404).send();
    return;
  }

  await Site.deleteOne({ _id: new ObjectId(id) });
  res.status(204).send();
});

export default router;
