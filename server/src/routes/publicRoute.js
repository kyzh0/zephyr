import express from 'express';
import * as fns from 'date-fns';

import { Client } from '../models/clientModel.js';
import { Station } from '../models/stationModel.js';

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

  const date = new Date();
  const currentMonth = fns.format(date, 'yyyy-MM');
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
      console.error('No stations found.');
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
  } catch (e) {
    console.error(e);
  }

  res.json(geoJson);
});

export default router;
