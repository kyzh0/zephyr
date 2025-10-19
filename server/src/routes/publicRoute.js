import express from 'express';
import { formatInTimeZone } from 'date-fns-tz';
import { Worker } from 'worker_threads';

import logger from '../lib/logger.js';
import { Client } from '../models/clientModel.js';
import { Station } from '../models/stationModel.js';
import { Output } from '../models/outputModel.js';

import * as XLSX from 'xlsx';
import fs1 from 'fs';
XLSX.set_fs(fs1);

import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  const matches = client.usage.filter((c) => c.month === currentMonth);
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

    const stations = await Station.find({ isDisabled: { $ne: true } }, { data: 0 }).sort({
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
          elevation: s.elevation,
          link: s.externalLink,
          lastUpdateUnix: Math.round(s.lastUpdate.getTime() / 1000),
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

    // limit 6 months data
    const ms180Days = 180 * 24 * 60 * 60 * 1000;
    if (dateFrom != null && dateTo != null) {
      if (dateTo.getTime() - dateFrom.getTime() > ms180Days) {
        dateFrom = new Date(dateTo.getTime() - ms180Days);
      }
    } else if (dateFrom != null) {
      dateTo = new Date(dateFrom.getTime() + ms180Days);
    } else if (dateTo != null) {
      dateFrom = new Date(dateTo.getTime() - ms180Days);
    } else {
      dateTo = new Date();
      dateFrom = new Date(dateTo.getTime() - ms180Days);
    }

    const query = {};
    if (dateFrom != null) {
      query.time = { $gte: dateFrom.getTime() };
    }
    if (dateTo != null) {
      if (query.time) {
        query.time.$lte = dateTo.getTime();
      } else {
        query.time = { $lte: dateTo.getTime() };
      }
    }

    if (String(req.query.hr).toLowerCase() !== 'true') {
      query.isHighResolution = { $ne: true };
    } else {
      query.isHighResolution = true;
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

router.get('/xlsx', async (req, res) => {
  logger.info('XLSX export requested', { service: 'public' });

  const unixFrom = Number(req.query.unixFrom);
  const unixTo = Number(req.query.unixTo);
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  let radius = Number(req.query.radius);
  if (isNaN(radius) || radius < 10 || radius > 100) {
    radius = 10;
  }

  if (isNaN(lat) || isNaN(lon) || lon < -180 || lon > 180 || lat < -90 || lat > 90) {
    res.status(400).json({ error: 'Invalid lat/lon' });
    return;
  }

  try {
    const auth = await authenticateApiKey(req.query.key);
    if (!auth.success) {
      res.status(auth.httpCode).json({ error: auth.error });
      return;
    }

    const url = await runExportDataWorker(unixFrom, unixTo, lat, lon, radius);
    res.json({ url });
  } catch (error) {
    logger.error(error, { service: 'public' });
    res.status(500).json({ error: 'Something went wrong...' });
  }
});

function runExportDataWorker(unixFrom, unixTo, lat, lon, radius) {
  return new Promise((resolve, reject) => {
    const workerPath = path.resolve(__dirname, '../workers/exportDataWorker.js');
    const worker = new Worker(pathToFileURL(workerPath), {
      workerData: {
        unixFrom,
        unixTo,
        lat,
        lon,
        radius
      }
    });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

export default router;
