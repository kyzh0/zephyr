import express from 'express';
import { formatInTimeZone } from 'date-fns-tz';

import logger from '../helpers/log.js';

import { Client } from '../models/clientModel.js';
import { Station } from '../models/stationModel.js';
import { Output } from '../models/outputModel.js';

const router = express.Router();

async function authenticateApiKey(apiKey) {
  if (!apiKey) {
    return {
      success: false,
      httpCode: 401,
      error: 'API key is required.'
    };
  }
  const client = await Client.findOne({ apiKey: apiKey });
  if (!client) {
    return {
      success: false,
      httpCode: 401,
      error: 'Invalid API key.'
    };
  }
  logger.info(`... by ${client.name}`, { service: 'public' });

  const date = new Date();
  const currentMonth = formatInTimeZone(date, 'UTC', 'yyyy-MM');
  const matches = client.usage.filter((c) => {
    return c.month === currentMonth;
  });
  if (matches.length) {
    const usage = matches[0];
    if (usage.apiCalls >= client.monthlyLimit) {
      return {
        success: false,
        httpCode: 403,
        error: `Monthly limit of ${client.monthlyLimit} API calls exceeded.`
      };
    }

    await Client.updateOne(
      { _id: client._id, 'usage.month': currentMonth },
      {
        $inc: { 'usage.$.apiCalls': 1 }
      }
    );
  } else {
    await Client.updateOne(
      { _id: client._id },
      {
        $push: {
          usage: {
            month: currentMonth,
            apiCalls: 1
          }
        }
      }
    );
  }

  return { success: true };
}

router.get('/geojson', async (req, res) => {
  logger.info('GeoJSON requested', { service: 'public' });

  const geoJson = {
    type: 'FeatureCollection',
    features: []
  };

  try {
    const auth = await authenticateApiKey(req.query.key);
    if (!auth.success) {
      res.status(auth.httpCode).json({ error: auth.error });
      return;
    }

    const stations = await Station.find({ type: { $ne: 'metservice' } }, { data: 0 }).sort({
      type: 1,
      name: 1
    });
    if (!stations.length) {
      logger.error('No stations found.', { service: 'public' });
      res.status(500).json({ error: 'No stations found. Please contact the Zephyr admin.' });
      return;
    }

    for (const s of stations) {
      const feature = {
        type: 'Feature',
        properties: {
          id: s._id,
          name: s.name,
          type: s.type,
          link: s.externalLink,
          lastUpdateUnix: s.lastUpdate._seconds,
          currentAverage: s.currentAverage == null ? null : Math.round(s.currentAverage),
          currentGust: s.currentGust == null ? null : Math.round(s.currentGust),
          currentBearing: s.currentBearing == null ? null : Math.round(s.currentBearing),
          currentTemperature: s.currentTemperature == null ? null : Math.round(s.currentTemperature)
        },
        geometry: s.location
      };
      geoJson.features.push(feature);
    }
  } catch (error) {
    logger.error(error, { service: 'public' });
  }

  res.json(geoJson);
});

router.get('/json-output', async (req, res) => {
  logger.info('JSON output requested', { service: 'public' });

  const result = [];

  try {
    const auth = await authenticateApiKey(req.query.key);
    if (!auth.success) {
      res.status(auth.httpCode).json({ error: auth.error });
      return;
    }

    let dateFrom = null;
    let dateTo = null;
    if (req.query.dateFrom) {
      const temp = Number(req.query.dateFrom);
      if (!isNaN(temp)) {
        dateFrom = new Date(temp * 1000);
      } else {
        dateFrom = new Date(req.query.dateFrom);
      }
    }
    if (req.query.dateTo) {
      const temp = Number(req.query.dateTo);
      if (!isNaN(temp)) {
        dateTo = new Date(temp * 1000);
      } else {
        dateTo = new Date(req.query.dateTo);
      }
    }

    const query = {};
    if (dateFrom != null && !isNaN(dateFrom)) query.time = { $gte: dateFrom };
    if (dateTo != null && !isNaN(dateTo)) {
      if (query.time) query.time.$lte = dateTo;
      else query.time = { $lte: dateTo };
    }

    const output = await Output.find(query).sort({ time: 1 });
    for (const o of output) {
      result.push({
        time: new Date(o.time).getTime() / 1000,
        url: o.url
      });
    }
  } catch (error) {
    logger.error(error, { service: 'public' });
  }

  res.json(result);
});
export default router;
