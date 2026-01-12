import { parentPort, workerData } from 'node:worker_threads';
import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import * as geofire from 'geofire-common';

import logger from '@/lib/logger';
import { Output } from '@/models/outputModel';

import * as XLSX from 'xlsx';
import fs1 from 'fs';
XLSX.set_fs(fs1);

type ExportWorkerData = {
  unixFrom?: number;
  unixTo?: number;
  lat: number;
  lon: number;
  radius: number;
};

type JsonLine = {
  id: string;
  name: string;
  timestamp: number; // unix seconds
  coordinates: { lat: number; lon: number };
  wind: { average: number | null; gust: number | null; bearing: number | null };
  temperature: number | null;
};

type Reading = {
  timeUtc: string;
  windAvgKmh: number | null;
  windGustKmh: number | null;
  windBearingDeg: number | null;
  temperatureC: number | null;
};

async function exportData(
  unixFrom: number | undefined,
  unixTo: number | undefined,
  lat: number,
  lon: number,
  radius: number
): Promise<string | null> {
  const ts = Date.now();

  const { DB_CONNECTION_STRING, FILE_SERVER_PREFIX } = process.env;

  if (!DB_CONNECTION_STRING) {
    logger.error('DB_CONNECTION_STRING is not set', { service: 'public' });
    return null;
  }

  try {
    await mongoose.connect(DB_CONNECTION_STRING);
  } catch {
    logger.error('DB connection failed', { service: 'public' });
    return null;
  }

  let dateFrom: Date | null = null;
  let dateTo: Date = new Date();

  if (unixFrom != null && Number.isFinite(unixFrom)) dateFrom = new Date(unixFrom * 1000);
  if (unixTo != null && Number.isFinite(unixTo)) dateTo = new Date(unixTo * 1000);

  // limit 30 days
  const ms30Days = 30 * 24 * 60 * 60 * 1000;
  if (dateFrom == null || dateTo.getTime() - dateFrom.getTime() > ms30Days) {
    dateFrom = new Date(dateTo.getTime() - ms30Days);
  }

  const output = await Output.find({
    time: { $gte: dateFrom.getTime(), $lte: dateTo.getTime() }
  })
    .sort({ time: 1 })
    .lean();

  const data: Record<string, Reading[]> = {};
  const stationNames: Record<string, string> = {};
  const stationHiRes: Record<string, boolean> = {};

  for (const o of output) {
    const i = String(o.url).indexOf('data/');
    if (i < 0) continue;

    try {
      const fileData = await fs.readFile(`public/${String(o.url).slice(i)}`, 'utf8');
      const json = JSON.parse(fileData) as JsonLine[];

      for (const line of json) {
        // filter radius
        const distance =
          Math.round(
            geofire.distanceBetween([line.coordinates.lat, line.coordinates.lon], [lat, lon]) * 10
          ) / 10;

        if (distance > radius) continue;

        const d: Reading = {
          timeUtc: new Date(line.timestamp * 1000).toISOString(),
          windAvgKmh: line.wind.average,
          windGustKmh: line.wind.gust,
          windBearingDeg: line.wind.bearing,
          temperatureC: line.temperature
        };

        (data[line.id] ??= []).push(d);

        stationNames[line.id] ??= line.name;
        stationHiRes[line.id] ??= o.isHighResolution ? true : false;
      }
    } catch {
      logger.warn(`JSON file not found - ${String(o.url)}`, { service: 'public' });
    }
  }

  try {
    const sortedKeys = Object.keys(data).sort((a, b) =>
      (stationNames[a] ?? a).localeCompare(stationNames[b] ?? b)
    );

    const wsNames: string[] = [];
    const wb = XLSX.utils.book_new();

    for (const key of sortedKeys) {
      const readings = data[key];

      readings.sort((a, b) => new Date(a.timeUtc).getTime() - new Date(b.timeUtc).getTime());

      // filler rows for missing json files
      if (readings.length > 1) {
        const fillerData: Reading[] = [];
        const interval = stationHiRes[key] ? 120 : 600; // seconds

        for (let i = 1; i < readings.length; i++) {
          const unixB = Math.floor(new Date(readings[i].timeUtc).getTime() / 1000);
          const unixA = Math.floor(new Date(readings[i - 1].timeUtc).getTime() / 1000);

          if (unixB - unixA > interval) {
            for (let t = unixA + interval; t < unixB; t += interval) {
              fillerData.push({
                timeUtc: new Date(t * 1000).toISOString(),
                windAvgKmh: null,
                windGustKmh: null,
                windBearingDeg: null,
                temperatureC: null
              });
            }
          }
        }

        if (fillerData.length) {
          readings.push(...fillerData);
          readings.sort((a, b) => new Date(a.timeUtc).getTime() - new Date(b.timeUtc).getTime());
        }
      }

      const ws = XLSX.utils.json_to_sheet(readings);
      let name = stationNames[key] ?? key;
      while (wsNames.includes(name)) name += '_';

      wsNames.push(name);
      XLSX.utils.book_append_sheet(wb, ws, name);
    }

    if (!Object.keys(data).length) {
      XLSX.utils.book_append_sheet(wb, {}, 'NO RESULTS');
    }

    const dir = 'public/export';
    await fs.mkdir(dir, { recursive: true });

    const fileName = `zephyr-data-${Math.floor(Date.now() / 1000)}.xlsx`;
    const filePath = `${dir}/${fileName}`;
    XLSX.writeFile(wb, filePath);

    logger.info(`XLSX generated, ${Date.now() - ts}ms elapsed - ${fileName}`, {
      service: 'public'
    });

    if (!FILE_SERVER_PREFIX) {
      logger.error('FILE_SERVER_PREFIX is not set', { service: 'public' });
      return null;
    }

    return `${FILE_SERVER_PREFIX}/${filePath.replace('public/', '')}`;
  } catch (error) {
    logger.error('Failed to save XLSX', { service: 'public' });

    const msg = error instanceof Error ? error.message : String(error);
    logger.error(msg, { service: 'public' });
    return null;
  }
}

(async () => {
  const wd = workerData as ExportWorkerData;
  const result = await exportData(wd.unixFrom, wd.unixTo, wd.lat, wd.lon, wd.radius);
  parentPort?.postMessage(result);
})();
