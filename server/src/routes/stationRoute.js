import express from 'express';
import * as geofire from 'geofire-common';

import { ObjectId } from 'mongodb';
import { Station } from '../models/stationModel.js';
import { User } from '../models/userModel.js';

const router = express.Router();

// get stations
router.get('/', async (req, res) => {
  const { unixTimeFrom, lat, lon, radius, err } = req.query;
  const time = unixTimeFrom ? Number(unixTimeFrom) : NaN;
  const latitude = lat ? Number(lat) : NaN;
  const longitude = lon ? Number(lon) : NaN;
  const rad = radius ? Number(radius) : NaN;

  const query = {};
  const orderby = {};

  if (err) {
    query.isError = true;
    orderby.isOffline = -1;
    orderby.name = 1;
  }

  if (!isNaN(latitude) && !isNaN(longitude) && !isNaN(rad)) {
    query.location = {
      $geoWithin: {
        $centerSphere: [[longitude, latitude], rad / 6378]
      }
    };
  }
  if (!isNaN(time)) {
    query.lastUpdate = { $gte: new Date(time * 1000) };
  }

  let stations = await Station.find(query, { data: 0 }).sort(orderby);

  if (!isNaN(latitude) && !isNaN(longitude) && !isNaN(rad)) {
    stations = JSON.parse(JSON.stringify(stations)); // convert to plain js obj
    for (const s of stations) {
      s.distance =
        Math.round(
          geofire.distanceBetween(
            [s.location.coordinates[1], s.location.coordinates[0]],
            [latitude, longitude]
          ) * 10
        ) / 10;
    }
    stations.sort((a, b) => a.distance - b.distance);
  }

  res.json(stations);
});

// add station
router.post('/', async (req, res) => {
  const user = await User.findOne({ key: req.query.key });
  if (!user) {
    res.status(401).send();
    return;
  }

  const {
    name,
    type,
    coordinates,
    externalLink,
    externalId,
    elevation,
    validBearings,
    harvestWindAverageId,
    harvestWindGustId,
    harvestWindDirectionId,
    harvestTemperatureId,
    gwWindAverageFieldName,
    gwWindGustFieldName,
    gwWindBearingFieldName,
    gwTemperatureFieldName
  } = req.body;

  const station = new Station({
    name: name,
    type: type,
    location: {
      type: 'Point',
      coordinates: coordinates
    },
    externalLink: externalLink,
    externalId: externalId,
    elevation: elevation,
    currentAverage: null,
    currentGust: null,
    currentBearing: null,
    currentTemperature: null
  });

  if (validBearings) {
    station.validBearings = validBearings;
  }
  if (harvestWindAverageId && harvestWindGustId && harvestWindDirectionId && harvestTemperatureId) {
    station.harvestWindAverageId = harvestWindAverageId;
    station.harvestWindGustId = harvestWindGustId;
    station.harvestWindDirectionId = harvestWindDirectionId;
    station.harvestTemperatureId = harvestTemperatureId;
  }
  if (gwWindAverageFieldName) {
    station.gwWindAverageFieldName = gwWindAverageFieldName;
  }
  if (gwWindGustFieldName) {
    station.gwWindGustFieldName = gwWindGustFieldName;
  }
  if (gwWindBearingFieldName) {
    station.gwWindBearingFieldName = gwWindBearingFieldName;
  }
  if (gwTemperatureFieldName) {
    station.gwTemperatureFieldName = gwTemperatureFieldName;
  }

  await station.save();
  res.status(204).send();
});

// get station
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.status(404).send();
    return;
  }

  const s = await Station.findOne({ _id: new ObjectId(id) }, { data: 0 });
  if (!s) {
    res.status(404).send();
    return;
  }

  res.json(s);
});

// patch station
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const user = await User.findOne({ key: req.query.key });
  if (!user) {
    res.status(401).send();
    return;
  }

  const { patch, remove } = req.body;
  try {
    const station = await Station.findOne({ _id: new ObjectId(id) }, { data: 0 });

    for (const key of Object.keys(patch)) {
      station[key] = patch[key];
    }
    for (const key of Object.keys(remove)) {
      station[key] = undefined;
    }

    await station.save();
    res.status(204).send();
  } catch {
    res.status(400).send();
  }
});

// get station data
router.get('/:id/data', async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.status(404).send();
    return;
  }

  const result = await Station.aggregate([
    {
      $match: { _id: new ObjectId(id) }
    },
    {
      $project: {
        _id: 0,
        data: {
          $slice: [
            {
              $sortArray: { input: '$data', sortBy: { time: -1 } }
            },
            145 // 145 records in last 24h
          ]
        }
      }
    }
  ]);

  if (!result.length) {
    res.json([]);
    return;
  }

  res.json(result[0].data);
});

export default router;
