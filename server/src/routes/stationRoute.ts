import express, { type Request, type Response } from 'express';
import * as geofire from 'geofire-common';
import { ObjectId } from 'mongodb';
import { FilterQuery } from 'mongoose';

import { Station, StationAttrs } from '@/models/stationModel';
import { StationData } from '@/models/stationDataModel';
import { User } from '@/models/userModel';

const router = express.Router();

type ApiKeyQuery = { key?: string };

type StationsListQuery = {
  unixTimeFrom?: string;
  lat?: string;
  lon?: string;
  radius?: string;
  err?: string;
  includeDisabled?: string;
};

type IdParams = { id: string };

type StationDataQuery = {
  time?: string;
};

type StationIdDataQuery = {
  hr?: string;
};

type CreateStationBody = {
  name: string;
  type: string;
  coordinates: [number, number]; // [lng, lat]
  externalLink: string;
  externalId?: string;

  elevation?: number;
  validBearings?: string;

  harvestWindAverageId?: string;
  harvestWindGustId?: string;
  harvestWindDirectionId?: string;
  harvestTemperatureId?: string;

  gwWindAverageFieldName?: string;
  gwWindGustFieldName?: string;
  gwWindBearingFieldName?: string;
  gwTemperatureFieldName?: string;
};

type PatchStationBody = {
  patch: Record<string, unknown>;
  remove: Record<string, unknown>;
};

// get stations
router.get(
  '/',
  async (
    req: Request<Record<string, never>, unknown, unknown, StationsListQuery>,
    res: Response
  ) => {
    const time = Number(req.query.unixTimeFrom);
    const latitude = Number(req.query.lat);
    const longitude = Number(req.query.lon);
    const rad = Number(req.query.radius);

    const query: FilterQuery<StationAttrs> = {};
    const orderby: FilterQuery<StationAttrs> = {};

    if (req.query.err) {
      query.isError = true;
      orderby.isOffline = -1;
      orderby.name = 1;
    }

    if (String(req.query.includeDisabled).toLowerCase() !== 'true') {
      query.isDisabled = { $ne: true };
    }

    if (Number.isFinite(latitude) && Number.isFinite(longitude) && Number.isFinite(rad)) {
      query.location = {
        $geoWithin: {
          $centerSphere: [[longitude, latitude], rad / 6378]
        }
      };
    }

    if (Number.isFinite(time)) {
      query.lastUpdate = { $gte: new Date(time * 1000) };
    }

    const stations = await Station.find(query).sort(orderby).lean();

    if (Number.isFinite(latitude) && Number.isFinite(longitude) && Number.isFinite(rad)) {
      // add distance field and sort by it
      const stationsWithDistance = stations.map((s) => {
        const distance =
          Math.round(
            geofire.distanceBetween(
              [s.location.coordinates[1], s.location.coordinates[0]], // [lat,lng]
              [latitude, longitude]
            ) * 10
          ) / 10;

        return { ...s, distance };
      });

      stationsWithDistance.sort((a, b) => a.distance - b.distance);
      res.json(stationsWithDistance);
      return;
    }

    res.json(stations);
  }
);

// add station
router.post(
  '/',
  async (
    req: Request<Record<string, never>, unknown, CreateStationBody, ApiKeyQuery>,
    res: Response
  ) => {
    const user = await User.findOne({ key: req.query.key }).lean();
    if (!user) {
      res.sendStatus(401);
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
      name,
      type,
      location: { type: 'Point', coordinates },
      externalLink,
      externalId,
      elevation,
      currentAverage: null,
      currentGust: null,
      currentBearing: null,
      currentTemperature: null
    });

    if (validBearings) {
      station.validBearings = validBearings;
    }

    if (harvestWindAverageId) station.harvestWindAverageId = harvestWindAverageId;
    if (harvestWindGustId) station.harvestWindGustId = harvestWindGustId;
    if (harvestWindDirectionId) station.harvestWindDirectionId = harvestWindDirectionId;
    if (harvestTemperatureId) station.harvestTemperatureId = harvestTemperatureId;

    if (gwWindAverageFieldName) station.gwWindAverageFieldName = gwWindAverageFieldName;
    if (gwWindGustFieldName) station.gwWindGustFieldName = gwWindGustFieldName;
    if (gwWindBearingFieldName) station.gwWindBearingFieldName = gwWindBearingFieldName;
    if (gwTemperatureFieldName) station.gwTemperatureFieldName = gwTemperatureFieldName;

    try {
      await station.save();
      res.header('Location', `${req.protocol}://${req.get('host')}/stations/${station._id}`);
      res.sendStatus(201);
    } catch (err) {
      res.status(500).json(err);
    }
  }
);

