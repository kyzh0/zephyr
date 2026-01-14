import express, { type Request, type Response } from 'express';
import { formatInTimeZone } from 'date-fns-tz';
import { Worker } from 'node:worker_threads';
import { QueryFilter } from 'mongoose';

import { Output, OutputAttrs, Station, Client, logger } from '@zephyr/shared';

const router = express.Router();

type ApiKeyQuery = {
  key?: string;
};

type GeoJson = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: Record<string, unknown>;
    geometry: unknown;
  }>;
};

type JsonOutputQuery = ApiKeyQuery & {
  dateFrom?: string;
  dateTo?: string;
  hr?: string;
};

type JsonOutputItem = {
  time: number; // unix seconds
  url: string;
};

type ExportXlsxBody = {
  unixFrom: number | string;
  unixTo: number | string;
  lat: number | string;
  lon: number | string;
  radius?: number | string;
};

type AuthOk = { success: true };
type AuthFail = { success: false; httpCode: number; error: string };
type AuthResult = AuthOk | AuthFail;

function parseDateInput(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const num = Number(value);
  if (!Number.isNaN(num)) {
    // treat as unix seconds if numeric
    return new Date(num * 1000);
  }

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function authenticateApiKey(key: string | undefined): Promise<AuthResult> {
  if (!key) {
    logger.info('No API key provided...');
    return { success: false, httpCode: 401, error: 'API key is required.' };
  }

  const client = await Client.findOne({ apiKey: key }).lean();
  if (!client) {
    logger.info('Invalid API key...');
    return { success: false, httpCode: 401, error: 'Invalid API key.' };
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
      { _id: client._id, __v: client.__v, 'usage.month': currentMonth },
      { $inc: { 'usage.$.apiCalls': 1, __v: 1 } }
    );
  } else {
    await Client.updateOne(
      { _id: client._id, __v: client.__v },
      {
        $push: {
          usage: {
            month: currentMonth,
            apiCalls: 1
          }
        },
        $inc: { __v: 1 }
      }
    );
  }

  return { success: true };
}

function runExportDataWorker(
  unixFrom: number,
  unixTo: number,
  lat: number,
  lon: number,
  radius: number
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    // keep .js here because workers run from built JS in dist/
    const workerUrl = new URL('./workers/exportDataWorker.js', import.meta.url);

    const worker = new Worker(workerUrl, {
      workerData: { unixFrom, unixTo, lat, lon, radius }
    });

    worker.on('message', (msg) => resolve(String(msg)));
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

router.get(
  '/geojson',
  async (req: Request<Record<string, never>, unknown, unknown, ApiKeyQuery>, res: Response) => {
    logger.info('GeoJSON requested', { service: 'public' });

    const geoJson: GeoJson = { type: 'FeatureCollection', features: [] };

    try {
      const auth = await authenticateApiKey(req.query.key);
      if (!auth.success) {
        res.status(auth.httpCode).json({ error: auth.error });
        return;
      }

      const stations = await Station.find({ isDisabled: { $ne: true } })
        .sort({ type: 1, name: 1 })
        .lean();

      if (!stations.length) {
        logger.error('No stations found.', { service: 'public' });
        res.status(500).json({ error: 'No stations found. Please contact the Zephyr admin.' });
        return;
      }

      for (const s of stations) {
        geoJson.features.push({
          type: 'Feature',
          properties: {
            id: s._id,
            name: s.name,
            type: s.type,
            elevation: s.elevation,
            link: s.externalLink,
            lastUpdateUnix: Math.round(new Date(s.lastUpdate).getTime() / 1000),
            currentAverage: s.currentAverage == null ? null : Math.round(s.currentAverage),
            currentGust: s.currentGust == null ? null : Math.round(s.currentGust),
            currentBearing: s.currentBearing == null ? null : Math.round(s.currentBearing),
            currentTemperature:
              s.currentTemperature == null ? null : Math.round(s.currentTemperature)
          },
          geometry: s.location
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(msg, { service: 'public' });
    }

    res.json(geoJson);
  }
);

router.get(
  '/json-output',
  async (
    req: Request<Record<string, never>, unknown, unknown, JsonOutputQuery>,
    res: Response<JsonOutputItem[]>
  ) => {
    logger.info('JSON output requested', { service: 'public' });

    const result: JsonOutputItem[] = [];

    try {
      const auth = await authenticateApiKey(req.query.key);
      if (!auth.success) {
        res.status(auth.httpCode).json([{ time: 0, url: '' }].slice(0, 0)); // empty array typed
        // return a consistent error payload like your original:
        res.status(auth.httpCode).json([] as JsonOutputItem[]);
        return;
      }

      let dateFrom = parseDateInput(req.query.dateFrom);
      let dateTo = parseDateInput(req.query.dateTo);

      // limit 30 days
      const ms30Days = 30 * 24 * 60 * 60 * 1000;

      if (dateFrom && dateTo) {
        if (dateTo.getTime() - dateFrom.getTime() > ms30Days) {
          dateFrom = new Date(dateTo.getTime() - ms30Days);
        }
      } else if (dateFrom) {
        dateTo = new Date(dateFrom.getTime() + ms30Days);
      } else if (dateTo) {
        dateFrom = new Date(dateTo.getTime() - ms30Days);
      } else {
        dateTo = new Date();
        dateFrom = new Date(dateTo.getTime() - ms30Days);
      }

      const query: QueryFilter<OutputAttrs> = {};
      if (dateFrom) {
        query.time = { $gte: dateFrom };
      }
      if (dateTo) {
        if (dateFrom) {
          query.time = { $gte: dateFrom, $lte: dateTo };
        } else {
          query.time = { $lte: dateTo };
        }
      }
      query.isHighResolution = (req.query.hr ?? '').toLowerCase() === 'true' ? true : { $ne: true };

      const output = await Output.find(query).sort({ time: 1 }).lean();
      for (const o of output) {
        result.push({
          time: new Date(o.time).getTime() / 1000,
          url: o.url
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(msg, { service: 'public' });
    }

    res.json(result);
  }
);

router.post(
  '/export-xlsx',
  async (
    req: Request<Record<string, never>, unknown, ExportXlsxBody, ApiKeyQuery>,
    res: Response
  ) => {
    logger.info('XLSX export requested', { service: 'public' });

    const unixFrom = Number(req.body.unixFrom);
    const unixTo = Number(req.body.unixTo);
    const lat = Number(req.body.lat);
    const lon = Number(req.body.lon);
    let radius = Number(req.body.radius);

    if (Number.isNaN(radius) || radius < 10 || radius > 100) {
      radius = 50;
    }

    if (
      Number.isNaN(lat) ||
      Number.isNaN(lon) ||
      lon < -180 ||
      lon > 180 ||
      lat < -90 ||
      lat > 90
    ) {
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
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(msg, { service: 'public' });
      res.status(500).json({ error: 'Something went wrong...' });
    }
  }
);

export default router;
