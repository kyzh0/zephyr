import { parentPort, workerData } from 'worker_threads';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import * as geofire from 'geofire-common';

import logger from '../lib/logger.js';
import { Output } from '../models/outputModel.js';
import * as XLSX from 'xlsx';
import fs1 from 'fs';
XLSX.set_fs(fs1);

async function exportData(unixFrom, unixTo, lat, lon, radius) {
  const ts = Date.now();

  try {
    await mongoose.connect(process.env.DB_CONNECTION_STRING);
  } catch {
    logger.error('DB connection failed', { service: 'public' });
  }

  let dateFrom = null;
  let dateTo = new Date();
  if (unixFrom && !isNaN(unixFrom)) {
    dateFrom = new Date(unixFrom * 1000);
  }
  if (unixTo && !isNaN(unixTo)) {
    dateTo = new Date(unixTo * 1000);
  }
  // limit 30 days
  const ms30Days = 30 * 24 * 60 * 60 * 1000;
  if (dateFrom == null || dateTo.getTime() - dateFrom.getTime() > ms30Days) {
    dateFrom = new Date(dateTo.getTime() - ms30Days);
  }

  const output = await Output.find({
    time: { $gte: dateFrom.getTime(), $lte: dateTo.getTime() }
  }).sort({ time: 1 });

  // read from json files
  const data = {};
  const stationNames = {};
  const stationHiRes = {};
  for (const o of output) {
    const i = o.url.indexOf('data/');
    if (i < 0) {
      continue;
    }
    try {
      const fileData = await fs.readFile(`public/${o.url.slice(i)}`, 'utf8');
      const json = JSON.parse(fileData);
      for (const line of json) {
        // filter radius
        const distance =
          Math.round(
            geofire.distanceBetween([line.coordinates.lat, line.coordinates.lon], [lat, lon]) * 10
          ) / 10;
        if (distance > radius) {
          continue;
        }

        const d = {
          timeUtc: new Date(line.timestamp * 1000).toISOString(),
          windAvgKmh: line.wind.average,
          windGustKmh: line.wind.gust,
          windBearingDeg: line.wind.bearing,
          temperatureC: line.temperature
        };
        if (data[line.id] == null) {
          data[line.id] = [d];
        } else {
          data[line.id].push(d);
        }

        if (stationNames[line.id] == null) {
          stationNames[line.id] = line.name;
        }
        if (stationHiRes[line.id] == null) {
          stationHiRes[line.id] = o.isHighResolution ? true : false;
        }
      }
    } catch (error) {
      logger.warn(`JSON file not found - ${o.url}`, { service: 'public' });
    }
  }

  try {
    // sort by station name
    const sortedKeys = Object.keys(data).sort((a, b) =>
      stationNames[a].localeCompare(stationNames[b])
    );

    // write xlsx
    const wsNames = [];
    const wb = XLSX.utils.book_new();
    for (const key of sortedKeys) {
      const readings = data[key];
      readings.sort((a, b) => new Date(a.timeUtc).getTime() - new Date(b.timeUtc).getTime());

      // filler rows for missing json files
      if (readings.length > 1) {
        let fillerData = [];
        const interval = stationHiRes[key] ? 120 : 600; // s
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
          // append filler and resort
          readings.push(...fillerData);
          readings.sort((a, b) => new Date(a.timeUtc).getTime() - new Date(b.timeUtc).getTime());
        }
      }

      const ws = XLSX.utils.json_to_sheet(readings);
      let name = stationNames[key];
      while (wsNames.includes(name)) {
        name += '_';
      }
      wsNames.push(name);
      XLSX.utils.book_append_sheet(wb, ws, name);
    }

    // no results
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

    return `${process.env.FILE_SERVER_PREFIX}/${filePath.replace('public/', '')}`;
  } catch (error) {
    logger.error('Failed to save XLSX', { service: 'public' });
    logger.error(error);
    return null;
  }
}

(async () => {
  const result = await exportData(
    workerData.unixFrom,
    workerData.unixTo,
    workerData.lat,
    workerData.lon,
    workerData.radius
  );
  parentPort.postMessage(result);
})();
