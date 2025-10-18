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
    await mongoose.connect(
      process.env.NODE_ENV === 'production'
        ? process.env.DB_CONNECTION_STRING
        : process.env.DEV_CONNECTION_STRING
    );

    let dateFrom = null;
    let dateTo = new Date();
    if (unixFrom && !isNaN(unixFrom)) {
      dateFrom = new Date(unixFrom * 1000);
    }
    if (unixFrom && !isNaN(unixTo)) {
      dateTo = new Date(unixTo * 1000);
    }
    // limit 6 months data
    const ms180Days = 180 * 24 * 60 * 60 * 1000;
    if (dateFrom == null || dateTo.getTime() - dateFrom.getTime() > ms180Days) {
      dateFrom = new Date(dateTo.getTime() - ms180Days);
    }

    const output = await Output.find({
      time: { $gte: dateFrom.getTime(), $lte: dateTo.getTime() }
    }).sort({ time: 1 });

    // read from json files
    const data = {};
    const stationNames = {};
    for (const o of output) {
      const i = o.url.indexOf('/data');
      if (i < 0) continue;
      const fileData = await fs.readFile(`public/${o.url.slice(i)}`, 'utf8');
      const json = JSON.parse(fileData);
      for (const line of json) {
        // filter radius
        const distance =
          Math.round(
            geofire.distanceBetween([line.coordinates.lat, line.coordinates.lon], [lat, lon]) * 10
          ) / 10;
        if (distance > radius) continue;

        const d = {
          timeUtc: new Date(line.timestamp * 1000).toISOString(),
          windAvgKmh: line.wind.average,
          windGustKmh: line.wind.gust,
          windBearingDeg: line.wind.bearing,
          temperatureC: line.temperature
        };
        if (data[line.id] == null) data[line.id] = [d];
        else data[line.id].push(d);

        if (stationNames[line.id] == null) stationNames[line.id] = line.name;
      }
    }

    // write xlsx
    const wb = XLSX.utils.book_new();
    for (const key of Object.keys(data)) {
      const readings = data[key];
      readings.sort((a, b) => {
        return new Date(a.timeUTC).getTime() - new Date(b.timeUTC).getTime();
      });

      const ws = XLSX.utils.json_to_sheet(readings);
      XLSX.utils.book_append_sheet(wb, ws, stationNames[key]);
    }

    const dir = 'public/export';
    await fs.mkdir(dir, { recursive: true });
    const fileName = `zephyr-data-${Math.floor(Date.now() / 1000)}.xlsx`;
    const filePath = `${dir}/${fileName}`;
    XLSX.writeFile(wb, filePath);
    logger.info(`CSV generated, ${Date.now() - ts}ms elapsed - ${fileName}`);

    const urlPrefix =
      process.env.NODE_ENV === 'production' ? 'https://fs.zephyrapp.nz/' : 'http://localhost:5000/';
    return `${urlPrefix}${filePath}`;
  } catch (error) {
    logger.error(error, { service: 'public' });
  }
  return null;
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