// get all station data for timestamp
router.get(
  '/data',
  async (
    req: Request<Record<string, never>, unknown, unknown, StationDataQuery>,
    res: Response
  ) => {
    let timeTo = new Date();
    if (req.query.time) timeTo = new Date(req.query.time);

    const timeFrom = new Date(timeTo.getTime() - 30 * 60 * 1000);

    const stations = await Station.find({ isDisabled: { $ne: true } })
      .select('_id validBearings')
      .lean();

    const stationMap = new Map(stations.map((s) => [s._id.toString(), s]));

    const stationData = await StationData.find({
      station: { $in: stations.map((s) => s._id) },
      time: { $gt: timeFrom, $lte: timeTo }
    }).lean();

    const groups = Array.from(
      stationData
        .reduce((acc, d) => {
          const stationId = d.station.toString();

          if (!acc.has(stationId)) {
            acc.set(stationId, { _id: stationId, data: [] });
          }

          const item = acc.get(stationId);
          if (item != null && item.data != null) {
            item.data.push({
              windAverage: d.windAverage,
              windBearing: d.windBearing
            });
          }

          return acc;
        }, new Map())
        .values()
    );

    type Group = {
      _id: string;
      data: Array<{ windAverage?: number | null; windBearing?: number | null }>;
      validBearings: string | null;
    };
    const data: Group[] = groups.map((g) => ({
      ...g,
      validBearings: stationMap.get(g._id)?.validBearings ?? null
    }));

    if (!data.length) {
      res.json({ time: new Date().toISOString(), values: [] });
      return;
    }

    const result = data.map((d) => {
      let count = 0;
      let sumAvg = 0;
      let sumBearingSin = 0;
      let sumBearingCos = 0;

      for (const d1 of d.data) {
        if (d1.windAverage != null && d1.windBearing != null) {
          count++;
          sumAvg += d1.windAverage;
          sumBearingSin += Math.sin((d1.windBearing * Math.PI) / 180);
          sumBearingCos += Math.cos((d1.windBearing * Math.PI) / 180);
        }
      }

      const bearing =
        count > 0 ? Math.round(Math.atan2(sumBearingSin, sumBearingCos) / (Math.PI / 180)) : null;

      return {
        id: d._id,
        windAverage: count > 0 ? Math.round(sumAvg / count) : null,
        windBearing: bearing == null ? null : bearing < 0 ? bearing + 360 : bearing,
        validBearings: d.validBearings
      };
    });

    res.json({ time: new Date().toISOString(), values: result });
  }
);

// get station
router.get('/:id', async (req: Request<IdParams>, res: Response) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.sendStatus(404);
    return;
  }

  const s = await Station.findOne({ _id: new ObjectId(id) }).lean();
  if (!s) {
    res.sendStatus(404);
    return;
  }

  res.json(s);
});

// patch station
router.patch(
  '/:id',
  async (req: Request<IdParams, unknown, PatchStationBody, ApiKeyQuery>, res: Response) => {
    const { id } = req.params;

    const user = await User.findOne({ key: req.query.key }).lean();
    if (!user) {
      res.sendStatus(401);
      return;
    }

    try {
      const station = await Station.findOne({ _id: new ObjectId(id) });
      if (!station) {
        res.sendStatus(404);
        return;
      }

      const { patch, remove } = req.body;

      for (const key of Object.keys(patch)) {
        station.set(key, patch[key]);
      }
      for (const key of Object.keys(remove)) {
        station.set(key, undefined);
      }

      await station.save();
      res.json(station);
    } catch {
      res.status(400).send();
    }
  }
);

// get station data
router.get(
  '/:id/data',
  async (req: Request<IdParams, unknown, unknown, StationIdDataQuery>, res: Response) => {
    const { id } = req.params;
    const hr = String(req.query.hr).toLowerCase() === 'true';

    if (!ObjectId.isValid(id)) {
      res.sendStatus(404);
      return;
    }

    const result = await StationData.find({ station: id })
      .sort({ time: -1 })
      .limit(hr ? 725 : 145)
      .lean();

    if (!result.length) {
      res.json([]);
      return;
    }

    res.json(
      result.map((r) => ({
        time: r.time,
        windAverage: r.windAverage,
        windGust: r.windGust,
        windBearing: r.windBearing,
        temperature: r.temperature,
        _id: r.station
      }))
    );
  }
);

export default router;
